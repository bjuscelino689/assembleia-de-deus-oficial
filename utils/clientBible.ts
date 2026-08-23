// Cliente Bíblico robusto para Celulares (Android/iOS) e Computadores
// Armazena e sincroniza os 66 livros e 1.189 capítulos da Bíblia Almeida

export interface RawBibleBook {
  abbrev: string;
  name: string;
  chapters: string[][];
}

let cachedBibleData: RawBibleBook[] | null = null;
let isLoadingBible = false;
const listeners: Array<(data: RawBibleBook[]) => void> = [];

// IndexedDB Helper para persistência ultra-rápida no celular
const DB_NAME = 'ad_bible_offline_db';
const STORE_NAME = 'books_store';
const DB_VERSION = 1;

function openBibleDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'abbrev' });
        }
      };
      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function getBibleFromIndexedDB(): Promise<RawBibleBook[] | null> {
  try {
    const db = await openBibleDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result;
        if (Array.isArray(results) && results.length >= 66) {
          resolve(results);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function saveBibleToIndexedDB(books: RawBibleBook[]): Promise<void> {
  try {
    const db = await openBibleDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const book of books) {
      store.put(book);
    }
  } catch (e) {
    // ignore
  }
}

function normalizeName(str: string): string {
  return (str || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const EXACT_BOOK_MAP: Record<string, string> = {
  "genesis": "gn",
  "exodo": "ex",
  "levitico": "lv",
  "numeros": "nm",
  "deuteronomio": "dt",
  "josue": "js",
  "juizes": "jz",
  "rute": "rt",
  "1 samuel": "1sm",
  "2 samuel": "2sm",
  "1 reis": "1rs",
  "2 reis": "2rs",
  "1 cronicas": "1cr",
  "2 cronicas": "2cr",
  "esdras": "ed",
  "neemias": "ne",
  "ester": "et",
  "jo": "jó",
  "jó": "jó",
  "salmos": "sl",
  "salmo": "sl",
  "proverbios": "pv",
  "eclesiastes": "ec",
  "cantares": "ct",
  "canticos": "ct",
  "isaias": "is",
  "jeremias": "jr",
  "lamentacoes": "lm",
  "lamentacoes de jeremias": "lm",
  "ezequiel": "ez",
  "daniel": "dn",
  "oseias": "os",
  "joel": "jl",
  "amos": "am",
  "obadias": "ob",
  "jonas": "jn",
  "miqueias": "mq",
  "naum": "na",
  "habacuque": "hc",
  "sofonias": "sf",
  "ageu": "ag",
  "zacarias": "zc",
  "malaquias": "ml",
  "mateus": "mt",
  "marcos": "mc",
  "lucas": "lc",
  "joao": "jo",
  "atos": "atos",
  "romanos": "rm",
  "1 corintios": "1co",
  "2 corintios": "2co",
  "galatas": "gl",
  "efesios": "ef",
  "filipenses": "fp",
  "colossenses": "cl",
  "1 tessalonicenses": "1ts",
  "2 tessalonicenses": "2ts",
  "1 timoteo": "1tm",
  "2 timoteo": "2tm",
  "tito": "tt",
  "filemom": "fm",
  "hebreus": "hb",
  "tiago": "tg",
  "1 pedro": "1pe",
  "2 pedro": "2pe",
  "1 joao": "1jo",
  "2 joao": "2jo",
  "3 joao": "3jo",
  "judas": "jd",
  "apocalipse": "ap"
};

// Limpa completamente todos os dados da Bíblia em cache do celular e recarrega do zero
export async function purgeAndReinstallBible(): Promise<RawBibleBook[]> {
  cachedBibleData = null;
  isLoadingBible = false;
  listeners.length = 0;

  try {
    localStorage.removeItem('ad_full_bible_v1');
    localStorage.removeItem('ad_bible_cache');
    sessionStorage.clear();
  } catch (e) {}

  try {
    const db = await openBibleDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    }
  } catch (e) {}

  // Recarrega a Bíblia completa limpa
  return await fetchFullBible(true);
}

export async function fetchFullBible(forceRefresh = false): Promise<RawBibleBook[]> {
  if (!forceRefresh && cachedBibleData && cachedBibleData.length > 0) {
    return cachedBibleData;
  }

  // 1. Tenta IndexedDB local se não for forceRefresh
  if (!forceRefresh) {
    const idbData = await getBibleFromIndexedDB();
    if (idbData && idbData.length >= 66) {
      cachedBibleData = idbData;
      return idbData;
    }
  }

  if (isLoadingBible) {
    return new Promise((resolve) => {
      listeners.push(resolve);
    });
  }

  isLoadingBible = true;

  try {
    // Busca o arquivo JSON estático
    const res = await fetch(`/biblia_almeida.json?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        cachedBibleData = data;
        saveBibleToIndexedDB(data).catch(() => {});
        listeners.forEach(fn => fn(data));
        listeners.length = 0;
        isLoadingBible = false;
        return data;
      }
    }
  } catch (err) {
    console.warn("Erro ao carregar /biblia_almeida.json:", err);
  }

  isLoadingBible = false;
  return [];
}

export function getClientChapterVerses(
  bible: RawBibleBook[] | null,
  bookName: string, 
  chapterNumber: number
): { num: number; text: string }[] | null {
  if (!bible || !Array.isArray(bible) || bible.length === 0) return null;

  const rawTrimmed = (bookName || '').trim();
  const norm = normalizeName(rawTrimmed);
  const targetAbbrev = EXACT_BOOK_MAP[rawTrimmed.toLowerCase()] || EXACT_BOOK_MAP[norm] || norm;

  const foundBook = bible.find(b => {
    return b.abbrev.toLowerCase() === targetAbbrev.toLowerCase() ||
           b.name.toLowerCase() === rawTrimmed.toLowerCase() ||
           normalizeName(b.name) === norm;
  });

  if (!foundBook) return null;

  const chIndex = chapterNumber - 1;
  if (chIndex < 0 || chIndex >= foundBook.chapters.length) return null;

  const versesArray = foundBook.chapters[chIndex];
  if (!Array.isArray(versesArray)) return null;

  return versesArray.map((verseText, index) => ({
    num: index + 1,
    text: verseText.trim()
  }));
}
