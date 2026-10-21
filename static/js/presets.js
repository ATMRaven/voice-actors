const STORAGE_KEY = 'nas.presets';

export const BUILTIN_PRESETS = [
  { id: 'builtin-narration', name: 'Narration', text: 'In the quiet hours before dawn, the city held its breath.', builtin: true },
  { id: 'builtin-ad', name: 'Ad Read', text: 'Introducing the studio that fits in your pocket. Try it today.', builtin: true },
  { id: 'builtin-audiobook', name: 'Audiobook', text: 'Chapter One. The road bent north, and the light began to fail.', builtin: true }
];

function readCustom() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeCustom(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listPresets() {
  return [...BUILTIN_PRESETS, ...readCustom()];
}

export function addPreset(name, text) {
  const trimmedName = String(name || '').trim();
  const trimmedText = String(text || '').trim();
  if (!trimmedName) throw new Error('Preset name is required');
  if (!trimmedText) throw new Error('Preset text is required');
  const custom = readCustom();
  const preset = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName.slice(0, 60),
    text: trimmedText.slice(0, 4000),
    builtin: false
  };
  custom.push(preset);
  writeCustom(custom);
  return preset;
}

export function removePreset(id) {
  const custom = readCustom().filter((p) => p.id !== id);
  writeCustom(custom);
}

export function getPreset(id) {
  return listPresets().find((p) => p.id === id) || null;
}
