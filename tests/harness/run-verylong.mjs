// Very long script: ~40k chars, dozens of segments, heavy eviction.
// Verifies the whole lifecycle: streamed generation, consistent timeline, queue
// completion, restart, and download packing (which must re-synthesize evicted parts).
import { createRequire } from 'node:module';
import { start, stats } from './mock-tts-server.mjs';
const requireFrom = createRequire('Z:/code/vibe code/3d world i can roam through on a web app/x.js');
const { chromium } = requireFrom('playwright');

const PORT = 8894;
const sentence = 'The lighthouse keeper counted every wave that broke against the rocks below his window, and in the counting he found a rhythm that matched the beating of his own tired heart. ';
const paragraph = sentence + 'He wrote each measurement into a ledger bound in green cloth, pressing the pencil hard enough to leave a mark on the page beneath. ';
const text = paragraph.repeat(135); // ~40k chars

stats.junk = 0;
stats.fail = () => false;
stats.delay = (i) => (i % 7 === 3 ? 900 : 50);

const failures = [];
const check = (name, pass, detail) => {
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : ''));
  if (!pass) failures.push(name);
};

await start(PORT);
const browser = await chromium.launch({ headless: true, executablePath: 'A:/Caches/ms-playwright/chromium-1228/chrome-win64/chrome.exe', args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const ctx = await browser.newContext({ serviceWorkers: 'block' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.route('**/*', (r) => (r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort()));
await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__VOX_STATE);
await page.evaluate((t) => {
  window.__VOX_STATE.speed = 8;
  const ta = document.getElementById('text-input');
  ta.value = t;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}, text);

const snap = () => page.evaluate(() => {
  const s = window.__VOX_STATE, q = s.playbackQueue || {}, a = s.audioElement;
  return {
    total: q.totalExpected, done: q.completedChunksCount, idx: q.currentIndex, waiting: q.waitingForChunk,
    paused: a.paused, ct: Math.round((a.currentTime || 0) * 100) / 100, cont: Math.round((s.continuousDuration || 0) * 100) / 100,
    master: !!s.continuousMasterUrl, deferred: !!s.masterDeferred, finished: !!q.finished,
    evicted: (q.chunks || []).filter((c) => c && c.evicted).length,
    label: document.getElementById('label-generate').textContent,
    progress: document.getElementById('gen-progress__count').textContent,
    stage: document.getElementById('gen-progress__stage').textContent,
    time: document.getElementById('player-time-display').textContent,
    status: document.getElementById('interactive-status-label').textContent
  };
});

console.log('chars:', text.length);
await page.click('#btn-main-generate');

const t0 = Date.now();
await page.waitForFunction(() => {
  const q = window.__VOX_STATE.playbackQueue;
  return q && q.completedChunksCount >= q.totalExpected;
}, null, { timeout: 180000 });
const genSt = await snap();
check('40k-char script fully synthesized', genSt.done === genSt.total, `${genSt.done}/${genSt.total} in ${((Date.now() - t0) / 1000).toFixed(1)}s, cont=${genSt.cont}s`);
check('finalize leaves the UI idle', genSt.label === 'Generate Speech' && genSt.progress === genSt.total + ' / ' + genSt.total,
  `label="${genSt.label}" progress="${genSt.progress}"`);
// Either the merge was deferred (eviction already happened) or the master is
// complete — never a partial master that silently drops audio.
const genMasterDur = await page.evaluate(async () => {
  const s = window.__VOX_STATE;
  if (!s.continuousMasterBlob) return null;
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const d = (await c.decodeAudioData(await s.continuousMasterBlob.arrayBuffer())).duration;
    c.close();
    return d;
  } catch (_) { return -1; }
});
check('master is either deferred or complete', genSt.deferred === true || (genMasterDur && Math.abs(genMasterDur - genSt.cont) < 1),
  `deferred=${genSt.deferred} masterDur=${genMasterDur && genMasterDur.toFixed(2)} cont=${genSt.cont} evicted=${genSt.evicted}`);

// playback must walk every segment and finish, no wedge
const endDeadline = Date.now() + 180000;
let st = genSt;
while (Date.now() < endDeadline && !st.finished) {
  await page.waitForTimeout(500);
  st = await snap();
}
check('streamed playback reaches the end', st.finished === true, `idx=${st.idx}/${st.total} finished=${st.finished}`);

// time display should agree with the real timeline at the end
const shown = (st.time.split('/')[1] || '').trim();
const secs = shown.split(':').reduce((acc, v) => acc * 60 + Number(v || 0), 0);
check('player total matches the synthesized timeline', Math.abs(secs - st.cont) <= 1.5, `display="${st.time}" cont=${st.cont}s`);

// restart after completion
await page.evaluate(() => document.getElementById('dock-btn-play').click());
let restarted = await snap();
const rdl = Date.now() + 20000;
while (Date.now() < rdl && !(!restarted.paused && restarted.ct > 0)) {
  await page.waitForTimeout(250);
  restarted = await snap();
}
check('play after the end restarts the script', !restarted.paused && restarted.ct > 0, `paused=${restarted.paused} ct=${restarted.ct}`);

// download must pack every segment, including the evicted ones
await page.evaluate(() => { window.__VOX_STATE.audioElement.pause(); });
await page.evaluate(() => document.getElementById('btn-dock-download').click());
await page.waitForFunction(() => {
  const s = window.__VOX_STATE;
  return s.continuousMasterBlob && s.continuousMasterBlob.size > 0;
}, null, { timeout: 120000 });
const packed = await page.evaluate(async () => {
  const s = window.__VOX_STATE;
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const d = (await c.decodeAudioData(await s.continuousMasterBlob.arrayBuffer())).duration;
    c.close();
    return { dur: d, bytes: s.continuousMasterBlob.size };
  } catch (e) { return { err: e.name }; }
});
check('download packs the entire script', packed.dur && Math.abs(packed.dur - genSt.cont) < 1,
  `packedDur=${packed.dur && packed.dur.toFixed(2)} expected=${genSt.cont} bytes=${packed.bytes} ${packed.err || ''}`);

await browser.close();
console.log('\n' + (failures.length ? failures.length + ' FAILED: ' + failures.join(', ') : 'ALL LONG-RUN CHECKS PASS'));
process.exit(failures.length ? 1 : 0);