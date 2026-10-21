import { openPalette, closePalette, isPaletteOpen } from './palette.js';

function isTextEntry(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    return ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(type);
  }
  return el.isContentEditable === true;
}

export function initKeys({ onPlayPause, onDownload, onEscape }) {
  document.addEventListener('keydown', (event) => {
    const mod = event.ctrlKey || event.metaKey;

    if (mod && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (isPaletteOpen()) closePalette();
      else openPalette();
      return;
    }

    if (mod && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (typeof onDownload === 'function') onDownload();
      return;
    }

    if (event.key === 'Escape') {
      if (isPaletteOpen()) {
        event.preventDefault();
        closePalette();
        return;
      }
      if (typeof onEscape === 'function') onEscape();
      return;
    }

    if (event.code === 'Space' && !isTextEntry(document.activeElement)) {
      event.preventDefault();
      if (typeof onPlayPause === 'function') onPlayPause();
    }
  });
}
