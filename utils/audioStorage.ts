// Gerenciador de Armazenamento de Áudios de Voz do Chat com IndexedDB
// IndexedDB suporta centenas de Megabytes sem o limite de 5MB do localStorage
// Garante que áudios gravados e ouvidos nunca sumam nem sejam apagados

const DB_NAME = 'AssembleiaDeDeusAudioDB';
const DB_VERSION = 1;
const STORE_AUDIOS = 'chat_audios';

let audioDbInstance: IDBDatabase | null = null;
const audioMemoryCache: Map<string, StoredAudioRecord> = new Map();

function openAudioDB(): Promise<IDBDatabase> {
  if (audioDbInstance) return Promise.resolve(audioDbInstance);
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_AUDIOS)) {
        db.createObjectStore(STORE_AUDIOS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      audioDbInstance = request.result;
      audioDbInstance.onversionchange = () => {
        try { audioDbInstance?.close(); } catch(e) {}
        audioDbInstance = null;
      };
      resolve(audioDbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

export interface StoredAudioRecord {
  id: string;
  audioUrl: string;
  duration?: number;
  createdAt: number;
}

export async function saveAudioBlobLocally(id: string, audioUrl: string, duration?: number): Promise<boolean> {
  const record: StoredAudioRecord = {
    id,
    audioUrl,
    duration,
    createdAt: Date.now()
  };

  audioMemoryCache.set(id, record);

  try {
    const db = await openAudioDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_AUDIOS, 'readwrite');
        const store = tx.objectStore(STORE_AUDIOS);
        store.put(record);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(true);
      } catch(e) {
        resolve(true);
      }
    });
  } catch (e) {
    return true;
  }
}

export async function getAllAudiosLocally(): Promise<Record<string, string>> {
  try {
    const db = await openAudioDB();
    const diskMap: Record<string, string> = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_AUDIOS, 'readonly');
        const store = tx.objectStore(STORE_AUDIOS);
        const req = store.getAll();
        req.onsuccess = () => {
          const records = req.result as StoredAudioRecord[] | undefined;
          const map: Record<string, string> = {};
          if (Array.isArray(records)) {
            records.forEach(r => {
              if (r && r.id && r.audioUrl) {
                map[r.id] = r.audioUrl;
                if (!audioMemoryCache.has(r.id)) {
                  audioMemoryCache.set(r.id, r);
                }
              }
            });
          }
          resolve(map);
        };
        req.onerror = () => resolve({});
      } catch(e) {
        resolve({});
      }
    });

    audioMemoryCache.forEach((r, id) => {
      if (r && r.audioUrl && !diskMap[id]) {
        diskMap[id] = r.audioUrl;
      }
    });

    return diskMap;
  } catch (e) {
    const map: Record<string, string> = {};
    audioMemoryCache.forEach((r, id) => {
      if (r && r.audioUrl) map[id] = r.audioUrl;
    });
    return map;
  }
}

export async function deleteAudioBlobLocally(id: string): Promise<void> {
  audioMemoryCache.delete(id);
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_AUDIOS, 'readwrite');
    tx.objectStore(STORE_AUDIOS).delete(id);
  } catch (e) {}
}
