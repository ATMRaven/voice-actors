const DB_NAME = 'neural-audio-vault';
const DB_VERSION = 1;
const STORE_AUDIO = 'audio';
const STORE_META = 'meta';

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO);
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        const meta = db.createObjectStore(STORE_META, { keyPath: 'id' });
        meta.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db, stores, mode) {
  return db.transaction(stores, mode);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAudio(meta, blob) {
  const db = await openDB();
  const t = tx(db, [STORE_AUDIO, STORE_META], 'readwrite');
  t.objectStore(STORE_AUDIO).put(blob, meta.id);
  t.objectStore(STORE_META).put(meta);
  await new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  return meta.id;
}

export async function getAudio(id) {
  const db = await openDB();
  const t = tx(db, [STORE_AUDIO], 'readonly');
  return reqToPromise(t.objectStore(STORE_AUDIO).get(id));
}

export async function getMeta(id) {
  const db = await openDB();
  const t = tx(db, [STORE_META], 'readonly');
  return reqToPromise(t.objectStore(STORE_META).get(id));
}

export async function listAudio() {
  const db = await openDB();
  const t = tx(db, [STORE_META], 'readonly');
  const all = await reqToPromise(t.objectStore(STORE_META).getAll());
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteAudio(id) {
  const db = await openDB();
  const t = tx(db, [STORE_AUDIO, STORE_META], 'readwrite');
  t.objectStore(STORE_AUDIO).delete(id);
  t.objectStore(STORE_META).delete(id);
  await new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function clearAll() {
  const db = await openDB();
  const t = tx(db, [STORE_AUDIO, STORE_META], 'readwrite');
  t.objectStore(STORE_AUDIO).clear();
  t.objectStore(STORE_META).clear();
  await new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
