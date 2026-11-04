// Mock VoxFlow API + static server for the long-file playback harness.
// Serves static/ and fakes /api/tts with deterministic WAV audio.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC = path.resolve(__dirname, '../../static');
const PORT = Number(process.env.PORT || 8899);

const RATE = 48000;
const CHANNELS = 2;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json'
};

export const stats = {
  ttsCalls: 0, order: [], delay: () => 30,
  junk: Number(process.env.JUNK || 0),
  rate: 400, // characters per second of synthesized audio // >0 adds a hidden chunk before fmt, like some providers do
  fail: () => false
};

function makeWav(seconds) {
  const JUNK = stats.junk | 0;
  const frames = Math.max(1, Math.floor(seconds * RATE));
  const dataSize = frames * CHANNELS * 2;
  const buf = Buffer.alloc(20 + (JUNK ? 8 + JUNK : 0) + 24 + 8 + dataSize);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + (JUNK ? 8 + JUNK : 0) + dataSize, 4); buf.write('WAVE', 8);
  let o = 12;
  if (JUNK) {
    buf.write('JUNK', o); buf.writeUInt32LE(JUNK, o + 4);
    o += 8 + JUNK;
  }
  buf.write('fmt ', o); buf.writeUInt32LE(16, o + 4);
  buf.writeUInt16LE(1, o + 8); buf.writeUInt16LE(CHANNELS, o + 10);
  buf.writeUInt32LE(RATE, o + 12); buf.writeUInt32LE(RATE * CHANNELS * 2, o + 16);
  buf.writeUInt16LE(CHANNELS * 2, o + 20); buf.writeUInt16LE(16, o + 22);
  o += 24;
  buf.write('data', o); buf.writeUInt32LE(dataSize, o + 4);
  o += 8;
  // a quiet 220Hz tone so the file is real, decodable audio
  for (let i = 0; i < frames; i++) {
    const v = Math.round(Math.sin((i / RATE) * 220 * Math.PI * 2) * 1200);
    buf.writeInt16LE(v, o + i * 4);
    buf.writeInt16LE(v, o + i * 4 + 2);
  }
  return buf;
}

function body(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => resolve(d));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (url.pathname === '/api/tts' && req.method === 'POST') {
    const raw = await body(req);
    let text = '';
    try { text = JSON.parse(raw).text || ''; } catch (_) {}
    const idx = stats.ttsCalls++;
    stats.order.push({ idx, len: text.length, t: Date.now() });
    if (stats.fail(idx, text)) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ detail: 'mock synthesis failure' }));
    }
    // Realistic speech pacing, capped so the harness finishes quickly.
    const rate = stats.rate > 0 ? stats.rate : 400;
    const seconds = Math.max(0.4, Math.min(240, text.length / rate));
    const wait = stats.delay(idx, text);
    await new Promise((r) => setTimeout(r, wait));
    const wav = makeWav(seconds);
    res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': wav.length });
    return res.end(wav);
  }

  if (url.pathname === '/api/align' && req.method === 'POST') {
    const raw = await body(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ words: [], duration: 1, _bytes: raw.length }));
  }

  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      deepgram_ready: true, openrouter_ready: true, groq_ready: true, mistral_ready: true,
      gemini_ready: true, cartesia_ready: true, cloudflare_ready: true, elevenlabs_ready: true,
      status: 'ok'
    }));
  }

  if (url.pathname === '/__stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ttsCalls: stats.ttsCalls, order: stats.order }));
  }

  let file = path.join(STATIC, decodeURIComponent(url.pathname));
  if (pathname_is_dir(file)) file = path.join(file, 'index.html');
  if (url.pathname === '/') file = path.join(STATIC, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function pathname_is_dir(p) {
  try { return fs.statSync(p).isDirectory(); } catch (_) { return false; }
}

export function start(port = PORT) {
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}
export { server, PORT };

if (process.argv[1] && process.argv[1].endsWith('mock-tts-server.mjs')) {
  start().then(() => console.log('mock server on http://127.0.0.1:' + PORT));
}