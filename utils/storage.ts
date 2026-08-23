// Utilitário de Armazenamento Local Seguro com Fallback Inteligente

export function safeLocalStorageSet(key: string, value: any): boolean {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Tentando salvar dados essenciais para "${key}"...`);
    try {
      if (Array.isArray(value)) {
        // Se for um array (vídeos, fotos), salva metadados sem base64 para evitar estourar cota do localStorage
        const trimmed = value.map(item => {
          if (item && typeof item === 'object') {
            const copy = { ...item };
            if (typeof copy.url === 'string' && copy.url.length > 50000) {
              copy.url = ''; // A imagem/vídeo real fica segura no IndexedDB e no Firestore
            }
            if (typeof copy.videoUrl === 'string' && copy.videoUrl.length > 50000) {
              copy.videoUrl = '';
            }
            return copy;
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(trimmed));
        return true;
      }
    } catch (e) {
      // Ignora silenciosamente
    }
    return false;
  }
}

export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    return fallback;
  }
}
