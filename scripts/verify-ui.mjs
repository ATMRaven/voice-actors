#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);

function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}
function has(name) {
  return args.includes(name);
}

const BASE = process.env.NAS_BASE_URL || flag('--url') || 'http://127.0.0.1:8000';
const breakpoints = (flag('--breakpoints') || '360,390,768,1280').split(',').map(Number);
const check = flag('--check');
const screenshots = has('--screenshots');
const outDir = flag('--out') || './artifacts/screens';

const CHROMIUM_PATH = 'C:\\Users\\acer nitro\\.gemini\\tools\\chromium\\chrome.exe';

let puppeteer = null;
try {
  puppeteer = require('Z:/code/vibe code/uploader/node_modules/puppeteer');
} catch (e) {
  try {
    puppeteer = require('puppeteer');
  } catch (err) {
    // will check playwright
  }
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

let failures = 0;

async function withPage(width, fn) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    const text = typeof msg.text === 'function' ? msg.text() : String(msg);
    const type = typeof msg.type === 'function' ? msg.type() : 'log';
    if (type === 'error' && !text.includes('favicon') && !text.includes('net::ERR_CONNECTION_REFUSED')) {
      consoleErrors.push(text);
    }
  });

  page.on('requestfailed', (req) => {
    const url = typeof req.url === 'function' ? req.url() : String(req);
    if (!url.includes('favicon') && !url.includes('.map')) {
      failedRequests.push(url);
    }
  });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
  } catch (e) {
    console.warn(`[verify-ui] Warning on goto(${BASE}): ${e.message}`);
  }

  await fn(page, { consoleErrors, failedRequests });
  await page.close();
}

function fail(msg) {
  failures += 1;
  console.error('FAIL: ' + msg);
}

for (const width of breakpoints) {
  await withPage(width, async (page, ctx) => {
    if (check === 'overflow') {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (overflow) fail(`horizontal overflow at ${width}px`);
    }
    if (check === 'clipped') {
      const clipped = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll('button, a, input, textarea, h1, h2, h3, p').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1)) bad.push(el.tagName + '.' + el.className);
        });
        return bad;
      });
      if (clipped.length) fail(`clipped elements at ${width}px: ${clipped.join(', ')}`);
    }
    if (check === 'tap-targets') {
      const small = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll('.favorite-chip, .icon-button, .btn-primary, .btn-secondary, [role="button"]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.width < 44 || r.height < 44)) bad.push(el.tagName + '.' + el.className + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        });
        return bad;
      });
      if (small.length) fail(`tap targets under 44px at ${width}px: ${small.join(', ')}`);
    }
    if (check === 'text-overflow') {
      const bad = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('h1, h2, h3, p, span').forEach((el) => {
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'hidden' && !el.classList.contains('scrollable')) out.push(el.className);
        });
        return out;
      });
      if (bad.length) fail(`text overflow at ${width}px: ${bad.join(', ')}`);
    }
    if (check === 'overlap') {
      const overlaps = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('.archive-item, .preset-card, .favorite-chip'));
        const bad = [];
        for (let i = 0; i < els.length; i += 1) {
          for (let j = i + 1; j < els.length; j += 1) {
            const a = els[i].getBoundingClientRect();
            const b = els[j].getBoundingClientRect();
            if (a.width === 0 || b.width === 0) continue;
            const overlap = !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
            if (overlap) bad.push(els[i].className + ' / ' + els[j].className);
          }
        }
        return bad;
      });
      if (overlaps.length) fail(`overlapping boxes at ${width}px: ${overlaps.slice(0, 5).join(', ')}`);
    }
    if (check === 'console') {
      if (ctx.consoleErrors.length) fail(`console errors at ${width}px: ${ctx.consoleErrors.join(' | ')}`);
    }
    if (check === 'network') {
      if (ctx.failedRequests.length) fail(`failed requests at ${width}px: ${ctx.failedRequests.join(', ')}`);
    }
    if (check === 'contrast') {
      const low = await page.evaluate(() => {
        function lum(hex) {
          const n = hex.replace('#', '');
          const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
          const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
          return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
        }
        function toHex(rgb) {
          const m = rgb.match(/\d+/g);
          if (!m) return null;
          return '#' + m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, '0')).join('');
        }
        const bad = [];
        document.querySelectorAll('.presets-title, .archive-item-title, .favorite-chip-label, .btn-primary').forEach((el) => {
          const style = getComputedStyle(el);
          const fg = toHex(style.color);
          let bgEl = el;
          let bg = null;
          while (bgEl && !bg) {
            const b = toHex(getComputedStyle(bgEl).backgroundColor);
            if (b && b !== '#000000') bg = b;
            bgEl = bgEl.parentElement;
          }
          if (!fg || !bg) return;
          const l1 = lum(fg);
          const l2 = lum(bg);
          const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          const size = parseFloat(style.fontSize);
          const bold = parseInt(style.fontWeight, 10) >= 700;
          const large = size >= 24 || (size >= 18.66 && bold);
          const min = large ? 3 : 4.5;
          if (ratio < min) bad.push(`${el.tagName}.${el.className} ${ratio.toFixed(2)}:1`);
        });
        return bad;
      });
      if (low.length) fail(`contrast failures at ${width}px: ${low.slice(0, 5).join(', ')}`);
    }
    if (screenshots) {
      mkdirSync(outDir, { recursive: true });
      await page.screenshot({ path: `${outDir}/view-${width}.png`, fullPage: true });
    }
  });
}

await browser.close();
if (failures > 0) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('verify-ui: all checks passed');
