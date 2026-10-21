const MAX_SLUG = 48;

export function slugify(input) {
  return String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function timestamp(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function buildFilename({ voice, text, createdAt, ext }) {
  const voiceSlug = slugify(voice) || 'voice';
  const textSlug = slugify(text) || 'clip';
  const ts = timestamp(createdAt || Date.now());
  const extension = (ext || 'wav').replace(/^\./, '');
  return `${ts}_${voiceSlug}_${textSlug}.${extension}`;
}

export function extFromMime(mime) {
  if (!mime) return 'wav';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a';
  return 'wav';
}
