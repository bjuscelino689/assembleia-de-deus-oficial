// Gerenciador de Armazenamento de Vídeos Ultra-Resiliente com IndexedDB e Cache de Memória
// Suporta arquivos de alta resolução de até centenas de Megabytes sem os limites do localStorage.
// Garante que vídeos gravados no app ou importados da galeria do celular NUNCA sumam e sempre abram instantaneamente.

const DB_NAME = 'AssembleiaDeDeusVideosDB';
const DB_VERSION = 4;
const STORE_VIDEOS = 'church_videos_store';

export interface StoredVideoRecord {
  id: string;
  title: string;
  author: string;
  blob?: Blob;
  arrayBuffer?: ArrayBuffer;
  dataUrl?: string;
  thumbnailUrl?: string;
  mimeType: string;
  duration?: string;
  timestamp: number;
  serverUrl?: string;
  size: number;
}

let dbInstance: IDBDatabase | null = null;
const videoMemoryRecords: Map<string, StoredVideoRecord> = new Map();
const videoBlobUrlCache: Map<string, string> = new Map();
const videoThumbnailCache: Map<string, string> = new Map();

function openVideosDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VIDEOS)) {
        db.createObjectStore(STORE_VIDEOS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        try { dbInstance?.close(); } catch (e) {}
        dbInstance = null;
      };
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Gera uma miniatura (thumbnail) do vídeo a partir do Blob
 */
export function generateVideoThumbnail(videoBlob: Blob | File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { URL.revokeObjectURL(url); } catch (e) {}
          resolve('');
        }
      }, 4000);

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.5, video.duration ? video.duration / 2 : 0.5);
        } catch (e) {
          video.currentTime = 0;
        }
      };

      video.onseeked = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const w = video.videoWidth || 480;
          const h = video.videoHeight || 270;
          canvas.width = Math.min(w, 640);
          canvas.height = Math.round((canvas.width / w) * h) || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.82);
            try { URL.revokeObjectURL(url); } catch (e) {}
            resolve(thumbUrl);
            return;
          }
        } catch (e) {}
        try { URL.revokeObjectURL(url); } catch (e) {}
        resolve('');
      };

      video.onerror = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        try { URL.revokeObjectURL(url); } catch (e) {}
        resolve('');
      };

      video.load();
    } catch (e) {
      resolve('');
    }
  });
}

/**
 * Salva um registro completo de vídeo no IndexedDB local do dispositivo
 */
export async function saveVideoRecordLocally(record: StoredVideoRecord): Promise<boolean> {
  if (!record || !record.id) return false;

  // Garante cache de miniaturas
  if (record.thumbnailUrl) {
    videoThumbnailCache.set(record.id, record.thumbnailUrl);
    if (record.serverUrl) videoThumbnailCache.set(record.serverUrl, record.thumbnailUrl);
  }

  // Se tiver blob, converte também para ArrayBuffer para persistência garantida em iOS Safari / Android
  let serializableRecord = { ...record };

  if (record.blob && !record.arrayBuffer) {
    try {
      const buffer = await record.blob.arrayBuffer();
      serializableRecord.arrayBuffer = buffer;
    } catch (e) {}
  }

  // Registra no cache de memória
  videoMemoryRecords.set(record.id, serializableRecord);
  if (record.serverUrl) {
    videoMemoryRecords.set(record.serverUrl, serializableRecord);
  }

  // Cria e armazena o ObjectURL ativo
  if (record.blob || serializableRecord.arrayBuffer) {
    try {
      const blobToUse = record.blob || new Blob([serializableRecord.arrayBuffer!], { type: record.mimeType || 'video/mp4' });
      const newUrl = URL.createObjectURL(blobToUse);
      videoBlobUrlCache.set(record.id, newUrl);
      if (record.serverUrl) {
        videoBlobUrlCache.set(record.serverUrl, newUrl);
      }
    } catch (e) {}
  }

  // Grava no IndexedDB
  try {
    const db = await openVideosDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_VIDEOS, 'readwrite');
        const store = tx.objectStore(STORE_VIDEOS);
        
        // Remove referências complexas que poderiam falhar no Structured Clone
        const dbSafeRecord = {
          id: serializableRecord.id,
          title: serializableRecord.title,
          author: serializableRecord.author,
          arrayBuffer: serializableRecord.arrayBuffer,
          thumbnailUrl: serializableRecord.thumbnailUrl,
          dataUrl: serializableRecord.dataUrl,
          mimeType: serializableRecord.mimeType || 'video/mp4',
          duration: serializableRecord.duration || '',
          timestamp: serializableRecord.timestamp || Date.now(),
          serverUrl: serializableRecord.serverUrl,
          size: serializableRecord.size || 0
        };

        store.put(dbSafeRecord);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(true);
      } catch (err) {
        resolve(true);
      }
    });
  } catch (e) {
    console.warn('[IndexedDB Videos] Erro ao salvar vídeo no IndexedDB:', e);
    return true;
  }
}

