import { listAudio, getAudio, deleteAudio } from './db.js';
import { buildFilename, extFromMime } from './filename.js';

let currentAudio = null;
let currentAudioId = null;
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

function syncVaultPlayButtons() {
  const playingNow = !!currentAudio && !currentAudio.paused;
  document.querySelectorAll('#vault-list .archive-play').forEach((btn) => {
    const active = playingNow && btn.dataset.audioId === currentAudioId;
    btn.classList.toggle('is-playing', active);
    const label = btn.querySelector('span');
    if (label) label.textContent = active ? 'Pause' : 'Play';
  });
}

export async function renderVault(container) {
  if (!container) return;
  const token = ++renderToken;
  container.innerHTML = '';

  for (let i = 0; i < 2; i += 1) {
    const sk = document.createElement('div');
    sk.className = 'skeleton-row-tall';
    sk.style.height = '84px';
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
    error.textContent = 'Could not read audio vault';
    container.appendChild(error);
    return;
  }

  if (token !== renderToken) return;
  container.innerHTML = '';

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'vault-empty';
    empty.textContent = 'No audio saved yet. Synthesize speech in Studio to keep playable clips offline.';
    container.appendChild(empty);
    return;
  }

  for (const meta of items) {
    const card = document.createElement('article');
    card.className = 'archive-item';
    card.dataset.audioId = meta.id;
    card.dataset.search = `${meta.text || ''} ${meta.voiceName || ''} ${meta.filename || ''}`.toLowerCase();

    const title = document.createElement('h3');
    title.className = 'archive-item-title';
    title.title = meta.filename;
    const snippet = (meta.text || '').trim();
    title.textContent = snippet ? snippet : meta.filename;

    const metaLine = document.createElement('p');
    metaLine.className = 'archive-item-meta';
    metaLine.textContent = `${meta.voiceName || 'Voice'} · ${formatDuration(meta.duration)} · ${formatDate(meta.createdAt)}`;

    const actions = document.createElement('div');
    actions.className = 'archive-item-actions';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn-secondary archive-play';
    playBtn.dataset.audioId = meta.id;
    playBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg><span>Play</span>';
    playBtn.addEventListener('click', () => {
      if (currentAudioId === meta.id && currentAudio) {
        togglePlayPause();
      } else {
        replay(meta.id);
      }
    });

    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    dlBtn.className = 'btn-secondary archive-download';
    dlBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Save</span>';
    dlBtn.addEventListener('click', () => download(meta.id));

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-button archive-delete';
    delBtn.setAttribute('aria-label', `Delete ${meta.filename}`);
    delBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    delBtn.addEventListener('click', async () => {
      if (currentAudioId === meta.id) stopVaultPlayback();
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
  syncVaultPlayButtons();
}

export async function replay(id) {
  const blob = await getAudio(id);
  if (!blob) return;
  if (typeof window !== 'undefined' && window.__VOX_BRIDGE && typeof window.__VOX_BRIDGE.pauseMainPlayer === 'function') {
    window.__VOX_BRIDGE.pauseMainPlayer();
  }
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = URL.createObjectURL(blob);
  if (!currentAudio) {
    currentAudio = new Audio();
    currentAudio.addEventListener('ended', syncVaultPlayButtons);
    currentAudio.addEventListener('pause', syncVaultPlayButtons);
    currentAudio.addEventListener('play', syncVaultPlayButtons);
  }
  currentAudioId = id;
  currentAudio.dataset.audioId = id;
  currentAudio.src = currentObjectUrl;
  await currentAudio.play();
  syncVaultPlayButtons();
  notify();
}

export function stopVaultPlayback() {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
  currentAudioId = null;
  syncVaultPlayButtons();
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
  syncVaultPlayButtons();
  notify();
}

export function isPlaying() {
  return !!currentAudio && !currentAudio.paused;
}

export function getCurrentId() {
  return currentAudio ? currentAudio.dataset.audioId || null : null;
}
