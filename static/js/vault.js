import { listAudio, getAudio, deleteAudio } from './db.js';
import { buildFilename, extFromMime } from './filename.js';

let currentAudio = null;
let currentObjectUrl = null;
let onStateChange = null;
let renderToken = 0;

export function setVaultStateListener(fn) {
  onStateChange = fn;
}

function notify() {
  if (typeof onStateChange === 'function') onStateChange();
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${String(rest).padStart(2, '0')}`;
}

function formatDate(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function renderVault(container) {
  if (!container) return;
  const token = ++renderToken;
  container.innerHTML = '';

  for (let i = 0; i < 3; i += 1) {
    const sk = document.createElement('div');
    sk.className = 'skeleton-row-tall';
    sk.style.height = '64px';
    container.appendChild(sk);
  }

  let items = [];
  try {
    items = await listAudio();
  } catch (err) {
    if (token !== renderToken) return;
    container.innerHTML = '';
    const error = document.createElement('p');
    error.className = 'vault-error';
    error.textContent = 'Could not read vault';
    container.appendChild(error);
    return;
  }

  if (token !== renderToken) return;
  container.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'vault-empty';
    empty.textContent = 'No audio yet. Generate a clip in Studio.';
    container.appendChild(empty);
    return;
  }

  for (const meta of items) {
    const card = document.createElement('article');
    card.className = 'archive-item';
    card.dataset.audioId = meta.id;

    const title = document.createElement('h3');
    title.className = 'archive-item-title';
    title.title = meta.filename;
    title.textContent = meta.filename;

    const metaLine = document.createElement('p');
    metaLine.className = 'archive-item-meta';
    metaLine.textContent = `${meta.voiceName || 'voice'} · ${formatDuration(meta.duration)} · ${formatDate(meta.createdAt)}`;

    const actions = document.createElement('div');
    actions.className = 'archive-item-actions';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn-secondary archive-play';
    playBtn.textContent = 'Play';
    playBtn.addEventListener('click', () => replay(meta.id));

    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn-secondary archive-download';
    dlBtn.textContent = 'Download';
    dlBtn.addEventListener('click', () => download(meta.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-button archive-delete';
    delBtn.setAttribute('aria-label', `Delete ${meta.filename}`);
    delBtn.textContent = '×';
    delBtn.addEventListener('click', async () => {
      await deleteAudio(meta.id);
      await renderVault(container);
      notify();
    });

    actions.appendChild(playBtn);
    actions.appendChild(dlBtn);
    actions.appendChild(delBtn);

    card.appendChild(title);
    card.appendChild(metaLine);
    card.appendChild(actions);
    container.appendChild(card);
  }
}

export async function replay(id) {
  const blob = await getAudio(id);
  if (!blob) return;
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(blob);
  if (!currentAudio) {
    currentAudio = new Audio();
  }
  currentAudio.src = currentObjectUrl;
  await currentAudio.play();
  notify();
}

export async function download(id) {
  const blob = await getAudio(id);
  if (!blob) return;
  const items = await listAudio();
  const meta = items.find((m) => m.id === id);
  const filename = meta ? meta.filename : buildFilename({ voice: 'voice', text: 'clip', createdAt: Date.now(), ext: extFromMime(blob.type) });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function togglePlayPause() {
  if (!currentAudio) return;
  if (currentAudio.paused) currentAudio.play();
  else currentAudio.pause();
  notify();
}

export function isPlaying() {
  return !!currentAudio && !currentAudio.paused;
}

export function getCurrentId() {
  return currentAudio ? currentAudio.dataset.audioId || null : null;
}
