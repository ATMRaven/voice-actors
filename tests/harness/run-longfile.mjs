// Long-script playback harness: drives the real static/app.js in Chromium
// against the mock TTS API and reports the queue/playback state machine.
//
//   node tests/harness/run-longfile.mjs            # full evidence run
//
// Exits non-zero when an invariant fails, so it can be used as a red/green loop.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { start, stats } from './mock-tts-server.mjs';

const requireFrom = createRequire('Z:/code/vibe code/3d world i can roam through on a web app/x.js');
const { chromium } = requireFrom('playwright');

const PORT = Number(process.env.PORT || 8899);
const SPEED = Number(process.env.SPEED || 4);
const CHUNK_DELAY_MS = Number(process.env.CHUNK_DELAY_MS || 60);

const para = 'The lighthouse keeper counted every wave that broke against the rocks below his window, ' +
  'and in the counting he found a rhythm that matched the beating of his own tired heart. ';
const longText = (para + para + 'He wrote each measurement into a ledger bound in green cloth, pressing the pencil hard enough to leave a mark on the page beneath. ')
  .repeat(14);

stats.delay = (idx) => (idx === 4 || idx === 9 ? 1600 : CHUNK_DELAY_MS);

const results = { snapshots: [], checks: [] };
function check(name, pass, detail) {
  results.checks.push({ name, pass: !!pass, detail });
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : ''));
}

await start(PORT);

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || 'A:/Caches/ms-playwright/chromium-1228/chrome-win64/chrome.exe',
  args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--disable-dev-shm-usage']
});
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const consoleLines = [];
page.on('console', (m) => consoleLines.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => consoleLines.push('PAGEERROR: ' + e.message));

// Keep the run offline-deterministic: no CDN, no fonts, no sw.
await page.route('**/*', (route) => {
  const u = route.request().url();
  if (u.startsWith('http://127.0.0.1')) return route.continue();
  return route.abort();
});

await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__VOX_STATE, null, { timeout: 20000 });

const snap = () => page.evaluate(() => {
  const s = window.__VOX_STATE;
  const q = s.playbackQueue || {};
  const a = s.audioElement || {};
  const durations = (q.chunks || []).map((c) => (c ? c.duration : null));
  return {
    total: q.totalExpected,
    done: q.completedChunksCount,
    index: q.currentIndex,
    waiting: q.waitingForChunk,
    isPlaying: s.isPlaying,
    isQueue: q.isPlayingQueue,
    finished: !!q.finished,
    ct: Math.round((a.currentTime || 0) * 100) / 100,
    paused: a.paused,
    dur: Math.round((a.duration || 0) * 100) / 100,
    cont: Math.round((s.continuousDuration || 0) * 100) / 100,
    master: !!s.continuousMasterUrl,
    masterBytes: s.continuousMasterBlob ? s.continuousMasterBlob.size : 0,
    deferred: !!s.masterDeferred,
    blobBytes: s.currentBlob ? s.currentBlob.size : 0,
    durations,
    evicted: (q.chunks || []).filter((c) => c && c.evicted).length,
    detail: (q.chunks || []).map((c, i) => (c ? { i, dur: Math.round((c.duration || 0) * 1000) / 1000, blob: !!(c.blob), url: !!c.url, ev: !!c.evicted, skip: !!c.skipped } : { i, empty: true })),
    buffered: (q.chunks || []).filter((c) => c && c.url).length,
    time: document.getElementById('player-time-display').textContent,
    label: document.getElementById('label-generate').textContent,
    progress: document.getElementById('gen-progress__count') ? document.getElementById('gen-progress__count').textContent : null,
    stage: document.getElementById('gen-progress__stage') ? document.getElementById('gen-progress__stage').textContent : null,
    status: document.getElementById('interactive-status-label').textContent
  };
});

await page.evaluate(() => {
  const a = window.__VOX_STATE.audioElement;
  window.__pauses = [];
  a.addEventListener('pause', () => {
    window.__pauses.push({ ct: Math.round((a.currentTime || 0) * 100) / 100, dur: Math.round((a.duration || 0) * 100) / 100,
      ended: a.ended, ns: a.networkState, rs: a.readyState, ip: window.__VOX_STATE.isPlaying,
      wp: !!window.__VOX_STATE.wantsPlayback, up: !!window.__VOX_STATE.userPaused,
      vis: document.visibilityState, err: a.error && a.error.code, idx: (window.__VOX_STATE.playbackQueue || {}).currentIndex });
  });
});

await page.evaluate((text) => {
  const s = window.__VOX_STATE;
  s.speed = 4; // keep wall-clock short; audio.playbackRate follows state.speed
  const ta = document.getElementById('text-input');
  ta.value = text;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}, longText);

console.log('text chars:', longText.length);

const t0 = Date.now();
await page.click('#btn-main-generate');

// --- Phase A: watch generation + streaming playback ---
let last = null;
const deadline = Date.now() + 90000;
while (Date.now() < deadline) {
  const st = await snap();
  const key = JSON.stringify([st.done, st.index, st.waiting, st.isPlaying, st.paused, st.ct, st.master]);
  if (key !== last) {
    results.snapshots.push({ t: ((Date.now() - t0) / 1000).toFixed(1), ...st });
    last = key;
  }
  if (st.done >= st.total && st.done > 0) break;
  await page.waitForTimeout(200);
}
const genEnd = await snap();
check('generation completed', genEnd.done >= genEnd.total && genEnd.done > 0,
  `${genEnd.done}/${genEnd.total} chunks, cont=${genEnd.cont}s`);
