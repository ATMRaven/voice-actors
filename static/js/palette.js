let root = null;
let input = null;
let list = null;
let voices = [];
let filtered = [];
let activeIndex = 0;
let onChoose = null;
let lastFocused = null;

export function initPalette({ voicesProvider, onSelect }) {
  root = document.getElementById('command-palette');
  input = document.getElementById('palette-input');
  list = document.getElementById('palette-list');
  onChoose = onSelect;

  if (!root || !input || !list) return;

  input.addEventListener('input', () => {
    applyFilter(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      chooseActive();
    }
  });

  root.addEventListener('click', (event) => {
    if (event.target === root) closePalette();
  });

  root.dataset.voicesProvider = 'true';
  root._voicesProvider = voicesProvider;
}

function applyFilter(query) {
  const q = String(query || '').trim().toLowerCase();
  filtered = voices.filter((v) => {
    if (!q) return true;
    return (
      String(v.name || '').toLowerCase().includes(q) ||
      String(v.id || '').toLowerCase().includes(q) ||
      String(v.language || '').toLowerCase().includes(q)
    );
  });
  activeIndex = 0;
  renderRows();
}

function renderRows() {
  if (!list) return;
  list.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'palette-empty';
    empty.textContent = 'No voices match';
    list.appendChild(empty);
    return;
  }

  filtered.forEach((voice, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'palette-row';
    row.dataset.voiceId = voice.id;
    row.title = voice.name;
    if (index === activeIndex) row.classList.add('is-active');

    const label = document.createElement('span');
    label.className = 'palette-row-label';
    label.textContent = voice.name;

    const meta = document.createElement('span');
    meta.className = 'palette-row-meta';
    meta.textContent = voice.language || '';

    row.appendChild(label);
    row.appendChild(meta);
    row.addEventListener('click', () => {
      activeIndex = index;
      chooseActive();
    });
    list.appendChild(row);
  });
}

function moveActive(delta) {
  if (filtered.length === 0) return;
  activeIndex = (activeIndex + delta + filtered.length) % filtered.length;
  renderRows();
  const active = list.querySelector('.palette-row.is-active');
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
}

function chooseActive() {
  const voice = filtered[activeIndex];
  if (!voice) return;
  if (typeof onChoose === 'function') onChoose(voice.id);
  closePalette();
}

export async function openPalette() {
  if (!root) return;
  lastFocused = document.activeElement;
  root.hidden = false;
  root.setAttribute('aria-hidden', 'false');
  input.value = '';
  if (list) list.innerHTML = '<div class="skeleton-row" style="height:48px;"></div><div class="skeleton-row" style="height:48px;"></div><div class="skeleton-row" style="height:48px;"></div>';
  const provider = root._voicesProvider;
  voices = typeof provider === 'function' ? await provider() : [];
  applyFilter('');
  input.focus();
}

export function closePalette() {
  if (!root) return;
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');
  if (lastFocused && lastFocused.focus) lastFocused.focus();
}

export function isPaletteOpen() {
  return !!root && root.hidden === false;
}
