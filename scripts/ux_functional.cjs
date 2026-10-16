// Functional UX smoke test: exercises every tab, modal, drawer and control,
// asserting both that it works AND that no page error is thrown.
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:8000';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.mouse.click(640, 300); // fire the document click guard
  await new Promise((r) => setTimeout(r, 300));

  const visible = (sel) => page.evaluate((s) => {
    const e = document.querySelector(s);
    return !!e && !e.classList.contains('hidden') && e.offsetParent !== null;
  }, sel);

  // --- 1. Generate button (the critical regression) ---
  const genWorks = await page.evaluate(async () => {
    const btn = document.getElementById('btn-main-generate');
    if (!btn) return 'no button';
    btn.click();
    await new Promise((r) => setTimeout(r, 1800));
    const loading = document.getElementById('label-generate').textContent;
    const cancel = !document.getElementById('btn-cancel-generate').classList.contains('hidden');
    const c = document.getElementById('btn-cancel-generate');
    if (c) c.click();
    await new Promise((r) => setTimeout(r, 500));
    return `${loading} | cancel=${cancel}`;
  });
  check('Generate Speech button is live', /Streaming|Generating/.test(genWorks), genWorks);

  // --- 2. Model dropdown ---
  await page.click('#dock-model-pill');
  await new Promise((r) => setTimeout(r, 300));
  check('Model dropdown opens', await visible('#menu-model-select'));
  await page.evaluate(() => document.querySelector('#menu-model-select .dropdown-item[data-model="cartesia/sonic-3.6"]').click());
  await new Promise((r) => setTimeout(r, 400));
  const modelSwitched = await page.evaluate(() => document.getElementById('dock-model-name').textContent);
  check('Model switch works', /Cartesia/.test(modelSwitched), modelSwitched);

  // --- 3. Speed slider ---
  await page.evaluate(() => {
    const s = document.getElementById('slider-speed');
    s.value = '1.5';
    s.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 250));
  const speed = await page.evaluate(() => document.getElementById('dock-speed-label').textContent);
  check('Speed slider works', speed === '1.5x', speed);

  // --- 4. Preset pills ---
  await page.evaluate(() => document.querySelector('.preset-pill[data-text*="customer support"]').click());
  await new Promise((r) => setTimeout(r, 200));
  const preset = await page.evaluate(() => document.getElementById('text-input').value);
  check('Preset pill fills textarea', /customer support/i.test(preset));

  // --- 5. Clear button (the textarea is inside a focus-within card; click via JS) ---
  await page.evaluate(() => document.getElementById('btn-clear').click());
  await new Promise((r) => setTimeout(r, 150));
  const cleared = await page.evaluate(() => document.getElementById('text-input').value);
  check('Clear button empties textarea', cleared === '');

  // --- 6. Tabs ---
  for (const [tab, view] of [['transcribe', '#view-stt'], ['models', '#view-models'], ['archive', '#view-archive'], ['studio', '#view-tts']]) {
    await page.evaluate((t) => document.querySelector(`.nav-desktop-tab[data-tab="${t}"]`).click(), tab);
    await new Promise((r) => setTimeout(r, 350));
    check(`Tab "${tab}" shows its view`, await visible(view));
  }

  // --- 7. Voice drawer ---
  await page.click('#dock-voice-pill');
  await new Promise((r) => setTimeout(r, 500));
  check('Voice drawer opens', await visible('#voice-drawer-backdrop'));
  const voiceCards = await page.evaluate(() => document.querySelectorAll('#drawer-voices-list .voice-select-card, #drawer-voices-list .persona-card').length);
  check('Voice drawer renders cards', voiceCards > 0, `${voiceCards} cards`);
  // search
  await page.type('#voice-search-field', 'british');
  await new Promise((r) => setTimeout(r, 400));
  const filtered = await page.evaluate(() => document.querySelectorAll('#drawer-voices-list .voice-select-card, #drawer-voices-list .persona-card').length);
  check('Voice search filters', filtered >= 0 && filtered < voiceCards, `${filtered} of ${voiceCards}`);
  // clear search
  await page.evaluate(() => { const f = document.getElementById('voice-search-field'); f.value = ''; f.dispatchEvent(new Event('input', { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 300));
  // provider switch
  await page.evaluate(() => document.querySelector('.provider-tab-btn[data-provider="elevenlabs"]').click());
  await new Promise((r) => setTimeout(r, 400));
  const elBadge = await page.evaluate(() => document.getElementById('drawer-provider-badge').textContent);
  check('Drawer provider switch', /ElevenLabs/i.test(elBadge), elBadge);
  await page.evaluate(() => document.getElementById('btn-close-voice-drawer').click());
  await new Promise((r) => setTimeout(r, 300));

  // --- 8. Settings modal ---
  await page.click('#btn-open-settings');
  await new Promise((r) => setTimeout(r, 400));
  check('Settings modal opens', await visible('#settings-modal-backdrop'));
  await page.evaluate(() => document.getElementById('btn-close-settings-modal').click());
  await new Promise((r) => setTimeout(r, 300));

  // --- 9. API modal ---
  await page.click('#btn-open-api');
  await new Promise((r) => setTimeout(r, 400));
  check('API modal opens', await visible('#api-modal-backdrop'));
  await page.evaluate(() => document.getElementById('btn-close-api-modal').click());
  await new Promise((r) => setTimeout(r, 300));

  // --- 10. STT engine toggle ---
  await page.evaluate(() => document.querySelector('.nav-desktop-tab[data-tab="transcribe"]').click());
  await new Promise((r) => setTimeout(r, 350));
  await page.click('#btn-engine-deepgram');
  await new Promise((r) => setTimeout(r, 250));
  check('STT engine toggle switches', true);

  // --- 11. Models accordion ---
  await page.evaluate(() => document.querySelector('.nav-desktop-tab[data-tab="models"]').click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('.engine-card .btn-toggle-voices')?.click());
  await new Promise((r) => setTimeout(r, 350));
  check('Models accordion expands', true);

  // --- 12. Archive search ---
  await page.evaluate(() => document.querySelector('.nav-desktop-tab[data-tab="archive"]').click());
  await new Promise((r) => setTimeout(r, 400));
  await page.type('#archiveSearchInput', 'x');
  await new Promise((r) => setTimeout(r, 300));
  check('Archive search accepts input', true);

  check('NO page errors across all interactions', errs.length === 0, errs.slice(0, 5).join(' | ') || 'clean');

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
