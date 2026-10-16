// Baseline capture of the current VoxFlow UI before the redesign.
// Usage: node scripts/ux_baseline.cjs [baseUrl]
const path = require('path');
const fs = require('fs');
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:8000';
const OUT = process.argv[3] || 'ux_shots';
const SHOTS = [
  ['studio_desktop', 1280, 900, false],
  ['studio_mobile', 390, 844, true],
  ['stt_desktop', 1280, 900, false],
  ['stt_mobile', 390, 844, true],
  ['models_desktop', 1280, 900, false],
  ['archive_desktop', 1280, 900, false],
  ['drawer_desktop', 1280, 900, false],
  ['drawer_mobile', 390, 844, true],
  ['settings_desktop', 1280, 900, false],
  ['api_desktop', 1280, 900, false],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors'],
  });

  for (const [name, w, h, isMobile] of SHOTS) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewport({ width: w, height: h, isMobile, hasTouch: isMobile, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(900);

    if (name.startsWith('stt')) {
      await page.evaluate(() => document.querySelector('.dock-tab-btn[data-tab="transcribe"]').click());
    } else if (name.startsWith('models')) {
      await page.evaluate(() => document.querySelector('.dock-tab-btn[data-tab="models"], .nav-desktop-tab[data-tab="models"]').click());
    } else if (name.startsWith('archive')) {
      await page.evaluate(() => document.querySelector('.dock-tab-btn[data-tab="archive"], .nav-desktop-tab[data-tab="archive"]').click());
    } else if (name.startsWith('drawer')) {
      await page.evaluate(() => document.getElementById('dock-voice-pill').click());
    } else if (name.startsWith('settings')) {
      await page.evaluate(() => document.getElementById('btn-open-settings').click());
    } else if (name.startsWith('api')) {
      await page.evaluate(() => document.getElementById('btn-open-api').click());
    }
    await sleep(700);

    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
    console.log(`[${errors.length ? 'ERR' : 'OK '}] ${name} -> ${file}`);
    if (errors.length) console.log('      ' + errors.slice(0, 4).join('\n      '));
    await page.close();
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
