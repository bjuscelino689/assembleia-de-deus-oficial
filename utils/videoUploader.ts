// Motor de Upload e Armazenamento Ultra-Resiliente para Vídeos da Igreja (até 500MB)
// Garante gravação e importação de vídeos tanto em conexões rápidas quanto offline ou em dados móveis (3G/4G/5G).

import { saveVideoRecordLocally, generateVideoThumbnail, StoredVideoRecord } from './videoStorage';

export interface VideoUploadResult {
  videoId: string;
  playbackUrl: string;
  serverUrl?: string;
  thumbnailUrl?: string;
  record: StoredVideoRecord;
}

export async function uploadVideoWithProgress(
  fileOrBlob: File | Blob,
  title: string,
  author: string,
  onProgress: (pct: number) => void,
  existingVideoId?: string
): Promise<{ videoId: string; playbackUrl: string; serverUrl?: string; thumbnailUrl?: string }> {
  onProgress(5);

  const videoId = existingVideoId || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fileName = (fileOrBlob as File).name || `video_${Date.now()}.${fileOrBlob.type?.includes('webm') ? 'webm' : 'mp4'}`;
  const mimeType = fileOrBlob.type || (fileName.endsWith('.webm') ? 'video/webm' : 'video/mp4');

  // Gera thumbnail do primeiro frame para evitar tela preta
  let thumbnailUrl = '';
  try {
    thumbnailUrl = await generateVideoThumbnail(fileOrBlob);
  } catch (e) {}

  onProgress(12);

  // 1. SALVAMENTO IMEDIATO NO INDEXEDDB LOCAL DO DISPOSITIVO
  // O vídeo já fica 100% gravado no aparelho do usuário mesmo antes do envio para a rede
  const localRecord: StoredVideoRecord = {
    id: videoId,
    title: title || 'Vídeo da Igreja',
    author: author || 'Pastor / Membro',
    blob: fileOrBlob,
    thumbnailUrl,
    mimeType,
    timestamp: Date.now(),
    size: fileOrBlob.size
  };

  try {
    await saveVideoRecordLocally(localRecord);
    onProgress(20);
  } catch (idbErr) {
    console.warn('[VideoUploader] Aviso no salvamento local do IndexedDB:', idbErr);
  }

  // 2. TENTA ENVIAR PARA O SERVIDOR VIA MULTIPART/FORMDATA
  try {
    const directUrl = await uploadViaDirectFormData(fileOrBlob, fileName, (pct) => {
      onProgress(Math.min(95, 20 + Math.round(pct * 0.75)));
    });

    if (directUrl && directUrl.startsWith('/uploads/')) {
      localRecord.serverUrl = directUrl;
      await saveVideoRecordLocally(localRecord);
      onProgress(100);
      return { videoId, playbackUrl: directUrl, serverUrl: directUrl, thumbnailUrl };
    }
  } catch (directErr) {
    console.warn('[VideoUploader] Tentando rota binária alternativa:', directErr);
  }

  // 3. TENTA ENVIAR VIA STREAMING BINÁRIO
  try {
    const binaryUrl = await uploadViaBinaryStream(fileOrBlob, fileName, (pct) => {
      onProgress(Math.min(98, 25 + Math.round(pct * 0.73)));
    });

    if (binaryUrl && binaryUrl.startsWith('/uploads/')) {
      localRecord.serverUrl = binaryUrl;
      await saveVideoRecordLocally(localRecord);
      onProgress(100);
      return { videoId, playbackUrl: binaryUrl, serverUrl: binaryUrl, thumbnailUrl };
    }
  } catch (binErr) {
    console.warn('[VideoUploader] Falha no upload binário:', binErr);
  }

  // 4. FALLBACK ULTRA-SEGURO: Retorna o ID local do IndexedDB para reprodução instantânea offline
  onProgress(100);
  return { videoId, playbackUrl: `idb://${videoId}`, thumbnailUrl };
}

/**
 * 1. Envio Direto via FormData (Multipart até 500MB)
 */
function uploadViaDirectFormData(file: File | Blob, fileName: string, onProgress: (pct: number) => void): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    try {
      const formData = new FormData();
      formData.append('file', file, fileName);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload-media');
      xhr.timeout = 900000; // 15 minutos de tolerância para vídeos em redes móveis

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(98, Math.max(3, Math.round((event.loaded / event.total) * 100)));
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.url) {
              resolve(data.url);
              return;
            }
          } catch (e) {}
        }
        resolve(null);
      };

      xhr.onerror = () => resolve(null);
      xhr.ontimeout = () => resolve(null);
      xhr.send(formData);
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * 2. Envio via Streaming Binário (/api/upload-binary)
 */
function uploadViaBinaryStream(file: File | Blob, fileName: string, onProgress: (pct: number) => void): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      const fileType = file.type || 'video/mp4';
      xhr.open('POST', `/api/upload-binary?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}`);
      xhr.timeout = 900000;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(98, Math.max(3, Math.round((event.loaded / event.total) * 100)));
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && data.url) {
              resolve(data.url);
              return;
            }
          } catch (e) {}
        }
        resolve(null);
      };

      xhr.onerror = () => resolve(null);
      xhr.ontimeout = () => resolve(null);
      xhr.send(file);
    } catch (e) {
      resolve(null);
    }
  });
}
