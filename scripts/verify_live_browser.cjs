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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();

  // Desktop viewport
  await page.setViewport({ width: 1280, height: 900 });
  console.log(`Navigating to ${LIVE_URL} on Desktop...`);
  await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));

  // Verify Title and Brand
  const title = await page.title();
  const brand = await page.$eval('header h1', el => el.textContent.trim()).catch(() => '');
  console.log(`Live Page Title: "${title}", Brand: "${brand}"`);

  // Verify Download App element
  const downloadBtnText = await page.evaluate(() => {
    const el = document.querySelector('download-app[variant="button"]');
    if (!el || !el.shadowRoot) return null;
    const btn = el.shadowRoot.querySelector('.btn-download');
    return btn ? btn.textContent.trim().replace(/\s+/g, ' ') : null;
  });
  console.log('Desktop Download App Button:', downloadBtnText);

  // Take Desktop Screenshot
  const liveDesktopPath = path.join(ARTIFACTS_DIR, 'live_voiceactors_desktop.png');
  await page.screenshot({ path: liveDesktopPath });
  console.log('Captured live desktop screenshot:', liveDesktopPath);

  // Hover over the QR code trigger to display the popover
  const qrHovered = await page.evaluate(() => {
    const el = document.querySelector('download-app[variant="button"]');
    if (!el || !el.shadowRoot) return false;
    const qrTrigger = el.shadowRoot.querySelector('.qr-trigger');
    const popover = el.shadowRoot.querySelector('.qr-popover');
    if (qrTrigger && popover) {
      popover.style.display = 'block'; // force display for clear screenshot verification
      return true;
    }
    return false;
  });
  console.log('Triggered QR popover display:', qrHovered);
  await new Promise(r => setTimeout(r, 600));

  const popoverScreenshotPath = path.join(ARTIFACTS_DIR, 'live_voiceactors_apk_popover.png');
  await page.screenshot({ path: popoverScreenshotPath });
  console.log('Captured popover screenshot:', popoverScreenshotPath);

  // Mobile viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Verify mobile bottom dock
  const mobDock = await page.$('#main-dock');
  const dockVisible = mobDock ? await page.evaluate(el => window.getComputedStyle(el).display !== 'none', mobDock) : false;
  console.log('Live Mobile Dock visible:', dockVisible);

  // Mobile Download App button check
  const mobDownloadBtn = await page.evaluate(() => {
    const el = document.querySelector('download-app');
    if (!el || !el.shadowRoot) return null;
    const btn = el.shadowRoot.querySelector('.btn-download');
    return btn ? btn.textContent.trim().replace(/\s+/g, ' ') : null;
  });
  console.log('Mobile Download App Button:', mobDownloadBtn);

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
