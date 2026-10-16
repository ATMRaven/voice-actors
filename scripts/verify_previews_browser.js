const path = require('path');
const puppeteer = require('Z:/code/vibe code/3d world/node_modules/puppeteer-core');

const CHROME_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';
const TARGET_URL = 'https://voxflow-809.pages.dev';

(async () => {
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
  await page.setViewport({ width: 1280, height: 900 });

  const networkErrors = [];
  page.on('response', resp => {
    if (resp.url().includes('/previews/') && resp.status() >= 400) {
      networkErrors.push(`${resp.status()} ${resp.url()}`);
      console.error(`[PREVIEW NETWORK ERROR] ${resp.status()} ${resp.url()}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser error]:`, msg.text());
    }
  });

  console.log(`Navigating to ${TARGET_URL} ...`);
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 25000 });

  console.log('\n--- 1. OPENING VOICE DRAWER ---');
  await page.click('#dock-voice-pill');
  await new Promise(r => setTimeout(r, 600));

  const providersToTest = [
    { name: 'Deepgram Flux', id: 'deepgram' },
    { name: 'ElevenLabs', id: 'elevenlabs' },
    { name: 'Cartesia', id: 'cartesia' },
    { name: 'Google Gemini', id: 'gemini' },
    { name: 'Groq Orpheus', id: 'groq' },
    { name: 'Cloudflare MeloTTS', id: 'cloudflare' },
    { name: 'Mistral AI', id: 'mistral' }
  ];

  const results = [];

  for (const prov of providersToTest) {
    console.log(`\nTesting Voice Previews for Provider: ${prov.name}...`);
    // Click provider tab button in drawer
    const clicked = await page.evaluate((provId) => {
      const btn = document.querySelector(`#drawer-provider-tabs .provider-tab-btn[data-provider="${provId}"]`);
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, prov.id);

    if (!clicked) {
      console.warn(`Could not find tab for ${prov.name}`);
      continue;
    }
    await new Promise(r => setTimeout(r, 600));

    // Find first voice card and click preview button
    const previewResult = await page.evaluate(async () => {
      const cards = document.querySelectorAll('#drawer-voices-list .voice-select-card, #drawer-voices-list .persona-card');
      if (cards.length === 0) return { error: 'No voice cards found in #drawer-voices-list' };
      const card = cards[0];
      const voiceName = card.querySelector('.card-name, .persona-name')?.textContent.trim() || 'Unknown';
      const previewBtn = card.querySelector('.voice-preview-btn');
      if (!previewBtn) return { error: 'No preview button on card' };

      previewBtn.click();

      // Wait 1.5 seconds for audio to play
      await new Promise(r => setTimeout(r, 1500));

      const audio = window.__VOX_STATE?.previewAudio;
      return {
        voiceName,
        src: audio ? audio.src : 'null',
        paused: audio ? audio.paused : true,
        currentTime: audio ? Math.round(audio.currentTime * 100) / 100 : 0,
        duration: audio ? Math.round(audio.duration * 100) / 100 : 0
      };
    });

    console.log(`Preview Result for ${prov.name}:`, previewResult);
    results.push({ provider: prov.name, ...previewResult });
  }

  // Take a verified screenshot of the active drawer with preview playing
  const shotPath = 'C:\\Users\\acer nitro\\.gemini\\antigravity\\brain\\440907d6-4629-4188-a381-5ba9a51d4201\\verified_voice_previews_playing.png';
  await page.screenshot({ path: shotPath });
  console.log('\nSaved verification screenshot to:', shotPath);

  console.log('\n--- PREVIEW TEST SUMMARY ---');
  console.table(results);
  console.log('Total Network 404/Error Previews:', networkErrors.length);

  await browser.close();
})();
