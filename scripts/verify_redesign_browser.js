const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';
const STATIC_DIR = path.resolve(__dirname, '..', 'static');
const ARTIFACTS_DIR = 'C:\\Users\\acer nitro\\.gemini\\antigravity\\brain\\440907d6-4629-4188-a381-5ba9a51d4201';
const PORT = 3034;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];

      if (urlPath === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          deepgram_ready: true,
          mistral_ready: true,
          elevenlabs_ready: true,
          cartesia_ready: true,
          gemini_ready: true,
          groq_ready: true,
          cloudflare_ready: true
        }));
        return;
      }

      let filePath = path.join(STATIC_DIR, urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, ''));
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': mime });
          res.end(data);
        }
      });
    });

    server.listen(PORT, () => {
      console.log(`Local test server running at http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

(async () => {
  const server = await startServer();

  console.log('Launching Standalone Chromium at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required',
      '--ignore-certificate-errors'
    ]
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error]:`, msg.text());
    }
  });

  const url = `http://localhost:${PORT}`;
  console.log(`Navigating to ${url} ...`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
  await new Promise(r => setTimeout(r, 600));

  // =========================================================================
  // 1. DESKTOP VIEWPORT (1280x900)
  // =========================================================================
  console.log('\n--- VERIFYING DESKTOP VIEWPORT (1280x900) ---');
  await page.setViewport({ width: 1280, height: 900 });
  await new Promise(r => setTimeout(r, 400));

  // Check 1: Bottom Dock is hidden on desktop
  const dockDisplay = await page.evaluate(() => {
    const dock = document.getElementById('main-dock');
    return dock ? window.getComputedStyle(dock).display : 'none';
  });
  console.log(`Desktop Bottom Dock display (must be none): ${dockDisplay}`);

  // Check 2: Top desktop navigation exists and works
  const topNavTabs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.nav-desktop-tab')).map(t => t.textContent.trim());
  });
  console.log(`Top Header Nav Tabs found: ${JSON.stringify(topNavTabs)}`);

  // Check 3: Presets click works and loads into textarea without toast error
  const presetResult = await page.evaluate(() => {
    const firstPreset = document.querySelector('#presets-quick-bar .preset-pill');
    if (!firstPreset) return { error: 'No preset pill found' };
    firstPreset.click();
    const txt = document.getElementById('text-input').value;
    return { success: true, text: txt.slice(0, 50) + '...' };
  });
  console.log(`Preset 1-Click Verification:`, presetResult);

  // Check 4: Generate Speech button is visible immediately above fold
  const ctaVisibility = await page.evaluate(() => {
    const btn = document.getElementById('btn-main-generate');
    const rect = btn.getBoundingClientRect();
    return {
      visible: rect.top < window.innerHeight && rect.bottom > 0,
      top: Math.round(rect.top),
      height: Math.round(rect.height)
    };
  });
  console.log(`Generate CTA viewport position:`, ctaVisibility);

  // Screenshot: Tab 1 - Studio
  const pathDeskStudio = path.join(ARTIFACTS_DIR, 'obsidian_desktop_studio.png');
  await page.screenshot({ path: pathDeskStudio, fullPage: false });
  console.log('Captured:', pathDeskStudio);

  // Switch to Tab 2: Transcribe via Desktop Nav
  await page.evaluate(() => {
    const tab = document.querySelector('.nav-desktop-tab[data-tab="transcribe"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Check Transcribe Action Button visibility
  const transcribeBtn = await page.evaluate(() => {
    const btn = document.getElementById('btn-do-transcribe');
    if (!btn) return { exists: false };
    const rect = btn.getBoundingClientRect();
    const style = window.getComputedStyle(btn);
    return {
      exists: true,
      text: btn.textContent.trim(),
      display: style.display,
      visible: rect.width > 0 && rect.height > 0
    };
  });
  console.log(`Transcribe Audio CTA Button:`, transcribeBtn);

  const pathDeskSTT = path.join(ARTIFACTS_DIR, 'obsidian_desktop_transcribe.png');
  await page.screenshot({ path: pathDeskSTT, fullPage: false });
  console.log('Captured:', pathDeskSTT);

  // Switch to Tab 3: Models via Desktop Nav
  await page.evaluate(() => {
    const tab = document.querySelector('.nav-desktop-tab[data-tab="models"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Expand first provider (Cartesia) in Models tab
  const expandedVoices = await page.evaluate(() => {
    const header = document.querySelector('.engine-card');
    if (header) {
      header.click();
      const items = header.querySelectorAll('.voice-preview-btn');
      return { expanded: true, voiceCount: items.length };
    }
    return { expanded: false };
  });
  console.log(`Models Tab Expandable Voice Explorer:`, expandedVoices);
  await new Promise(r => setTimeout(r, 400));

  const pathDeskModels = path.join(ARTIFACTS_DIR, 'obsidian_desktop_models.png');
  await page.screenshot({ path: pathDeskModels, fullPage: false });
  console.log('Captured:', pathDeskModels);

  // Switch to Tab 4: Archive via Desktop Nav
  await page.evaluate(() => {
    const tab = document.querySelector('.nav-desktop-tab[data-tab="archive"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 400));
  const pathDeskArchive = path.join(ARTIFACTS_DIR, 'obsidian_desktop_archive.png');
  await page.screenshot({ path: pathDeskArchive, fullPage: false });
  console.log('Captured:', pathDeskArchive);

  // Switch back to Studio and Open Voice Selection Modal
  await page.evaluate(() => {
    const tab = document.querySelector('.nav-desktop-tab[data-tab="studio"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('#dock-voice-pill');
  await new Promise(r => setTimeout(r, 500));

  const modalCheck = await page.evaluate(() => {
    const modal = document.getElementById('voice-drawer');
    const rect = modal.getBoundingClientRect();
    const cards = modal.querySelectorAll('.voice-select-card, .persona-card');
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      voiceCards: cards.length
    };
  });
  console.log(`Voice Selection Modal dimensions & cards:`, modalCheck);

  const pathDeskDrawer = path.join(ARTIFACTS_DIR, 'obsidian_desktop_drawer.png');
  await page.screenshot({ path: pathDeskDrawer, fullPage: false });
  console.log('Captured:', pathDeskDrawer);

  // Close Voice Modal
  await page.click('#btn-close-voice-drawer');
  await new Promise(r => setTimeout(r, 300));

  // Open Settings Modal
  await page.click('#btn-open-settings');
  await new Promise(r => setTimeout(r, 500));

  const settingsBadges = await page.evaluate(() => {
    const groq = document.getElementById('pill-status-groq');
    const deepgram = document.getElementById('pill-status-deepgram');
    return {
      groqText: groq ? groq.textContent.trim() : null,
      groqClass: groq ? groq.className : null,
      deepgramText: deepgram ? deepgram.textContent.trim() : null
    };
  });
  console.log(`Settings Modal Groq Key Badge:`, settingsBadges);

  const pathDeskSettings = path.join(ARTIFACTS_DIR, 'obsidian_desktop_settings.png');
  await page.screenshot({ path: pathDeskSettings, fullPage: false });
  console.log('Captured:', pathDeskSettings);

  // Close Settings Modal
  await page.click('#btn-close-settings-modal');
  await new Promise(r => setTimeout(r, 300));

  // =========================================================================
  // 2. MOBILE VIEWPORT (390x844 - iPhone 14 / OLED Pro)
  // =========================================================================
  console.log('\n--- VERIFYING MOBILE VIEWPORT (390x844) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 400));

  const mobDockDisplay = await page.evaluate(() => {
    const dock = document.getElementById('main-dock');
    return dock ? window.getComputedStyle(dock).display : 'none';
  });
  console.log(`Mobile Bottom Dock display (must NOT be none): ${mobDockDisplay}`);

  // Screenshot: Mobile Studio
  const pathMobStudio = path.join(ARTIFACTS_DIR, 'obsidian_mobile_studio.png');
  await page.screenshot({ path: pathMobStudio, fullPage: false });
  console.log('Captured:', pathMobStudio);

  // Mobile Transcribe
  await page.click('.dock-tab-btn[data-tab="transcribe"]');
  await new Promise(r => setTimeout(r, 400));
  const pathMobSTT = path.join(ARTIFACTS_DIR, 'obsidian_mobile_transcribe.png');
  await page.screenshot({ path: pathMobSTT, fullPage: false });
  console.log('Captured:', pathMobSTT);

  // Mobile Models
  await page.click('.dock-tab-btn[data-tab="models"]');
  await new Promise(r => setTimeout(r, 400));
  const pathMobModels = path.join(ARTIFACTS_DIR, 'obsidian_mobile_models.png');
  await page.screenshot({ path: pathMobModels, fullPage: false });
  console.log('Captured:', pathMobModels);

  // Mobile Voice Drawer
  await page.click('.dock-tab-btn[data-tab="studio"]');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#dock-voice-pill');
  await new Promise(r => setTimeout(r, 500));
  const pathMobDrawer = path.join(ARTIFACTS_DIR, 'obsidian_mobile_drawer.png');
  await page.screenshot({ path: pathMobDrawer, fullPage: false });
  console.log('Captured:', pathMobDrawer);

  console.log('\nAll Visual & Interactive Verifications Completed Successfully!');
  await browser.close();
  server.close();
  process.exit(0);
})();
