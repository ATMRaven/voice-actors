const STORAGE_KEY = 'nas.favorites';
const MAX_FAVORITES = 8;

export function readFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch (err) {
    return [];
  }
}

function writeFavorites(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_FAVORITES)));
}

export function isFavorite(voiceId) {
  return readFavorites().includes(voiceId);
}

export function toggleFavorite(voiceId) {
  const current = readFavorites();
  const next = current.includes(voiceId)
    ? current.filter((v) => v !== voiceId)
    : [...current, voiceId].slice(0, MAX_FAVORITES);
  writeFavorites(next);
  return next;
}

export function renderFavorites(container, voices, currentVoiceId, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  const favorites = readFavorites();
  const resolved = favorites
    .map((id) => voices.find((v) => v.id === id))
    .filter(Boolean);

  if (resolved.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'favorites-empty';
    empty.textContent = 'Pin a voice to keep it here';
    container.appendChild(empty);
    return;
  }

  for (const voice of resolved) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'favorite-chip';
    chip.dataset.voiceId = voice.id;
    chip.title = voice.name;
    const active = voice.id === currentVoiceId;
    chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    if (active) chip.classList.add('is-active');

    const avatar = document.createElement('span');
    avatar.className = 'favorite-chip-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = (voice.name || '?').slice(0, 1).toUpperCase();

    const label = document.createElement('span');
    label.className = 'favorite-chip-label';
    label.textContent = voice.name;

    chip.appendChild(avatar);
    chip.appendChild(label);
    chip.addEventListener('click', () => onSelect(voice.id));
    container.appendChild(chip);
  }
}
