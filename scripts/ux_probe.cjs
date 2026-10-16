// Diagnose why a header action button is not clickable.
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));
  await page.mouse.click(640, 300);
  await new Promise((r) => setTimeout(r, 300));

  const info = await page.evaluate(() => {
    const btn = document.getElementById('btn-open-settings');
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    const cs = getComputedStyle(btn);
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      display: cs.display,
      visibility: cs.visibility,
      pointerEvents: cs.pointerEvents,
      topElementAtCenter: top ? (top.id || top.className || top.tagName) : null,
      topIsButtonOrChild: top ? (top === btn || btn.contains(top)) : false,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
