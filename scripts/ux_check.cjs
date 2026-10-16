// Verify the Generate button is live and check which setup functions threw.
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');
const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));

  await page.mouse.click(640, 300); // trigger the document click guard
  await new Promise((r) => setTimeout(r, 300));

  // Now click Generate and confirm the app reacts (button enters loading state).
  const before = await page.evaluate(() => document.getElementById('label-generate').textContent);
  await page.click('#btn-main-generate');
  await new Promise((r) => setTimeout(r, 1500));
  const after = await page.evaluate(() => ({
    label: document.getElementById('label-generate').textContent,
    disabled: document.getElementById('btn-main-generate').disabled,
    cancelVisible: !document.getElementById('btn-cancel-generate').classList.contains('hidden'),
    stageVisible: !document.getElementById('interactive-stage').classList.contains('hidden'),
  }));

  console.log('label before:', before);
  console.log('after click  :', after);
  console.log('page errors  :', errs.length ? errs : 'NONE');

  // Cancel to clean up
  await page.evaluate(() => document.getElementById('btn-cancel-generate')?.click());
  await new Promise((r) => setTimeout(r, 500));
  const cancelled = await page.evaluate(() => document.getElementById('label-generate').textContent);
  console.log('after cancel :', cancelled);

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
