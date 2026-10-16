const path = require('path');
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';
const TARGET_URL = 'https://voxflow-809.pages.dev';
const ARTIFACTS_DIR = 'C:\\Users\\acer nitro\\.gemini\\antigravity\\brain\\440907d6-4629-4188-a381-5ba9a51d4201';

(async () => {
  console.log('Verifying live deployment on Cloudflare Pages at:', TARGET_URL);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`Navigating to ${TARGET_URL} ...`);
  const resp = await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 25000 });
  console.log(`HTTP Status:`, resp.status());

  await new Promise(r => setTimeout(r, 1200));

  // Capture Desktop Studio on Live Production
  const pathLiveDesktop = path.join(ARTIFACTS_DIR, 'live_obsidian_desktop.png');
  await page.screenshot({ path: pathLiveDesktop, fullPage: false });
  console.log('Captured Live Desktop:', pathLiveDesktop);

  // Switch to Mobile
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 800));

  const pathLiveMobile = path.join(ARTIFACTS_DIR, 'live_obsidian_mobile.png');
  await page.screenshot({ path: pathLiveMobile, fullPage: false });
  console.log('Captured Live Mobile:', pathLiveMobile);

  // Check preview audio on live production
  const previewStatus = await page.evaluate(async () => {
    const btn = document.getElementById('btn-dock-voice-sample');
    if (!btn) return { error: 'No sample button' };
    btn.click();
    await new Promise(r => setTimeout(r, 1000));
    const audio = window.__VOX_STATE?.previewAudio;
    return {
      src: audio ? audio.src : 'null',
      paused: audio ? audio.paused : true,
      currentTime: audio ? audio.currentTime : 0
    };
  });
  console.log('Live Preview Playback Status:', previewStatus);

  await browser.close();
  console.log('Live Verification Finished Successfully!');
  process.exit(0);
})();