/**
 * Recupera todos os registros de vídeos armazenados no IndexedDB local
 */
export async function getAllVideoRecordsLocally(): Promise<StoredVideoRecord[]> {
  try {
    const db = await openVideosDB();
    const diskRecords: StoredVideoRecord[] = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_VIDEOS, 'readonly');
        const store = tx.objectStore(STORE_VIDEOS);
        const req = store.getAll();
        req.onsuccess = () => {
          const records = req.result as StoredVideoRecord[] | undefined;
          resolve(Array.isArray(records) ? records : []);
        };
        req.onerror = () => resolve([]);
      } catch (err) {
        resolve([]);
      }
    });

    // Mescla registros do disco com o cache de memória
    diskRecords.forEach(r => {
      if (r && r.id) {
        let blob = r.blob;
        if (!blob && r.arrayBuffer) {
          blob = new Blob([r.arrayBuffer], { type: r.mimeType || 'video/mp4' });
          r.blob = blob;
        }

        if (!videoMemoryRecords.has(r.id)) {
          videoMemoryRecords.set(r.id, r);
        }
        if (r.serverUrl && !videoMemoryRecords.has(r.serverUrl)) {
          videoMemoryRecords.set(r.serverUrl, r);
        }
        if (r.thumbnailUrl) {
          videoThumbnailCache.set(r.id, r.thumbnailUrl);
          if (r.serverUrl) videoThumbnailCache.set(r.serverUrl, r.thumbnailUrl);
        }
        if (blob && !videoBlobUrlCache.has(r.id)) {
          try {
            const url = URL.createObjectURL(blob);
            videoBlobUrlCache.set(r.id, url);
            if (r.serverUrl) videoBlobUrlCache.set(r.serverUrl, url);
          } catch (e) {}
        }
      }
    });

    return Array.from(videoMemoryRecords.values());
  } catch (e) {
    return Array.from(videoMemoryRecords.values());
  }
}

/**
 * Busca o registro completo de um vídeo pelo ID ou ServerUrl
 */
