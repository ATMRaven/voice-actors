#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BASE = process.env.NAS_BASE_URL || 'http://127.0.0.1:8000';
const CHROMIUM_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';

let puppeteer = null;
try {
  puppeteer = require('Z:/code/vibe code/uploader/node_modules/puppeteer');
} catch (e) {
  try {
    puppeteer = require('puppeteer');
  } catch (err) {}
}

let browser = null;
if (puppeteer) {
  browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
} else {
  const pw = await import('playwright');
  browser = await pw.chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true
  });
}

const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });

await page.evaluate(async () => {
  const { putAudio } = await import('/js/db.js');
  const makeWav = (seconds) => {
    const sampleRate = 8000;
    const samples = sampleRate * seconds;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => { for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, samples * 2, true);
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const now = Date.now();
  await putAudio({ id: 'seed-1', filename: '20240101-120000_aria_hello-world.wav', voiceId: 'aria', voiceName: 'Aria', text: 'Hello world', createdAt: now, duration: 1, mime: 'audio/wav' }, makeWav(1));
  await putAudio({ id: 'seed-2', filename: '20240102-093000_kai_narration-sample.wav', voiceId: 'kai', voiceName: 'Kai', text: 'Narration sample', createdAt: now - 1000, duration: 2, mime: 'audio/wav' }, makeWav(2));
});

await browser.close();
console.log('seed-vault: 2 clips written');
