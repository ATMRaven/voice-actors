const path = require('path');
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\acer nitro\\.gemini\\antigravity\\brain\\440907d6-4629-4188-a381-5ba9a51d4201';
const LIVE_URL = 'https://voxflow-809.pages.dev';

(async () => {
  console.log('Connecting to standalone Chromium to verify LIVE Cloudflare deployment...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();

  // Desktop viewport
  await page.setViewport({ width: 1280, height: 900 });
  console.log(`Navigating to ${LIVE_URL} on Desktop...`);
  await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // Verify Title and Brand
  const title = await page.title();
  const brand = await page.$eval('header h1', el => el.textContent.trim()).catch(() => '');
  console.log(`Live Page Title: "${title}", Brand: "${brand}"`);

  // Verify Generate Button position
  const genBtn = await page.$('#btn-main-generate');
  const genBox = genBtn ? await genBtn.boundingBox() : null;
  console.log('Live Generate CTA bounding box:', genBox);

  // Take Desktop Screenshot
  const liveDesktopPath = path.join(ARTIFACTS_DIR, 'live_voiceactors_desktop.png');
  await page.screenshot({ path: liveDesktopPath });
  console.log('Captured live desktop screenshot:', liveDesktopPath);

  // Mobile viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Verify mobile bottom dock
  const mobDock = await page.$('#main-dock');
  const dockVisible = mobDock ? await page.evaluate(el => window.getComputedStyle(el).display !== 'none', mobDock) : false;
  console.log('Live Mobile Dock visible:', dockVisible);

  // Take Mobile Screenshot
  const liveMobilePath = path.join(ARTIFACTS_DIR, 'live_voiceactors_mobile.png');
  await page.screenshot({ path: liveMobilePath });
  console.log('Captured live mobile screenshot:', liveMobilePath);

  await browser.close();
  console.log('Live Cloudflare verification completed successfully!');
  process.exit(0);
})().catch(err => {
  console.error('Error during live verification:', err);
  process.exit(1);
});