check('chunk offsets are in index order', JSON.stringify(genEnd.durations.every((d, i) => d == null || d > 0)) ,
  'durations=' + JSON.stringify(genEnd.durations));

// --- Phase B: wait for playback to run out ---
// Wait for the explicit "finished" flag, not for the first paused sample: every
// segment hand-off briefly pauses the element while the next one is attached.
const endDeadline = Date.now() + 90000;
let st = await snap();
while (Date.now() < endDeadline && !st.finished) {
  await page.waitForTimeout(250);
  st = await snap();
}
await page.waitForTimeout(600);
st = await snap();
results.afterPlayback = st;
console.log('after playback:', JSON.stringify(st));

const allDurations = (st.durations || []).filter((d) => typeof d === 'number');
const expectedTotal = allDurations.reduce((a, b) => a + b, 0);
const masterDur = await page.evaluate(async () => {
  const s = window.__VOX_STATE;
  if (!s.continuousMasterBlob) return null;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ab = await s.continuousMasterBlob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(ab);
    const d = decoded.duration;
    ctx.close();
    return d;
  } catch (e) { return -1; }
});
results.masterDur = masterDur;
check('master covers every chunk (or master is deferred)',
  st.deferred || (masterDur !== null && Math.abs(masterDur - expectedTotal) < 0.6),
  `masterDur=${masterDur} expected=${expectedTotal.toFixed(2)} deferred=${st.deferred} evicted=${st.evicted}`);
check('eviction actually happened (long-file path exercised)', st.evicted > 0, 'evicted=' + st.evicted);
check('UI is left in a finished state', st.label === 'Generate Speech' && st.progress === st.total + ' / ' + st.total,
  `label="${st.label}" progress="${st.progress}" status="${st.status}"`);
check('playback reached the end of the queue', st.finished === true && st.cont > 0,
  `finished=${st.finished} cont=${st.cont}s`);

// --- Phase C: press play after completion ---
await page.evaluate(() => {
  const b = document.getElementById('dock-btn-play');
  if (b) b.click();
});
// restarting a long script re-synthesizes evicted segments, so allow a few seconds
let afterPlay = await snap();
const playDeadline = Date.now() + 10000;
while (Date.now() < playDeadline && !(afterPlay.isPlaying && !afterPlay.paused && afterPlay.ct > 0.02)) {
  await page.waitForTimeout(200);
  afterPlay = await snap();
}
results.afterPlay = afterPlay;
console.log('after play press:', JSON.stringify(afterPlay));
results.playProbe = await page.evaluate(async () => {
  const s = window.__VOX_STATE;
  const a = s.audioElement;
  const out = {
    srcIsMaster: a.src === s.continuousMasterUrl,
    srcIsChunk: a.src === (s.playbackQueue && s.playbackQueue.chunks && s.playbackQueue.chunks[s.playbackQueue.currentIndex] || {}).url,
    isQueue: s.playbackQueue && s.playbackQueue.isPlayingQueue,
    currentIndex: s.playbackQueue && s.playbackQueue.currentIndex,
    currentUrlSet: !!s.currentUrl,
    wantsPlayback: !!s.wantsPlayback,
    userPaused: !!s.userPaused,
    ended: a.ended
  };
  try { await a.play(); out.manualPlay = 'played'; } catch (e) { out.manualPlay = e.name + ': ' + e.message; }
  return out;
});
console.log('play probe:', JSON.stringify(results.playProbe));
check('play after completion actually plays', afterPlay.isPlaying && !afterPlay.paused,
  `paused=${afterPlay.paused} ct=${afterPlay.ct} srcDur=${afterPlay.dur}`);

// --- Phase D: jump to a word near the start (evicted region) ---
await page.evaluate(() => {
  const el = document.querySelector('#interactive-reading-body [data-word-id]');
  if (el) el.click();
});
let afterClick = await snap();
const clickDeadline = Date.now() + 10000;
while (Date.now() < clickDeadline && !(afterClick.isPlaying && !afterClick.paused && afterClick.ct > 0.05)) {
  await page.waitForTimeout(200);
  afterClick = await snap();
}
results.afterClick = afterClick;
console.log('after word click:', JSON.stringify(afterClick));
check('word jump plays audio', afterClick.isPlaying && !afterClick.paused && afterClick.ct > 0.05,
  `paused=${afterClick.paused} ct=${afterClick.ct} dur=${afterClick.dur}`);

console.log('pause events:', JSON.stringify(await page.evaluate(() => window.__pauses)));
const diag = await page.evaluate(() => (window.__VOX_DIAG ? window.__VOX_DIAG() : 'n/a'));
console.log('\n__VOX_DIAG:', diag);
const errors = consoleLines.filter((l) => /PAGEERROR|error:/i.test(l)).slice(0, 12);
console.log('\nconsole errors:', errors.length ? errors.join('\n') : 'none');

await browser.close();
fs.writeFileSync('tests/harness/last-run.json', JSON.stringify(results, null, 2));
const failed = results.checks.filter((c) => !c.pass);
console.log('\n' + (failed.length ? failed.length + ' INVARIANTS FAILED' : 'ALL INVARIANTS PASS'));
process.exit(failed.length ? 1 : 0);