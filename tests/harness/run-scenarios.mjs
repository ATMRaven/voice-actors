// Regression scenarios for the VoxFlow playback state machine.
// Each scenario boots the real static/app.js against the mock API and asserts one
// invariant that used to break for long scripts. Exits non-zero on failure.
import { createRequire } from 'node:module';
import { start, stats } from './mock-tts-server.mjs';

const requireFrom = createRequire('Z:/code/vibe code/3d world i can roam through on a web app/x.js');
const { chromium } = requireFrom('playwright');
const PORT = 8898;
const CHROME = 'A:/Caches/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

const sentence = 'The lighthouse keeper counted every wave that broke against the rocks below his window, and in the counting he found a rhythm that matched the beating of his own tired heart. ';
const longText = (sentence + 'He wrote each measurement into a ledger bound in green cloth, pressing the pencil hard enough to leave a mark on the page beneath. ').repeat(14);
const mediumText = (sentence + 'Gulls turned above the harbour while the lamp swung its slow warning across the water. ').repeat(5) + ' FAILONLY this segment is built to fail forever. ';
const shortText = 'Good evening. This is a short line of speech for the smoke test, and nothing more.';
// ~600 chars, spoken at a realistic 12.5 chars/s so the app's own word-time
// estimates line up with the real audio and a seek can be verified.
const realisticText = (sentence + 'Gulls turned above the harbour while the lamp swung its slow warning across the water. ').repeat(4);

const failures = [];
function check(name, pass, detail) {
  console.log((pass ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : ''));
  if (!pass) failures.push(name);
}

await start(PORT);
const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });

async function openPage(text, speed = 4) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  await page.route('**/*', (r) => (r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort()));
  await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__VOX_STATE);
  await page.evaluate(({ text, speed }) => {
    window.__VOX_STATE.speed = speed;
    const ta = document.getElementById('text-input');
    ta.value = text;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, { text, speed });
  return { ctx, page };
}

const snap = (page) => page.evaluate(() => {
  const s = window.__VOX_STATE, q = s.playbackQueue || {}, a = s.audioElement;
  return {
    total: q.totalExpected, done: q.completedChunksCount, idx: q.currentIndex,
    waiting: q.waitingForChunk, playing: s.isPlaying && !a.paused, paused: a.paused,
    ct: Math.round((a.currentTime || 0) * 100) / 100, cont: Math.round((s.continuousDuration || 0) * 100) / 100,
    master: !!s.continuousMasterUrl, deferred: !!s.masterDeferred,
    finished: !!q.finished, queue: !!q.isPlayingQueue, userPaused: !!s.userPaused,
    time: document.getElementById('player-time-display').textContent
  };
});

const masterDuration = (page) => page.evaluate(async () => {
  const s = window.__VOX_STATE;
  if (!s.continuousMasterBlob) return null;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const d = (await ctx.decodeAudioData(await s.continuousMasterBlob.arrayBuffer())).duration;
    ctx.close();
    return d;
  } catch (_) { return -1; }
});

async function waitDone(page, ms = 70000) {
  await page.waitForFunction(() => {
    const q = window.__VOX_STATE.playbackQueue;
    return q && q.completedChunksCount >= q.totalExpected && q.totalExpected > 0;
  }, null, { timeout: ms });
}
async function waitFinalized(page, ms = 30000) {
  await page.waitForFunction(() => {
    const q = window.__VOX_STATE.playbackQueue;
    return q && q.finalized;
  }, null, { timeout: ms }).catch(() => {});
}
async function waitIdle(page, ms = 70000) {
  await page.waitForFunction(() => {
    const s = window.__VOX_STATE;
    return s.playbackQueue && s.playbackQueue.finished;
  }, null, { timeout: ms }).catch(() => {});
}

// ---------------------------------------------------------------- A: single chunk
{
  stats.junk = 0; stats.fail = () => false; stats.delay = () => 40;
  const { ctx, page } = await openPage(shortText);
  await page.click('#btn-main-generate');
  await waitDone(page);
  await waitFinalized(page);
  const st = await snap(page);
  const md = await masterDuration(page);
  check('A1 single-chunk master is complete', md !== null && Math.abs(md - st.cont) < 0.3, `master=${md} cont=${st.cont}`);
  await waitIdle(page, 20000);
  await page.evaluate(() => document.getElementById('dock-btn-play').click());
  let started = false;
  for (let i = 0; i < 24 && !started; i++) {
    await page.waitForTimeout(50);
    const s = await snap(page);
    if (!s.paused) started = true;
  }
  check('A2 single-chunk replay works', started, 'audio restarted from the beginning');
  await ctx.close();
}

