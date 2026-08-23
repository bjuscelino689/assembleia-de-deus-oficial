import fs from "fs";
import path from "path";

function findBibleFilePath(): string | null {
  const candidates = [
    path.join(process.cwd(), "data", "biblia_almeida.json"),
    path.join(process.cwd(), "public", "biblia_almeida.json"),
    path.join(process.cwd(), "dist", "biblia_almeida.json"),
    path.join(__dirname, "data", "biblia_almeida.json"),
    path.join(__dirname, "..", "data", "biblia_almeida.json"),
    path.join(__dirname, "..", "public", "biblia_almeida.json")
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let bibleData: Array<{ abbrev: string; name: string; chapters: string[][] }> | null = null;

export function getBibleData() {
  if (!bibleData) {
    const filePath = findBibleFilePath();
    if (filePath && fs.existsSync(filePath)) {
      try {
        let raw = fs.readFileSync(filePath, "utf-8");
        // Remove BOM UTF-8 se presente
        if (raw.charCodeAt(0) === 0xFEFF) {
          raw = raw.slice(1);
        }
        bibleData = JSON.parse(raw);
      } catch (err) {
        console.error("Erro ao ler biblia_almeida.json:", err);
      }
    }
  }
  return bibleData;
}

// Normaliza strings para comparação (remove acentos, pontuações, minúsculas)
function normalizeName(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Mapa exato de nomes para abreviações oficiais no JSON
const EXACT_BOOK_MAP: Record<string, string> = {
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

export function getChapterVerses(bookNameOrAbbrev: string, chapterNumber: number): { num: number; text: string }[] | null {
  const bible = getBibleData();
  if (!bible || !Array.isArray(bible)) return null;

  const rawTrimmed = (bookNameOrAbbrev || "").trim();
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