export async function findVideoRecord(idOrUrl?: string): Promise<StoredVideoRecord | null> {
  if (!idOrUrl || typeof idOrUrl !== 'string') return null;
  const cleanKey = idOrUrl.replace('idb://', '').trim();

  // 1. Memória
  if (videoMemoryRecords.has(cleanKey)) {
    return videoMemoryRecords.get(cleanKey) || null;
  }

  // 2. IndexedDB
  try {
    const db = await openVideosDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_VIDEOS, 'readonly');
        const store = tx.objectStore(STORE_VIDEOS);
        const req = store.get(cleanKey);
        req.onsuccess = () => {
          let rec = req.result as StoredVideoRecord | undefined;
          if (rec) {
            if (!rec.blob && rec.arrayBuffer) {
              rec.blob = new Blob([rec.arrayBuffer], { type: rec.mimeType || 'video/mp4' });
            }
            videoMemoryRecords.set(cleanKey, rec);
            resolve(rec);
          } else {
            // Busca alternativa
            const allReq = store.getAll();
            allReq.onsuccess = () => {
              const all = allReq.result as StoredVideoRecord[] | undefined;
              const match = (all || []).find(r => r && (r.id === cleanKey || r.serverUrl === cleanKey));
              if (match) {
                if (!match.blob && match.arrayBuffer) {
                  match.blob = new Blob([match.arrayBuffer], { type: match.mimeType || 'video/mp4' });
                }
                videoMemoryRecords.set(cleanKey, match);
                resolve(match);
              } else {
                resolve(null);
              }
            };
            allReq.onerror = () => resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  } catch (e) {
    return null;
  }
}

/**
 * Retorna a miniatura do vídeo se disponível
 */
export function getVideoThumbnail(idOrUrl?: string): string {
  if (!idOrUrl) return '';
  const cleanKey = idOrUrl.replace('idb://', '').trim();
  if (videoThumbnailCache.has(cleanKey)) {
    return videoThumbnailCache.get(cleanKey) || '';
  }
  const mem = videoMemoryRecords.get(cleanKey);
  return mem?.thumbnailUrl || '';
}

/**
 * Recupera ou gera a melhor URL de reprodução direta para um vídeo
 */
export async function resolveVideoPlaybackUrl(idOrUrl?: string, secondaryIdOrUrl?: string): Promise<string> {
  const target = (idOrUrl || secondaryIdOrUrl || '').trim();
  if (!target) return '';

  const cleanId = target.replace('idb://', '').trim();
  const secondaryClean = (secondaryIdOrUrl || '').replace('idb://', '').trim();

  // 1. Verifica no cache de Blob URLs ativos (reprodução imediata a 0ms)
  if (videoBlobUrlCache.has(cleanId)) {
    const cachedUrl = videoBlobUrlCache.get(cleanId);
    if (cachedUrl) return cachedUrl;
  }
  if (secondaryClean && videoBlobUrlCache.has(secondaryClean)) {
    const cachedUrl = videoBlobUrlCache.get(secondaryClean);
    if (cachedUrl) return cachedUrl;
  }

  // 2. Verifica no cache de memória
  const memoryRec = videoMemoryRecords.get(cleanId) || (secondaryClean ? videoMemoryRecords.get(secondaryClean) : null);
  if (memoryRec) {
    if (memoryRec.blob) {
      try {
        const url = URL.createObjectURL(memoryRec.blob);
        videoBlobUrlCache.set(cleanId, url);
        if (memoryRec.id) videoBlobUrlCache.set(memoryRec.id, url);
        if (memoryRec.serverUrl) videoBlobUrlCache.set(memoryRec.serverUrl, url);
        return url;
      } catch (e) {}
    }
    if (memoryRec.arrayBuffer) {
      try {
        const blob = new Blob([memoryRec.arrayBuffer], { type: memoryRec.mimeType || 'video/mp4' });
        const url = URL.createObjectURL(blob);
        videoBlobUrlCache.set(cleanId, url);
        if (memoryRec.id) videoBlobUrlCache.set(memoryRec.id, url);
        return url;
      } catch (e) {}
    }
    if (memoryRec.serverUrl) return memoryRec.serverUrl;
    if (memoryRec.dataUrl) return memoryRec.dataUrl;
  }

  // 3. Busca no IndexedDB
  const diskRec = await findVideoRecord(cleanId) || (secondaryClean ? await findVideoRecord(secondaryClean) : null);
  if (diskRec) {
    if (diskRec.blob) {
      try {
        const url = URL.createObjectURL(diskRec.blob);
        videoBlobUrlCache.set(cleanId, url);
        if (diskRec.id) videoBlobUrlCache.set(diskRec.id, url);
        if (diskRec.serverUrl) videoBlobUrlCache.set(diskRec.serverUrl, url);
        return url;
      } catch (e) {}
    }
    if (diskRec.arrayBuffer) {
      try {
        const blob = new Blob([diskRec.arrayBuffer], { type: diskRec.mimeType || 'video/mp4' });
        const url = URL.createObjectURL(blob);
        videoBlobUrlCache.set(cleanId, url);
        if (diskRec.id) videoBlobUrlCache.set(diskRec.id, url);
        return url;
      } catch (e) {}
    }
    if (diskRec.serverUrl) return diskRec.serverUrl;
    if (diskRec.dataUrl) return diskRec.dataUrl;
  }

  // 4. Se for uma URL direta HTTP/HTTPS ou /uploads/, retorna a URL original
  if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('/uploads/') || target.startsWith('data:')) {
    return target;
  }

  if (secondaryIdOrUrl && (secondaryIdOrUrl.startsWith('http://') || secondaryIdOrUrl.startsWith('https://') || secondaryIdOrUrl.startsWith('/uploads/') || secondaryIdOrUrl.startsWith('data:'))) {
    return secondaryIdOrUrl;
  }

  return target;
}

/**
 * Remove um vídeo do armazenamento local
 */
export async function deleteVideoRecordLocally(id: string): Promise<void> {
  const cleanId = id.replace('idb://', '').trim();
  
  if (videoBlobUrlCache.has(cleanId)) {
    try {
      URL.revokeObjectURL(videoBlobUrlCache.get(cleanId)!);
    } catch (e) {}
    videoBlobUrlCache.delete(cleanId);
  }

  videoThumbnailCache.delete(cleanId);

  const rec = videoMemoryRecords.get(cleanId);
  if (rec?.serverUrl) {
    videoMemoryRecords.delete(rec.serverUrl);
    videoBlobUrlCache.delete(rec.serverUrl);
    videoThumbnailCache.delete(rec.serverUrl);
  }

  videoMemoryRecords.delete(cleanId);

  try {
    const db = await openVideosDB();
    const tx = db.transaction(STORE_VIDEOS, 'readwrite');
    tx.objectStore(STORE_VIDEOS).delete(cleanId);
  } catch (e) {}
}