// ---------------------------------------------------------------- B: medium, in-memory master
{
  stats.junk = 0; stats.fail = () => false; stats.delay = () => 40; stats.rate = 12.5;
  const { ctx, page } = await openPage(realisticText, 1);
  await page.click('#btn-main-generate');
  await waitDone(page);
  await waitFinalized(page);
  await page.waitForFunction(() => !!window.__VOX_STATE.continuousMasterUrl, null, { timeout: 15000 }).catch(() => {});
  let st = await snap(page);
  const md = await masterDuration(page);
  check('B1 master covers the whole medium script', md !== null && Math.abs(md - st.cont) < 0.5,
    `master=${md} cont=${st.cont} deferred=${st.deferred} chunks=${st.total}`);
  check('B2 no empty segments', (await page.evaluate(() => window.__VOX_STATE.playbackQueue.chunks.every(c => c && c.duration > 0))) === true);

  // jump to a word in the middle, then verify the playhead lands near it
  await page.evaluate(() => document.getElementById('dock-btn-play').click()); // pause
  await page.waitForTimeout(200);
  const target = await page.evaluate(() => {
    const sents = document.querySelectorAll('#interactive-reading-body .reader-sentence');
    const el = sents[sents.length - 1];
    const w = window.__VOX_STATE.timelineSentences[Number(el.getAttribute('data-sentence-idx'))];
    el.click();
    return { start: w && w.words[0] ? w.words[0].globalStart : 0, idx: Number(el.getAttribute('data-sentence-idx')) };
  });
  const mdB = await masterDuration(page);
  const expect = Math.min(target.start, (mdB || 0) - 0.05);
  let after = await snap(page);
  const bdl = Date.now() + 4000;
  while (Date.now() < bdl && Math.abs(after.ct - expect) > 1.5) {
    await page.waitForTimeout(150);
    after = await snap(page);
  }
  check('B3 mid-script jump lands near the clicked word',
    Math.abs(after.ct - expect) < 1.5,
    `ct=${after.ct} target=${target.start.toFixed(2)} clamped=${expect.toFixed(2)} sent=${target.idx} playing=${after.playing}`);
  await ctx.close();
}

// ---------------------------------------------------------------- C: jump ahead while still generating
{
  stats.junk = 0; stats.fail = () => false;
  stats.delay = (i) => (i < 6 ? 900 : 60); // slow opening keeps later chunks unbuffered
  const { ctx, page } = await openPage(longText);
  await page.click('#btn-main-generate');
  await page.waitForTimeout(700);
  const before = await snap(page);
  await page.evaluate(() => {
    const sents = document.querySelectorAll('#interactive-reading-body .reader-sentence');
    sents[sents.length - 1].click();
  });
  let jumped = await snap(page);
  const dl = Date.now() + 12000;
  while (Date.now() < dl && !(jumped.playing && jumped.idx >= 6)) {
    await page.waitForTimeout(200);
    jumped = await snap(page);
  }
  check('C1 clicking a late word during generation plays that segment',
    jumped.playing && jumped.idx >= 6, `before idx=${before.idx}/${before.done} -> idx=${jumped.idx} playing=${jumped.playing}`);
  await waitDone(page);
  check('C2 generation still completes after the jump', (await snap(page)).done >= (await snap(page)).total);
  await ctx.close();
}

// ---------------------------------------------------------------- D: paused while buffering stays paused
{
  stats.junk = 0; stats.fail = () => false;
  stats.delay = (i, text) => (String(text).length > 900 ? 2500 : 60);
  const { ctx, page } = await openPage(longText, 1);
  await page.click('#btn-main-generate');
  // wait until the queue is actually playing, then pause like a user would
  await page.waitForFunction(() => {
    const s = window.__VOX_STATE;
    return s.isPlaying && !s.audioElement.paused;
  }, null, { timeout: 30000 });
  await page.evaluate(() => document.getElementById('dock-btn-play').click());
  await page.waitForTimeout(4000);
  const st = await snap(page);
  check('D1 a user pause survives pending segment fetches', st.paused && st.userPaused,
    `paused=${st.paused} userPaused=${st.userPaused} idx=${st.idx}`);
  await ctx.close();
}

// ---------------------------------------------------------------- E: provider WAV with extra chunks
{
  stats.junk = 40000; stats.fail = () => false; stats.delay = () => 40;
  const { ctx, page } = await openPage(shortText);
  await page.click('#btn-main-generate');
  await waitDone(page);
  await page.waitForTimeout(400);
  const st = await snap(page);
  const md = await masterDuration(page);
  check('E1 merged WAV with a JUNK chunk stays decodable', md !== null && md > 0 && Math.abs(md - st.cont) < 0.3,
    `master=${md} cont=${st.cont}`);
  await ctx.close();
}

// ---------------------------------------------------------------- F: a failing segment is skipped, not fatal
{
  stats.junk = 0; stats.delay = () => 40; stats.fail = (i, text) => String(text).includes('FAILONLY');
  const { ctx, page } = await openPage(mediumText, 2);
  await page.click('#btn-main-generate');
  await waitDone(page, 90000);
  const st = await snap(page);
  const skipped = await page.evaluate(() => window.__VOX_STATE.playbackQueue.chunks.filter(c => c && c.skipped).length);
  check('F1 a permanently failing segment is skipped', skipped >= 1 && st.done >= st.total, `skipped=${skipped} done=${st.done}/${st.total}`);
  check('F2 the rest of the script still plays', st.playing || st.ct > 0 || st.finished, `playing=${st.playing} ct=${st.ct} finished=${st.finished}`);
  await ctx.close();
}

await browser.close();
console.log('\n' + (failures.length ? failures.length + ' FAILED: ' + failures.join(', ') : 'ALL SCENARIOS PASS'));
process.exit(failures.length ? 1 : 0);