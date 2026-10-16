const path = require('path');
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\acer nitro\\.gemini\\antigravity\\brain\\440907d6-4629-4188-a381-5ba9a51d4201';
const LIVE_URL = 'https://voxflow-809.pages.dev';

(async () => {
  console.log('Connecting to standalone Chromium to verify LIVE Project Archive on Cloudflare...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();

  // Desktop viewport
  await page.setViewport({ width: 1280, height: 950 });
  console.log(`Navigating to ${LIVE_URL}...`);
  await page.goto(LIVE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // Click on the Archive tab in desktop header
  console.log('Clicking Archive tab on Desktop...');
  await page.evaluate(() => {
    const tab = document.querySelector('.nav-desktop-tab[data-tab="archive"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Verify Project Archive view is visible
  const archiveViewVisible = await page.evaluate(() => {
    const el = document.getElementById('view-archive');
    return el && !el.classList.contains('hidden');
  });
  console.log('Archive view visible:', archiveViewVisible);

  // Check download link target
  const downloadHref = await page.evaluate(() => {
    const link = document.querySelector('#view-archive a[download]');
    return link ? link.href : null;
  });
  console.log('Archive view APK download link:', downloadHref);

  // Take Desktop Archive Screenshot
  const desktopPath = path.join(ARTIFACTS_DIR, 'live_cloudflare_project_archive_desktop.png');
  await page.screenshot({ path: desktopPath });
  console.log('Captured desktop archive screenshot:', desktopPath);

  // Mobile viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Click on Archive tab in mobile bottom dock
  console.log('Clicking Archive tab on Mobile dock...');
  await page.evaluate(() => {
    const dockTab = document.querySelector('.dock-tab-btn[data-tab="archive"]');
    if (dockTab) dockTab.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Take Mobile Archive Screenshot
  const mobilePath = path.join(ARTIFACTS_DIR, 'live_cloudflare_project_archive_mobile.png');
  await page.screenshot({ path: mobilePath });
  console.log('Captured mobile archive screenshot:', mobilePath);

  await browser.close();
  console.log('Live Cloudflare Project Archive verification completed successfully!');
  process.exit(0);
})().catch(err => {
  console.error('Error during archive verification:', err);
  process.exit(1);
});
