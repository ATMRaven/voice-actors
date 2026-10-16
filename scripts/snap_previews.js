const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';
const TARGET_URL = 'https://voxflow-809.pages.dev';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });
  await page.click('#dock-voice-pill');
  await new Promise(r => setTimeout(r, 600));

  // 1. ElevenLabs Screenshot
  await page.evaluate(() => {
    document.querySelector('#drawer-provider-tabs .provider-tab-btn[data-provider="elevenlabs"]').click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    document.querySelector('#drawer-voices-list .voice-preview-btn').click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: 'C:\\Users\\acer nitro\\.gemini\\antigravity\\brain\\440907d6-4629-4188-a381-5ba9a51d4201\\verified_elevenlabs_preview_playing.png' });
  console.log('Saved verified_elevenlabs_preview_playing.png');

  // 2. Cartesia Screenshot
  await page.evaluate(() => {
    document.querySelector('#drawer-provider-tabs .provider-tab-btn[data-provider="cartesia"]').click();
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    document.querySelector('#drawer-voices-list .voice-preview-btn').click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: 'C:\\Users\\acer nitro\\.gemini\\antigravity\\brain\\440907d6-4629-4188-a381-5ba9a51d4201\\verified_cartesia_preview_playing.png' });
  console.log('Saved verified_cartesia_preview_playing.png');

  await browser.close();
})();
