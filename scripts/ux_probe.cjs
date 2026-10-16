// Diagnose why the 3 modals report as not-visible.
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e)));
  await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.mouse.click(640, 300);
  await new Promise((r) => setTimeout(r, 300));

  const probe = async (id, btnId) => {
    await page.evaluate((b) => document.getElementById(b).click(), btnId);
    await new Promise((r) => setTimeout(r, 600));
    const info = await page.evaluate((i) => {
      const e = document.getElementById(i);
      if (!e) return 'MISSING';
      const cs = getComputedStyle(e);
      return {
        hiddenClass: e.classList.contains('hidden'),
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        offsetParent: e.offsetParent ? 'yes' : 'null',
        zIndex: cs.zIndex,
      };
    }, id);
    console.log(btnId, '->', id, JSON.stringify(info));
  };

  await probe('voice-drawer-backdrop', 'dock-voice-pill');
  await probe('settings-modal-backdrop', 'btn-open-settings');
  await probe('api-modal-backdrop', 'btn-open-api');

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
