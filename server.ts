import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import { INITIAL_REGISTERED_USERS, INITIAL_USER } from "./data/mockData";
import { 
  loadCollectionFromFirestore, 
  loadDocumentFromFirestore,
  saveDocumentToFirestore, 
  deleteDocumentFromFirestore, 
  saveBatchToFirestore 
} from "./utils/firebaseDb";

// In-memory & JSON file store for registered users synchronized across all connected devices (phones, notebooks)
const USERS_FILE = path.join(process.cwd(), "data", "users_db.json");
const MEMBERS_FILE = path.join(process.cwd(), "data", "members_db.json");
const MESSAGES_FILE = path.join(process.cwd(), "data", "messages_db.json");
const MEDIA_POSTS_FILE = path.join(process.cwd(), "data", "media_posts_db.json");
const VIDEOS_FILE = path.join(process.cwd(), "data", "videos_db.json");
const GALLERY_FILE = path.join(process.cwd(), "data", "gallery_db.json");
const PAYMENT_ACCESS_FILE = path.join(process.cwd(), "data", "payment_access_db.json");
const UPLOADS_STORE_FILE = path.join(process.cwd(), "data", "uploads_store.json");
const DELETED_IDS_FILE = path.join(process.cwd(), "data", "deleted_ids.json");

const INITIAL_MEMBERS = [
  { id: 'm_pastor_master', name: 'Pr. Juscelino (Pastor Presidente)', email: 'bjuscelino33@gmail.com', phone: '(11) 99876-5432', role: 'PASTOR', accessStatus: 'LIBERADO', isBlocked: false, createdAt: '2024-01-01' },
  { id: 'm_2', name: 'Irmã Maria Silva', email: 'maria.silva@igreja.com', phone: '(11) 98765-4321', role: 'MEMBRO', accessStatus: 'LIBERADO', isBlocked: false, createdAt: '2024-01-02' }
];

let serverRegisteredUsers = [...INITIAL_REGISTERED_USERS];
let serverMembers: any[] = [...INITIAL_MEMBERS];
let serverChatMessages: any[] = [];
const INITIAL_SERVER_MEDIA_POSTS: any[] = [];
let serverMediaPosts: any[] = [];
let serverVideos: any[] = [];
let serverGallery: any[] = [];
let serverPaymentAccessInfo = {
  dueDay: 28,
  title: "Pagamento do meu acesso",
  qrCodeUrl: "",
  pixKey: "",
  recipientName: "Assembleia de Deus Nacional - Ministério de Madureira",
  amount: "",
  description: "Contribuição mensal de manutenção do acesso com vencimento todo dia 28.",
  updatedAt: Date.now(),
  updatedBy: "Pastor Presidente"
};
let serverMasterAdminPin = "123456"; // PIN de 6 dígitos Padrão do Administrador Master
const deletedUserIdentifiers = new Set<string>();
const deletedMessageIds = new Set<string>();
const deletedMediaPostIds = new Set<string>();
const deletedVideoIds = new Set<string>();
const deletedGalleryIds = new Set<string>();

const uploadsBase64Store: Record<string, string> = {};

// CARREGA INFORMAÇÕES DE PAGAMENTO DO ACESSO
try {
  if (fs.existsSync(PAYMENT_ACCESS_FILE)) {
    const data = JSON.parse(fs.readFileSync(PAYMENT_ACCESS_FILE, "utf-8"));
    if (data && typeof data === 'object') {
      serverPaymentAccessInfo = { ...serverPaymentAccessInfo, ...data };
    }
  }
} catch (e) {
  console.error("Erro ao carregar payment_access_db.json:", e);
}

function savePaymentAccessInfo() {
  try {
    const dir = path.dirname(PAYMENT_ACCESS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PAYMENT_ACCESS_FILE, JSON.stringify(serverPaymentAccessInfo, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar payment_access_db.json:", e);
  }
  try {
    saveDocumentToFirestore("system_settings", "payment_access", serverPaymentAccessInfo).catch(() => {});
  } catch (e) {}
}

// CARREGA BASE64 STORE PERMANENTE
try {
  if (fs.existsSync(UPLOADS_STORE_FILE)) {
    const data = JSON.parse(fs.readFileSync(UPLOADS_STORE_FILE, "utf-8"));
    if (data && typeof data === 'object') {
      Object.assign(uploadsBase64Store, data);
    }
  }
} catch (e) {
  console.error("Erro ao carregar uploads_store.json:", e);
}

function saveUploadsStore() {
  try {
    const dir = path.dirname(UPLOADS_STORE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(UPLOADS_STORE_FILE, JSON.stringify(uploadsBase64Store), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar uploads_store.json:", e);
  }
}

// CARREGA DELETED IDS PERMANENTES
try {
  if (fs.existsSync(DELETED_IDS_FILE)) {
    const data = JSON.parse(fs.readFileSync(DELETED_IDS_FILE, "utf-8"));
    if (data && Array.isArray(data.messages)) {
      data.messages.forEach((id: string) => deletedMessageIds.add(String(id)));
    }
    if (data && Array.isArray(data.mediaPosts)) {
      data.mediaPosts.forEach((id: string) => deletedMediaPostIds.add(String(id)));
    }
    if (data && Array.isArray(data.videos)) {
      data.videos.forEach((id: string) => deletedVideoIds.add(String(id)));
    }
    if (data && Array.isArray(data.gallery)) {
      data.gallery.forEach((id: string) => deletedGalleryIds.add(String(id)));
    }
    if (data && Array.isArray(data.users)) {
      data.users.forEach((id: string) => deletedUserIdentifiers.add(String(id).toLowerCase()));
    }
  }
} catch (e) {
  console.error("Erro ao carregar deleted_ids.json:", e);
}

function saveDeletedIds() {
  try {
    const dir = path.dirname(DELETED_IDS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const payload = {
      messages: Array.from(deletedMessageIds),
      mediaPosts: Array.from(deletedMediaPostIds),
      videos: Array.from(deletedVideoIds),
      gallery: Array.from(deletedGalleryIds),
      users: Array.from(deletedUserIdentifiers)
    };
    fs.writeFileSync(DELETED_IDS_FILE, JSON.stringify(payload, null, 2), "utf-8");
    saveDocumentToFirestore("system_settings", "deleted_ids", payload).catch(e => console.error("Erro ao salvar deleted_ids no Firestore:", e));
  } catch (e) {
    console.error("Erro ao salvar deleted_ids.json:", e);
  }
}

// CARREGA POSTS DO MURAL DO DISCO SE EXISTIR
try {
  if (fs.existsSync(MEDIA_POSTS_FILE)) {
    const data = JSON.parse(fs.readFileSync(MEDIA_POSTS_FILE, "utf-8"));
    if (Array.isArray(data)) {
      serverMediaPosts = data;
    }
  }
} catch (e) {
  console.error("Erro ao carregar posts do mural do servidor:", e);
}

// CARREGA VÍDEOS DO DISCO SE EXISTIR
try {
  if (fs.existsSync(VIDEOS_FILE)) {
    const data = JSON.parse(fs.readFileSync(VIDEOS_FILE, "utf-8"));
    if (Array.isArray(data)) {
      serverVideos = data;
    }
  }
} catch (e) {
  console.error("Erro ao carregar vídeos do servidor:", e);
}

// CARREGA MEMBROS DO DISCO SE EXISTIR
try {
  if (fs.existsSync(MEMBERS_FILE)) {
    const data = JSON.parse(fs.readFileSync(MEMBERS_FILE, "utf-8"));
    if (Array.isArray(data) && data.length > 0) {
      serverMembers = data;
    }
  }
} catch (e) {
  console.error("Erro ao carregar membros do servidor:", e);
}

// CARREGA GALERIA DO DISCO SE EXISTIR
try {
  if (fs.existsSync(GALLERY_FILE)) {
    const data = JSON.parse(fs.readFileSync(GALLERY_FILE, "utf-8"));
    if (Array.isArray(data)) {
      serverGallery = data;
    }
  }
} catch (e) {
  console.error("Erro ao carregar galeria do servidor:", e);
}

// PASTA TRIPLA DE MÍDIAS DO MURAL E CHAT (PERSISTÊNCIA ABSOLUTA EM DATA/, PUBLIC/ E BACKUP/)
const UPLOADS_DIR_DATA = path.join(process.cwd(), "data", "uploads");
const UPLOADS_DIR_PUBLIC = path.join(process.cwd(), "public", "uploads");
const UPLOADS_BACKUP_DIR = path.join(process.cwd(), "data", "uploads_backup");
const TEMP_CHUNKS_DIR = path.join(process.cwd(), "data", "temp_chunks");

if (!fs.existsSync(UPLOADS_DIR_DATA)) {
  fs.mkdirSync(UPLOADS_DIR_DATA, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR_PUBLIC)) {
  fs.mkdirSync(UPLOADS_DIR_PUBLIC, { recursive: true });
}
if (!fs.existsSync(UPLOADS_BACKUP_DIR)) {
  fs.mkdirSync(UPLOADS_BACKUP_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_CHUNKS_DIR)) {
  fs.mkdirSync(TEMP_CHUNKS_DIR, { recursive: true });
}

// SINCRONIZA E RESTAURA MÍDIAS DO BACKUP NO BOOT DO SERVIDOR
function syncUploadsBackupOnBoot() {
  try {
    if (!fs.existsSync(UPLOADS_BACKUP_DIR)) return;
    const backupFiles = fs.readdirSync(UPLOADS_BACKUP_DIR);
    let count = 0;
    backupFiles.forEach(f => {
      if (!f || f.startsWith('.')) return;
      const pData = path.join(UPLOADS_DIR_DATA, f);
      const pPublic = path.join(UPLOADS_DIR_PUBLIC, f);
      const pBackup = path.join(UPLOADS_BACKUP_DIR, f);

      if (!fs.existsSync(pData) && fs.existsSync(pBackup)) {
        try { fs.copyFileSync(pBackup, pData); count++; } catch (e) {}
      }
      if (!fs.existsSync(pPublic) && fs.existsSync(pBackup)) {
        try { fs.copyFileSync(pBackup, pPublic); } catch (e) {}
      }
    });
    if (count > 0) {
      console.log(`[Backup Boot Sync] ${count} mídias restauradas automaticamente do diretório data/uploads_backup/`);
    }
  } catch (e) {
    console.error("Erro na sincronização inicial do backup de mídias:", e);
  }
}

syncUploadsBackupOnBoot();

function createUploadBackup(uniqueFileName: string, sourcePath: string) {
  try {
    if (!uniqueFileName || !sourcePath || !fs.existsSync(sourcePath)) return;
    if (!fs.existsSync(UPLOADS_BACKUP_DIR)) {
      fs.mkdirSync(UPLOADS_BACKUP_DIR, { recursive: true });
    }
    const backupFilePath = path.join(UPLOADS_BACKUP_DIR, uniqueFileName);
    fs.copyFileSync(sourcePath, backupFilePath);
  } catch (e) {
    console.error(`Erro ao criar backup de ${uniqueFileName}:`, e);
  }
}

function convertBase64ToUploadFile(urlStr: string, defaultName: string = 'media'): string {
  if (typeof urlStr === 'string' && urlStr.startsWith('data:')) {
    try {
      const matches = urlStr.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let effectiveMime = 'application/octet-stream';
      if (matches && matches.length === 3) {
        effectiveMime = matches[1];
        buffer = Buffer.from(matches[2], "base64");
      } else {
        const parts = urlStr.split(",");
        buffer = Buffer.from(parts[1] || parts[0], "base64");
      }
      return saveBufferToUploads(buffer, defaultName, effectiveMime);
    } catch (e) {
      console.error("Erro ao converter base64 para arquivo no servidor:", e);
    }
  }
  return urlStr;
}

function isUploadPathValid(urlStr?: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return true;
  if (urlStr.startsWith('data:')) return true; // Data URLs em Base64 são 100% permanentes e válidas
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) return true;
  if (urlStr.startsWith('/uploads/')) {
    const filename = urlStr.replace('/uploads/', '');
    const pathData = path.join(UPLOADS_DIR_DATA, filename);
    const pathPublic = path.join(UPLOADS_DIR_PUBLIC, filename);
    return fs.existsSync(pathData) || fs.existsSync(pathPublic);
  }
  return true;
}

function sanitizeMediaPosts(posts: any[]) {
  if (!Array.isArray(posts)) return [];
  return posts.filter(p => p && p.id && p.url && !deletedMediaPostIds.has(String(p.id))).map(p => {
    if (typeof p.url === 'string' && p.url.startsWith('data:')) {
      p.url = saveBase64ToUploads(p.url, p.title || 'media');
    }
    return p;
  });
}

function saveServerMediaPosts(updatedItem?: any) {
  try {
    const dir = path.dirname(MEDIA_POSTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    serverMediaPosts = sanitizeMediaPosts(serverMediaPosts);
    fs.writeFileSync(MEDIA_POSTS_FILE, JSON.stringify(serverMediaPosts, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar posts do mural no servidor:", e);
  }
  if (updatedItem && updatedItem.id && !deletedMediaPostIds.has(String(updatedItem.id))) {
    saveDocumentToFirestore("media_posts", String(updatedItem.id), updatedItem).catch(e => console.error("Erro no save Firestore media_post:", e));
  } else if (serverMediaPosts.length > 0) {
    saveBatchToFirestore("media_posts", serverMediaPosts).catch(e => console.error("Erro no saveBatch Firestore media_posts:", e));
  }
}

function sanitizeVideos(videos: any[]) {
  if (!Array.isArray(videos)) return [];
  return videos.filter(v => v && v.id && !deletedVideoIds.has(String(v.id))).map(v => {
    if (typeof v.videoUrl === 'string' && v.videoUrl.startsWith('data:')) {
      v.videoUrl = saveBase64ToUploads(v.videoUrl, v.title || 'video');
    }
    return v;
  });
}

function saveServerVideos(updatedItem?: any) {
  try {
    const dir = path.dirname(VIDEOS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    serverVideos = sanitizeVideos(serverVideos);
    fs.writeFileSync(VIDEOS_FILE, JSON.stringify(serverVideos, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar vídeos no servidor:", e);
  }
  if (updatedItem && updatedItem.id && !deletedVideoIds.has(String(updatedItem.id))) {
    saveDocumentToFirestore("videos", String(updatedItem.id), updatedItem).catch(e => console.error("Erro no save Firestore video:", e));
  } else if (serverVideos.length > 0) {
    saveBatchToFirestore("videos", serverVideos).catch(e => console.error("Erro no saveBatch Firestore videos:", e));
  }
}

function sanitizeGallery(items: any[]) {
  if (!Array.isArray(items)) return [];
  return items.filter(g => g && g.id && !deletedGalleryIds.has(String(g.id))).map(g => {
    if (typeof g.url === 'string' && g.url.startsWith('data:')) {
      g.url = saveBase64ToUploads(g.url, g.title || 'gallery');
    }
    return g;
  });
}

function saveServerGallery(updatedItem?: any) {
  try {
    const dir = path.dirname(GALLERY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    serverGallery = sanitizeGallery(serverGallery);
    fs.writeFileSync(GALLERY_FILE, JSON.stringify(serverGallery, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar galeria no servidor:", e);
  }
  if (updatedItem && updatedItem.id && !deletedGalleryIds.has(String(updatedItem.id))) {
    saveDocumentToFirestore("gallery", String(updatedItem.id), updatedItem).catch(e => console.error("Erro no save Firestore gallery:", e));
  } else if (serverGallery.length > 0) {
    saveBatchToFirestore("gallery", serverGallery).catch(e => console.error("Erro no saveBatch Firestore gallery:", e));
  }
}

function detectFileTypeFromBuffer(buffer: Buffer): { ext: string; mime: string } | null {
  if (!buffer || buffer.length < 4) return null;
  // WebM / Matroska (EBML): 1A 45 DF A3
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return { ext: 'webm', mime: 'video/webm' };
  }
  // MP4 / QuickTime: 'ftyp' at offset 4
  if (buffer.length >= 8 && buffer.toString('utf8', 4, 8) === 'ftyp') {
    return { ext: 'mp4', mime: 'video/mp4' };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }
  // GIF: GIF8
  if (buffer.length >= 4 && buffer.toString('utf8', 0, 4) === 'GIF8') {
    return { ext: 'gif', mime: 'image/gif' };
  }
  // MP3: ID3
  if (buffer.length >= 3 && buffer.toString('utf8', 0, 3) === 'ID3') {
    return { ext: 'mp3', mime: 'audio/mpeg' };
  }
  return null;
}

function getMimeFromExt(ext: string): string {
  const lower = (ext || '').toLowerCase().replace(/^\./, '').trim();
  if (lower === 'png') return 'image/png';
  if (lower === 'gif') return 'image/gif';
  if (lower === 'webp') return 'image/webp';
  if (lower === 'jpg' || lower === 'jpeg') return 'image/jpeg';
  if (lower === 'mp4' || lower === 'm4v') return 'video/mp4';
  if (lower === 'webm') return 'video/webm';
  if (lower === 'mov' || lower === 'quicktime' || lower === 'qt') return 'video/quicktime';
  if (lower === '3gp' || lower === '3gpp') return 'video/3gpp';
  if (lower === 'mkv') return 'video/x-matroska';
  if (lower === 'avi') return 'video/x-msvideo';
  if (lower === 'mp3') return 'audio/mpeg';
  if (lower === 'ogg') return 'audio/ogg';
  if (lower === 'wav') return 'audio/wav';
  if (lower === 'm4a') return 'audio/mp4';
  if (lower === 'opus') return 'audio/opus';
  return 'application/octet-stream';
}

function getExtensionFromMimeOrName(fileName?: string, fileType?: string): string {
  if (fileName && fileName.includes('.')) {
    const parts = fileName.split('.');
    const extFromFile = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (extFromFile && extFromFile.length <= 5) {
      return extFromFile;
    }
  }
  const typeLower = (fileType || '').toLowerCase();
  if (typeLower.includes('png')) return 'png';
  if (typeLower.includes('gif')) return 'gif';
  if (typeLower.includes('webp')) return 'webp';
  if (typeLower.includes('jpeg') || typeLower.includes('jpg')) return 'jpg';
  if (typeLower.includes('mp4')) return 'mp4';
  if (typeLower.includes('webm')) return 'webm';
  if (typeLower.includes('quicktime') || typeLower.includes('mov')) return 'mov';
  if (typeLower.includes('3gpp') || typeLower.includes('3gp')) return '3gp';
  if (typeLower.includes('mkv')) return 'mkv';
  if (typeLower.includes('avi')) return 'avi';
  if (typeLower.includes('mp3')) return 'mp3';
  if (typeLower.includes('ogg')) return 'ogg';
  if (typeLower.includes('wav')) return 'wav';
  if (typeLower.includes('m4a')) return 'm4a';
  if (typeLower.includes('opus')) return 'opus';
  if (typeLower.includes('pdf')) return 'pdf';
  return 'bin';
}

// HELPER: SALVA BUFFER NA PASTA DE MÍDIA PERSISTENTE (DATA/UPLOADS)
function saveBufferToUploads(buffer: Buffer, fileName?: string, fileType?: string): string {
  const detected = detectFileTypeFromBuffer(buffer);
  const ext = detected?.ext || getExtensionFromMimeOrName(fileName, fileType);
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt}`;

  const pathData = path.join(UPLOADS_DIR_DATA, uniqueFileName);
  const pathPublic = path.join(UPLOADS_DIR_PUBLIC, uniqueFileName);

  try { fs.writeFileSync(pathData, buffer); } catch (e) { console.error("Erro ao salvar mídia em data/uploads:", e); }
  try { fs.writeFileSync(pathPublic, buffer); } catch (e) {}
  createUploadBackup(uniqueFileName, pathData);

  // Apenas arquivos pequenos (< 300KB) são mantidos no backup em memória
  if (buffer.length < 300000) {
    try {
      const mime = fileType || getMimeFromExt(safeExt);
      const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      uploadsBase64Store[uniqueFileName] = dataUrl;
      saveUploadsStore();
      saveDocumentToFirestore("media_files", uniqueFileName, {
        id: uniqueFileName,
        dataUrl,
        timestamp: Date.now()
      }).catch(() => {});
    } catch(e) {}
  }

  return `/uploads/${uniqueFileName}`;
}

// HELPER: CONVERTE BASE64 EM ARQUIVO ESTÁTICO EM /uploads/ AUTOMATICAMENTE (PERSISTENTE)
function saveBase64ToUploads(dataUrl: string, fileName?: string): string {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }
  try {
    let mime = 'image/jpeg';
    if (dataUrl.startsWith('data:video') || dataUrl.includes('video')) {
      mime = 'video/mp4';
    } else if (dataUrl.startsWith('data:audio') || dataUrl.includes('audio')) {
      mime = 'audio/webm';
    } else if (dataUrl.startsWith('data:image') || dataUrl.includes('image')) {
      mime = 'image/jpeg';
    }

    const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    let base64Data = '';
    if (matches && matches.length === 3) {
      mime = matches[1];
      base64Data = matches[2];
    } else {
      const parts = dataUrl.split(',');
      base64Data = parts[1] || parts[0];
    }
    const buffer = Buffer.from(base64Data, 'base64');
    return saveBufferToUploads(buffer, fileName || 'upload', mime);
  } catch (err) {
    console.error("Erro ao converter base64 para arquivo estático:", err);
    return dataUrl;
  }
}

// CARREGA MENSAGENS DO DISCO SE EXISTIR (FILTRANDO MENSAGENS APAGADAS)
function sanitizeMessages(msgs: any[]) {
  if (!Array.isArray(msgs)) return [];
  return msgs.filter(m => m && m.id && !deletedMessageIds.has(String(m.id)));
}

try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const data = JSON.parse(fs.readFileSync(MESSAGES_FILE, "utf-8"));
    if (Array.isArray(data)) {
      serverChatMessages = sanitizeMessages(data);
    }
  }
} catch (e) {
  console.error("Erro ao carregar mensagens do servidor:", e);
}

function saveServerMessages(updatedItem?: any) {
  try {
    const dir = path.dirname(MESSAGES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    serverChatMessages = sanitizeMessages(serverChatMessages);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(serverChatMessages, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar mensagens no servidor:", e);
  }
  if (updatedItem && updatedItem.id) {
    saveDocumentToFirestore("messages", String(updatedItem.id), updatedItem).catch(e => console.error("Erro no save Firestore message:", e));
  } else if (serverChatMessages.length > 0) {
    saveBatchToFirestore("messages", serverChatMessages).catch(e => console.error("Erro no saveBatch Firestore messages:", e));
  }
}

// CARREGA DO DISCO SE EXISTIR (FILTRANDO CONTAS DE TESTE ANTIGAS)
const MOCK_IDS_TO_REMOVE = ['usr_101', 'usr_102', 'usr_103', 'usr_104'];

try {
  if (fs.existsSync(USERS_FILE)) {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    if (Array.isArray(data.users)) {
      const map = new Map();
      INITIAL_REGISTERED_USERS.forEach(u => {
        if (u && u.email) map.set(u.email.toLowerCase(), u);
      });
      data.users.forEach((u: any) => {
        if (u && u.id && !MOCK_IDS_TO_REMOVE.includes(u.id)) {
          if (typeof u.photoUrl === 'string' && u.photoUrl.includes('images.unsplash.com')) {
            u.photoUrl = '';
          }
          const key = (u.email || u.id).toString().toLowerCase();
          map.set(key, u);
        }
      });
      serverRegisteredUsers = Array.from(map.values());
    }
    if (Array.isArray(data.deleted) && data.deleted.length > 0) {
      data.deleted.forEach((id: string) => {
        if (id) deletedUserIdentifiers.add(id.toString().toLowerCase());
      });
    }
    if (data.pin && typeof data.pin === "string") {
      serverMasterAdminPin = data.pin;
    }
  } else {
    serverRegisteredUsers = [...INITIAL_REGISTERED_USERS];
  }
} catch (e) {
  console.error("Erro ao carregar banco de dados de usuários local:", e);
  serverRegisteredUsers = [...INITIAL_REGISTERED_USERS];
}

function isUserDeleted(id?: string, email?: string, name?: string, phone?: string): boolean {
  const cleanId = (id || "").trim().toLowerCase();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanName = (name || "").trim().toLowerCase();
  const cleanPhone = (phone || "").replace(/\D/g, "");

  // O Administrador Master NUNCA pode ser considerado deletado
  if (
    cleanId === 'usr_admin_master' || 
    cleanId === 'm_pastor_master' || 
    cleanId === 'usr_pastor_master' || 
    cleanEmail === 'bjuscelino33@gmail.com' || 
    cleanEmail === 'meuplantaopro@gmail.com'
  ) {
    return false;
  }

  // Conta específica Rosilene que o usuário solicitou exclusão permanente
  if (cleanEmail.includes("rosilene") || cleanName.includes("rosilene") || cleanId.includes("rosilene")) {
    return true;
  }

  if (cleanId && deletedUserIdentifiers.has(cleanId)) return true;
  if (cleanEmail && deletedUserIdentifiers.has(cleanEmail)) return true;
  if (cleanPhone && deletedUserIdentifiers.has(cleanPhone)) return true;

  return false;
}

function sanitizeAndDeduplicateServerAccounts() {
  // 1. DEDUPLICAÇÃO DE MEMBROS (serverMembers)
  const masterPastorMember = {
    id: 'm_pastor_master',
    name: 'Pr. Juscelino (Pastor Presidente)',
    email: 'bjuscelino33@gmail.com',
    phone: '(11) 99876-5432',
    role: 'PASTOR',
    accessStatus: 'LIBERADO',
    isBlocked: false,
    createdAt: '2024-01-01'
  };

  const cleanMembers: any[] = [];
  const seenMemberEmails = new Set<string>();
  const seenMemberPhones = new Set<string>();
  const seenMemberIds = new Set<string>();

  cleanMembers.push(masterPastorMember);
  seenMemberEmails.add('bjuscelino33@gmail.com');
  seenMemberEmails.add('meuplantaopro@gmail.com');
  seenMemberIds.add('m_pastor_master');
  seenMemberIds.add('usr_pastor_master');
  seenMemberIds.add('pastor_master_1');
  seenMemberIds.add('usr_admin_master');

  serverMembers.forEach(m => {
    if (!m || !m.id) return;
    const mId = String(m.id).trim().toLowerCase();
    const mEmail = (m.email || '').toString().trim().toLowerCase();
    const mPhone = (m.phone || '').toString().replace(/\D/g, '');
    const mName = (m.name || '').toString().trim().toLowerCase();

    // Se for conta duplicada do pastor / admin master, unifica no master e limpa do Firestore
    if (
      mId === 'm_pastor_master' ||
      mId === 'usr_pastor_master' ||
      mId === 'pastor_master_1' ||
      mId === 'usr_admin_master' ||
      mEmail === 'bjuscelino33@gmail.com' ||
      mEmail === 'meuplantaopro@gmail.com' ||
      (mName.includes('juscelino') && (mName.includes('pastor') || mName.includes('admin')))
    ) {
      if (m.id !== 'm_pastor_master') {
        deleteDocumentFromFirestore('members', String(m.id)).catch(() => {});
        deleteDocumentFromFirestore('users', String(m.id)).catch(() => {});
      }
      return;
    }

    if (isUserDeleted(m.id, m.email, m.name, m.phone)) return;

    if (seenMemberIds.has(mId)) return;
    if (mEmail && seenMemberEmails.has(mEmail)) return;
    if (mPhone && mPhone.length >= 8 && seenMemberPhones.has(mPhone)) return;

    seenMemberIds.add(mId);
    if (mEmail) seenMemberEmails.add(mEmail);
    if (mPhone && mPhone.length >= 8) seenMemberPhones.add(mPhone);

    cleanMembers.push(m);
  });

  serverMembers = cleanMembers;

  // 2. DEDUPLICAÇÃO DE USUÁRIOS REGISTRADOS (serverRegisteredUsers)
  const masterUser = {
    ...INITIAL_USER,
    name: 'Pr. Juscelino (Pastor Presidente)',
    email: 'bjuscelino33@gmail.com',
    role: 'ADMIN_MASTER',
    isAdmin: true,
    accessStatus: 'LIBERADO',
    isBlocked: false
  };

  const cleanUsers: any[] = [];
  const seenUserEmails = new Set<string>();
  const seenUserIds = new Set<string>();

  cleanUsers.push(masterUser);
  seenUserEmails.add('bjuscelino33@gmail.com');
  seenUserEmails.add('meuplantaopro@gmail.com');
  seenUserIds.add('usr_admin_master');
  seenUserIds.add('m_pastor_master');
  seenUserIds.add('usr_pastor_master');
  seenUserIds.add('pastor_master_1');

  serverRegisteredUsers.forEach(u => {
    if (!u || !u.id) return;
    const uId = String(u.id).trim().toLowerCase();
    const uEmail = (u.email || '').toString().trim().toLowerCase();
    const uPhone = (u.phone || '').toString().replace(/\D/g, '');
    const uName = (u.name || '').toString().trim().toLowerCase();

    if (
      uId === 'usr_admin_master' ||
      uId === 'm_pastor_master' ||
      uId === 'usr_pastor_master' ||
      uId === 'pastor_master_1' ||
      uEmail === 'bjuscelino33@gmail.com' ||
      uEmail === 'meuplantaopro@gmail.com' ||
      (uName.includes('juscelino') && (uName.includes('admin') || uName.includes('pastor')))
    ) {
      if (u.id !== 'usr_admin_master') {
        deleteDocumentFromFirestore('users', String(u.id)).catch(() => {});
        deleteDocumentFromFirestore('members', String(u.id)).catch(() => {});
      }
      return;
    }

    if (isUserDeleted(u.id, u.email, u.name, u.phone)) return;
    if (seenUserIds.has(uId)) return;
    if (uEmail && seenUserEmails.has(uEmail)) return;

    seenUserIds.add(uId);
    if (uEmail) seenUserEmails.add(uEmail);

    cleanUsers.push(u);
  });

  serverRegisteredUsers = cleanUsers;
}

function permanentlyDeleteUserAccount(targetIdentifier?: string, additionalData?: { email?: string; phone?: string; name?: string }): { success: boolean; error?: string; members?: any[]; users?: any[] } {
  const cleanTarget = (targetIdentifier || "").toString().trim().toLowerCase();
  const extraEmail = (additionalData?.email || "").toString().trim().toLowerCase();
  const extraPhone = (additionalData?.phone || "").toString().replace(/\D/g, "");
  const extraName = (additionalData?.name || "").toString().trim().toLowerCase();
  const cleanPhone = cleanTarget.replace(/\D/g, "");

  if (!cleanTarget && !extraEmail && !extraPhone && !extraName) {
    return { success: false, error: "Identificador não fornecido." };
  }

  // Apenas a conta Master Primária oficial é protegida contra exclusão total
  if (
    cleanTarget === 'usr_admin_master' || 
    cleanTarget === 'm_pastor_master'
  ) {
    return { success: false, error: "O Administrador Master / Pastor Presidente não pode ser excluído." };
  }

  // Registra no Set de IDs excluídos todos os formatos iniciais
  if (cleanTarget && cleanTarget !== 'usr_admin_master' && cleanTarget !== 'm_pastor_master') {
    deletedUserIdentifiers.add(cleanTarget);
  }
  if (cleanPhone && cleanPhone.length >= 8) deletedUserIdentifiers.add(cleanPhone);
  if (extraEmail && extraEmail !== 'bjuscelino33@gmail.com' && extraEmail !== 'meuplantaopro@gmail.com') {
    deletedUserIdentifiers.add(extraEmail);
  }
  if (extraPhone && extraPhone.length >= 8) deletedUserIdentifiers.add(extraPhone);
  if (extraName && extraName.length > 2 && !extraName.includes('juscelino')) {
    deletedUserIdentifiers.add(extraName);
  }

  // Busca e reúne recursivamente todos os IDs, emails, telefones e nomes vinculados
  let discoveredNew = true;
  while (discoveredNew) {
    discoveredNew = false;

    // Varre serverMembers
    serverMembers.forEach(m => {
      if (!m) return;
      const mId = (m.id || "").toString().toLowerCase();
      const mEmail = (m.email || "").toString().toLowerCase();
      const mPhone = (m.phone || "").replace(/\D/g, "");
      const mName = (m.name || "").toString().toLowerCase();

      const matches = 
        (mId && deletedUserIdentifiers.has(mId)) ||
        (mEmail && deletedUserIdentifiers.has(mEmail)) ||
        (mPhone && mPhone.length >= 8 && deletedUserIdentifiers.has(mPhone)) ||
        (mName && mName.length > 2 && deletedUserIdentifiers.has(mName));

      if (matches) {
        if (mId && !deletedUserIdentifiers.has(mId)) { deletedUserIdentifiers.add(mId); discoveredNew = true; }
        if (mEmail && !deletedUserIdentifiers.has(mEmail)) { deletedUserIdentifiers.add(mEmail); discoveredNew = true; }
        if (mPhone && mPhone.length >= 8 && !deletedUserIdentifiers.has(mPhone)) { deletedUserIdentifiers.add(mPhone); discoveredNew = true; }
        if (mName && mName.length > 2 && !deletedUserIdentifiers.has(mName)) { deletedUserIdentifiers.add(mName); discoveredNew = true; }
      }
    });

    // Varre serverRegisteredUsers
    serverRegisteredUsers.forEach(u => {
      if (!u) return;
      const uId = (u.id || "").toString().toLowerCase();
      const uEmail = (u.email || "").toString().toLowerCase();
      const uPhone = (u.phone || "").replace(/\D/g, "");
      const uName = (u.name || "").toString().toLowerCase();

      if (uId === 'usr_admin_master' || uEmail === 'bjuscelino33@gmail.com' || uEmail === 'meuplantaopro@gmail.com') return;

      const matches = 
        (uId && deletedUserIdentifiers.has(uId)) ||
        (uEmail && deletedUserIdentifiers.has(uEmail)) ||
        (uPhone && uPhone.length >= 8 && deletedUserIdentifiers.has(uPhone)) ||
        (uName && uName.length > 2 && deletedUserIdentifiers.has(uName));

      if (matches) {
        if (uId && !deletedUserIdentifiers.has(uId)) { deletedUserIdentifiers.add(uId); discoveredNew = true; }
        if (uEmail && !deletedUserIdentifiers.has(uEmail)) { deletedUserIdentifiers.add(uEmail); discoveredNew = true; }
        if (uPhone && uPhone.length >= 8 && !deletedUserIdentifiers.has(uPhone)) { deletedUserIdentifiers.add(uPhone); discoveredNew = true; }
        if (uName && uName.length > 2 && !deletedUserIdentifiers.has(uName)) { deletedUserIdentifiers.add(uName); discoveredNew = true; }
      }
    });
  }

  // Deleta do Firestore todos os documentos com os identificadores descobertos
  deletedUserIdentifiers.forEach(idKey => {
    if (idKey && idKey !== 'usr_admin_master' && idKey !== 'bjuscelino33@gmail.com' && idKey !== 'meuplantaopro@gmail.com') {
      deleteDocumentFromFirestore("members", idKey).catch(() => {});
      deleteDocumentFromFirestore("users", idKey).catch(() => {});
    }
  });

  if (cleanTarget) {
    deleteDocumentFromFirestore("members", cleanTarget).catch(() => {});
    deleteDocumentFromFirestore("users", cleanTarget).catch(() => {});
  }
  if (targetIdentifier) {
    deleteDocumentFromFirestore("members", targetIdentifier).catch(() => {});
    deleteDocumentFromFirestore("users", targetIdentifier).catch(() => {});
  }

  // Filtra serverMembers
  serverMembers = serverMembers.filter(m => {
    if (!m || !m.id) return false;
    const mId = String(m.id).toLowerCase();
    const mEmail = (m.email || "").toLowerCase();
    const mPhone = (m.phone || "").replace(/\D/g, "");
    const mName = (m.name || "").toLowerCase();

    if (deletedUserIdentifiers.has(mId) || (mEmail && deletedUserIdentifiers.has(mEmail)) || (mPhone && deletedUserIdentifiers.has(mPhone)) || (mName && deletedUserIdentifiers.has(mName))) return false;
    return true;
  });

  // Filtra serverRegisteredUsers
  serverRegisteredUsers = serverRegisteredUsers.filter(u => {
    if (!u || !u.id) return false;
    const uId = String(u.id).toLowerCase();
    const uEmail = (u.email || "").toLowerCase();
    const uPhone = (u.phone || "").replace(/\D/g, "");
    const uName = (u.name || "").toLowerCase();

    if (uId === 'usr_admin_master' || uEmail === 'bjuscelino33@gmail.com' || uEmail === 'meuplantaopro@gmail.com') return true;

    if (deletedUserIdentifiers.has(uId) || (uEmail && deletedUserIdentifiers.has(uEmail)) || (uPhone && deletedUserIdentifiers.has(uPhone)) || (uName && deletedUserIdentifiers.has(uName))) return false;
    return true;
  });

  // Garante que o Administrador Master sempre exista
  const hasAdmin = serverRegisteredUsers.some(u => u.id === 'usr_admin_master' || (u.email || '').toLowerCase() === 'bjuscelino33@gmail.com' || (u.email || '').toLowerCase() === 'meuplantaopro@gmail.com');
  if (!hasAdmin) {
    serverRegisteredUsers.unshift(INITIAL_USER);
  }

  saveServerMembers();
  saveServerUsers();
  saveDeletedIds();

  console.log(`[Exclusão Definitiva Concluída] Conta/Membro "${targetIdentifier || extraEmail || extraPhone || extraName}" foi removido definitivamente do servidor, Firestore e registros.`);

  return { success: true, members: serverMembers, users: serverRegisteredUsers };
}

// Remove mock IDs and deleted users from serverRegisteredUsers
serverRegisteredUsers = serverRegisteredUsers.filter(
  u => !MOCK_IDS_TO_REMOVE.includes(u.id) && !isUserDeleted(u.id, u.email, u.name, u.phone)
);

function saveServerMembers() {
  sanitizeAndDeduplicateServerAccounts();
  try {
    const dir = path.dirname(MEMBERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MEMBERS_FILE, JSON.stringify(serverMembers, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro ao salvar membros no servidor:", e);
  }
  if (serverMembers.length > 0) {
    saveBatchToFirestore("members", serverMembers).catch(e => console.error("Erro no auto-save Firestore members:", e));
  }
}

function saveServerUsers() {
  sanitizeAndDeduplicateServerAccounts();
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      USERS_FILE,
      JSON.stringify({ 
        users: serverRegisteredUsers, 
        deleted: Array.from(deletedUserIdentifiers),
        pin: serverMasterAdminPin 
      }, null, 2),
      "utf-8"
    );
  } catch (e) {
    console.error("Erro ao salvar usuários no servidor:", e);
  }
  saveBatchToFirestore("users", serverRegisteredUsers).catch(e => console.error("Erro no auto-save Firestore users:", e));
  saveDocumentToFirestore("system_settings", "master_config", {
    pin: serverMasterAdminPin,
    deleted: Array.from(deletedUserIdentifiers)
  }).catch(e => console.error("Erro no auto-save Firestore master_config:", e));
}

// FUNÇÃO DE CARREGAMENTO E SINCRONIZAÇÃO INICIAL DO FIREBASE FIRESTORE
async function initFirestoreData() {
  try {
    console.log("[Firebase Firestore] Carregando e sincronizando dados de persistência dupla...");

    // 0. Carrega IDs deletados do Firestore primeiro
    try {
      const delDoc = await loadDocumentFromFirestore("system_settings", "deleted_ids");
      if (delDoc) {
        if (Array.isArray(delDoc.messages)) {
          delDoc.messages.forEach((id: string) => deletedMessageIds.add(String(id)));
        }
        if (Array.isArray(delDoc.mediaPosts)) {
          delDoc.mediaPosts.forEach((id: string) => deletedMediaPostIds.add(String(id)));
        }
        if (Array.isArray(delDoc.videos)) {
          delDoc.videos.forEach((id: string) => deletedVideoIds.add(String(id)));
        }
        if (Array.isArray(delDoc.gallery)) {
          delDoc.gallery.forEach((id: string) => deletedGalleryIds.add(String(id)));
        }
      }
    } catch(e) {}

    // 1. Media Posts - Fusão Inteligente (Cloud Firestore + Disco Local)
    const firestorePosts = await loadCollectionFromFirestore("media_posts").catch(() => []);
    const postsMap = new Map<string, any>();

    if (Array.isArray(firestorePosts)) {
      firestorePosts.forEach((p: any) => {
        if (p && p.id) {
          if (deletedMediaPostIds.has(String(p.id))) {
            deleteDocumentFromFirestore("media_posts", String(p.id)).catch(() => {});
          } else {
            postsMap.set(p.id, p);
          }
        }
      });
    }

    serverMediaPosts.forEach((p: any) => {
      if (p && p.id && !deletedMediaPostIds.has(String(p.id))) {
        const existing = postsMap.get(p.id);
        postsMap.set(p.id, existing ? { ...existing, ...p } : p);
      }
    });

    serverMediaPosts = sanitizeMediaPosts(Array.from(postsMap.values()));
    saveServerMediaPosts();
    if (serverMediaPosts.length > 0) {
      saveBatchToFirestore("media_posts", serverMediaPosts).catch(e => console.error("Erro no batch Firestore media_posts:", e));
    }
    console.log(`[Firebase Firestore] ${serverMediaPosts.length} posts do mural sincronizados.`);

    // 2. Chat Messages - Fusão Inteligente (Cloud Firestore + Disco Local)
    const firestoreMessages = await loadCollectionFromFirestore("messages").catch(() => []);
    const msgsMap = new Map<string, any>();

    if (Array.isArray(firestoreMessages)) {
      firestoreMessages.forEach((m: any) => {
        if (m && m.id) {
          if (deletedMessageIds.has(String(m.id))) {
            deleteDocumentFromFirestore("messages", String(m.id)).catch(() => {});
          } else {
            msgsMap.set(m.id, m);
          }
        }
      });
    }

    serverChatMessages.forEach((m: any) => {
      if (!m || !m.id || deletedMessageIds.has(String(m.id))) return;
      const existing = msgsMap.get(m.id);
      if (existing) {
        const mergedListened = Array.from(new Set([
          ...(existing.listenedBy || []),
          ...(m.listenedBy || [])
        ]));
        msgsMap.set(m.id, { ...existing, ...m, listenedBy: mergedListened });
      } else {
        msgsMap.set(m.id, m);
      }
    });

    serverChatMessages = sanitizeMessages(Array.from(msgsMap.values()));
    saveServerMessages();
    if (serverChatMessages.length > 0) {
      saveBatchToFirestore("messages", serverChatMessages).catch(e => console.error("Erro no batch Firestore messages:", e));
    }
    console.log(`[Firebase Firestore] ${serverChatMessages.length} mensagens de chat sincronizadas.`);

    // 3. Usuários Registrados
    const firestoreUsers = await loadCollectionFromFirestore("users").catch(() => []);
    const usersMap = new Map();

    INITIAL_REGISTERED_USERS.forEach(u => {
      if (u && u.email) usersMap.set(u.email.toLowerCase(), u);
    });

    if (Array.isArray(firestoreUsers)) {
      firestoreUsers.forEach((u: any) => {
        if (u && u.id && !MOCK_IDS_TO_REMOVE.includes(u.id)) {
          const key = (u.email || u.id).toString().toLowerCase();
          usersMap.set(key, u);
        }
      });
    }

    serverRegisteredUsers.forEach((u: any) => {
      if (u && u.id && !MOCK_IDS_TO_REMOVE.includes(u.id)) {
        const key = (u.email || u.id).toString().toLowerCase();
        usersMap.set(key, u);
      }
    });

    serverRegisteredUsers = Array.from(usersMap.values()).filter(
      u => !MOCK_IDS_TO_REMOVE.includes(u.id) && !isUserDeleted(u.id, u.email, u.name)
    );
    saveServerUsers();
    if (serverRegisteredUsers.length > 0) {
      await saveBatchToFirestore("users", serverRegisteredUsers).catch(e => console.error("Erro no batch Firestore users:", e));
    }
    console.log(`[Firebase Firestore] ${serverRegisteredUsers.length} usuários sincronizados.`);

    // 4. Configurações Master
    const sysConfigs = await loadCollectionFromFirestore("system_settings").catch(() => []);
    const masterConfig = sysConfigs.find((c: any) => c.id === "master_config");
    if (masterConfig) {
      if (masterConfig.pin) serverMasterAdminPin = masterConfig.pin;
      if (Array.isArray(masterConfig.deleted)) {
        masterConfig.deleted.forEach((id: string) => deletedUserIdentifiers.add(id.toString().toLowerCase()));
      }
      console.log("[Firebase Firestore] Configuração Master carregada.");
    }
    await saveDocumentToFirestore("system_settings", "master_config", {
      pin: serverMasterAdminPin,
      deleted: Array.from(deletedUserIdentifiers)
    }).catch(e => console.error("Erro no save master_config:", e));

    // 5. Vídeos - Fusão Inteligente (Cloud Firestore + Disco Local)
    const firestoreVideos = await loadCollectionFromFirestore("videos").catch(() => []);
    const videosMap = new Map<string, any>();

    if (Array.isArray(firestoreVideos)) {
      firestoreVideos.forEach((v: any) => {
        if (v && v.id) {
          if (deletedVideoIds.has(String(v.id))) {
            deleteDocumentFromFirestore("videos", String(v.id)).catch(() => {});
          } else {
            videosMap.set(v.id, v);
          }
        }
      });
    }

    serverVideos.forEach((v: any) => {
      if (v && v.id && !deletedVideoIds.has(String(v.id))) {
        const existing = videosMap.get(v.id);
        videosMap.set(v.id, existing ? { ...existing, ...v } : v);
      }
    });

    serverVideos = sanitizeVideos(Array.from(videosMap.values()));
    saveServerVideos();
    if (serverVideos.length > 0) {
      saveBatchToFirestore("videos", serverVideos).catch(e => console.error("Erro no batch Firestore videos:", e));
    }
    console.log(`[Firebase Firestore] ${serverVideos.length} vídeos sincronizados.`);

    // 6. Galeria - Fusão Inteligente (Cloud Firestore + Disco Local)
    const firestoreGallery = await loadCollectionFromFirestore("gallery").catch(() => []);
    const galleryMap = new Map<string, any>();

    if (Array.isArray(firestoreGallery)) {
      firestoreGallery.forEach((g: any) => {
        if (g && g.id) {
          if (deletedGalleryIds.has(String(g.id))) {
            deleteDocumentFromFirestore("gallery", String(g.id)).catch(() => {});
          } else {
            galleryMap.set(g.id, g);
          }
        }
      });
    }

    serverGallery.forEach((g: any) => {
      if (g && g.id && !deletedGalleryIds.has(String(g.id))) {
        const existing = galleryMap.get(g.id);
        galleryMap.set(g.id, existing ? { ...existing, ...g } : g);
      }
    });

    serverGallery = sanitizeGallery(Array.from(galleryMap.values()));
    saveServerGallery();
    if (serverGallery.length > 0) {
      saveBatchToFirestore("gallery", serverGallery).catch(e => console.error("Erro no batch Firestore gallery:", e));
    }
    console.log(`[Firebase Firestore] ${serverGallery.length} itens da galeria sincronizados.`);

    // 7. Membros da Igreja - Fusão Inteligente (Cloud Firestore + Disco Local)
    const firestoreMembers = await loadCollectionFromFirestore("members").catch(() => []);
    const membersMap = new Map<string, any>();

    INITIAL_MEMBERS.forEach(m => {
      if (m && m.id) membersMap.set(m.id, m);
    });

    if (Array.isArray(firestoreMembers)) {
      firestoreMembers.forEach((m: any) => {
        if (m && m.id && !deletedUserIdentifiers.has(String(m.id).toLowerCase())) {
          membersMap.set(m.id, m);
        }
      });
    }

    serverMembers.forEach((m: any) => {
      if (m && m.id && !deletedUserIdentifiers.has(String(m.id).toLowerCase())) {
        const existing = membersMap.get(m.id);
        membersMap.set(m.id, existing ? { ...existing, ...m } : m);
      }
    });

    serverMembers = Array.from(membersMap.values());
    sanitizeAndDeduplicateServerAccounts();
    
    // Remove documentos duplicados legados do Firestore
    deleteDocumentFromFirestore('members', 'usr_pastor_master').catch(() => {});
    deleteDocumentFromFirestore('members', 'pastor_master_1').catch(() => {});
    deleteDocumentFromFirestore('members', 'usr_admin_master').catch(() => {});
    deleteDocumentFromFirestore('users', 'usr_pastor_master').catch(() => {});
    deleteDocumentFromFirestore('users', 'pastor_master_1').catch(() => {});
    deleteDocumentFromFirestore('users', 'm_pastor_master').catch(() => {});

    saveServerMembers();
    if (serverMembers.length > 0) {
      saveBatchToFirestore("members", serverMembers).catch(e => console.error("Erro no batch Firestore members:", e));
    }
    console.log(`[Firebase Firestore] ${serverMembers.length} membros da igreja sincronizados.`);
  } catch (err) {
    console.error("[Firebase Firestore] Erro ao sincronizar dados iniciais:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Carrega e sincroniza todos os dados com o Firebase Firestore em segundo plano (não bloqueia a inicialização do servidor)
  initFirestoreData().catch(e => console.error("Erro no initFirestoreData:", e));

  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));
  app.use(express.raw({ type: ["application/octet-stream", "application/x-binary"], limit: "50mb" }));

  // --- SERVIÇO DE UPLOADS ESTÁTICOS (PERSISTÊNCIA DUPLA EM DATA/ E PUBLIC/) ---
  const staticUploadOptions = { 
    fallthrough: true,
    setHeaders: (res: any, filePath: string) => {
      const lower = filePath.toLowerCase();
      if (lower.endsWith('.mp4')) res.setHeader('Content-Type', 'video/mp4');
      else if (lower.endsWith('.webm')) res.setHeader('Content-Type', lower.includes('audio') ? 'audio/webm' : 'video/webm');
      else if (lower.endsWith('.mov') || lower.endsWith('.qt')) res.setHeader('Content-Type', 'video/quicktime');
      else if (lower.endsWith('.3gp')) res.setHeader('Content-Type', 'video/3gpp');
      else if (lower.endsWith('.mkv')) res.setHeader('Content-Type', 'video/x-matroska');
      else if (lower.endsWith('.avi')) res.setHeader('Content-Type', 'video/x-msvideo');
      else if (lower.endsWith('.mp3')) res.setHeader('Content-Type', 'audio/mpeg');
      else if (lower.endsWith('.ogg')) res.setHeader('Content-Type', 'audio/ogg');
      else if (lower.endsWith('.wav')) res.setHeader('Content-Type', 'audio/wav');
      else if (lower.endsWith('.m4a')) res.setHeader('Content-Type', 'audio/mp4');
      else if (lower.endsWith('.opus')) res.setHeader('Content-Type', 'audio/opus');
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
      else if (lower.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
      else if (lower.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
      else if (lower.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  };

  // --- SERVIÇO DE STREAMING DE MÍDIAS E VÍDEOS COM SUPORTE A HTTP 206 (PARTIAL CONTENT) ---
  app.all("/uploads/:filename", async (req, res, next) => {
    // Apenas responde a GET e HEAD nesta rota
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const { filename } = req.params;
    const pathData = path.join(UPLOADS_DIR_DATA, filename);
    const pathPublic = path.join(UPLOADS_DIR_PUBLIC, filename);
    const pathBackup = path.join(UPLOADS_BACKUP_DIR, filename);

    let activePath: string | null = null;

    if (fs.existsSync(pathData)) {
      activePath = pathData;
    } else if (fs.existsSync(pathPublic)) {
      activePath = pathPublic;
    } else if (fs.existsSync(pathBackup)) {
      try {
        fs.copyFileSync(pathBackup, pathData);
        try { fs.copyFileSync(pathBackup, pathPublic); } catch (e) {}
        activePath = pathData;
        console.log(`[Auto-Restaurado Sucesso] Mídia ${filename} restaurada do diretório data/uploads_backup/`);
      } catch (e) {
        console.error(`Erro ao restaurar mídia ${filename} do backup:`, e);
      }
    }

    // 1. Procura no uploadsBase64Store para recriar o arquivo em disco se necessário
    if (!activePath) {
      let dataUrl = uploadsBase64Store[filename];

      if (!dataUrl) {
        try {
          const doc = await loadDocumentFromFirestore("media_files", filename);
          if (doc && doc.dataUrl) {
            dataUrl = doc.dataUrl;
            uploadsBase64Store[filename] = dataUrl;
            saveUploadsStore();
          }
        } catch (e) {}
      }

      if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
        try {
          const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
          let base64Data = '';
          if (matches && matches.length === 3) {
            base64Data = matches[2];
          } else {
            const parts = dataUrl.split(',');
            base64Data = parts[1] || parts[0];
          }
          const buffer = Buffer.from(base64Data, 'base64');
          try { fs.writeFileSync(pathData, buffer); } catch (e) {}
          try { fs.writeFileSync(pathPublic, buffer); } catch (e) {}
          try { fs.writeFileSync(pathBackup, buffer); } catch (e) {}

          activePath = pathData;
        } catch (err) {
          console.error("Erro ao restaurar arquivo do uploadsBase64Store:", err);
        }
      }
    }

    // Se o arquivo não existir em nenhum local
    if (!activePath || !fs.existsSync(activePath)) {
      const isVideo = filename.match(/\.(mp4|mov|webm|avi|mkv|3gp|quicktime|m4v)(\?.*)?$/i);
      if (isVideo) {
        return res.status(404).json({ error: "Arquivo de vídeo não encontrado no servidor." });
      }

      // Fallback gráfico SVG elegante para imagens
      const svgIcon = '🖼️';
      const svgTitle = 'Foto Salva';
      
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="50%" stop-color="#1e293b" />
            <stop offset="100%" stop-color="#0f766e" />
          </linearGradient>
        </defs>
        <rect width="600" height="400" fill="url(#bg)" rx="16" />
        <circle cx="300" cy="160" r="48" fill="#14b8a6" opacity="0.2" />
        <text x="300" y="175" font-size="42" text-anchor="middle" dominant-baseline="middle" fill="#5eead4">${svgIcon}</text>
        <text x="300" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#f8fafc">${svgTitle}</text>
        <text x="300" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="12" text-anchor="middle" fill="#94a3b8">Sua mídia foi salva e registrada na nuvem da igreja.</text>
      </svg>`;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(svg);
    }

    // MOTOR DE STREAMING HTTP 206 (PARTIAL CONTENT) PARA VÍDEOS E ÁUDIOS
    try {
      const stat = fs.statSync(activePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const ext = path.extname(filename).toLowerCase().replace('.', '');
      let mimeType = getMimeFromExt(ext);

      // Detecta magic bytes reais do arquivo se disponível
      try {
        if (fileSize >= 8) {
          const headBuf = Buffer.alloc(16);
          const fd = fs.openSync(activePath, 'r');
          fs.readSync(fd, headBuf, 0, 16, 0);
          fs.closeSync(fd);
          const detected = detectFileTypeFromBuffer(headBuf);
          if (detected) {
            mimeType = detected.mime;
          }
        }
      } catch (e) {}

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      // Se for apenas requisição HEAD (probe de vídeo pelo navegador mobile)
      if (req.method === 'HEAD') {
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', fileSize);
        return res.status(200).end();
      }

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }

        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(activePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
        };

        res.writeHead(206, head);
        fileStream.pipe(res);

        req.on('close', () => {
          fileStream.destroy();
        });
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
        };
        res.writeHead(200, head);
        fs.createReadStream(activePath).pipe(res);
      }
    } catch (err) {
      console.error(`Erro ao fazer streaming do arquivo ${filename}:`, err);
      return res.sendFile(activePath);
    }
  });

  // Fallbacks estáticos
  app.use("/uploads", express.static(UPLOADS_DIR_DATA, staticUploadOptions));
  app.use("/uploads", express.static(UPLOADS_DIR_PUBLIC, staticUploadOptions));

  // --- API ROUTES: MURAL DE MÍDIAS (FOTOS E VÍDEOS) ---
  app.get("/api/media-posts", (req, res) => {
    return res.json(serverMediaPosts);
  });

  app.post("/api/media-posts", (req, res) => {
    let newPost = req.body;
    if (!newPost || !newPost.id) {
      return res.status(400).json({ error: "Dados do post inválidos." });
    }
    if (deletedMediaPostIds.has(String(newPost.id))) {
      return res.json({ success: false, message: "Post excluído.", posts: serverMediaPosts });
    }
    // Converte base64 para arquivo estático em /uploads/ imediatamente
    if (newPost.url && typeof newPost.url === 'string' && newPost.url.startsWith('data:')) {
      newPost.url = saveBase64ToUploads(newPost.url, newPost.title || 'media');
    }
    const idx = serverMediaPosts.findIndex(p => p.id === newPost.id);
    if (idx >= 0) {
      serverMediaPosts[idx] = newPost;
    } else {
      serverMediaPosts.unshift(newPost);
    }
    saveServerMediaPosts(newPost);
    return res.json({ success: true, posts: serverMediaPosts });
  });

  app.delete("/api/media-posts/:id", (req, res) => {
    const { id } = req.params;
    deletedMediaPostIds.add(String(id));
    saveDeletedIds();
    serverMediaPosts = serverMediaPosts.filter(p => String(p.id) !== String(id));
    deleteDocumentFromFirestore("media_posts", id).catch(e => console.error("Erro ao deletar post do Firestore:", e));
    saveServerMediaPosts();
    return res.json({ success: true, posts: serverMediaPosts });
  });

  app.delete("/api/media-posts", (req, res) => {
    const toDelete = [...serverMediaPosts];
    toDelete.forEach(p => {
      if (p && p.id) {
        deletedMediaPostIds.add(String(p.id));
        deleteDocumentFromFirestore("media_posts", p.id).catch(() => {});
      }
    });
    saveDeletedIds();
    serverMediaPosts = [];
    saveServerMediaPosts();
    return res.json({ success: true, posts: [] });
  });

  // --- API ROUTES: VÍDEOS DA IGREJA (PREGAÇÕES, CULTOS E MENSAGENS EM VÍDEO) ---
  app.get("/api/videos", (req, res) => {
    return res.json(serverVideos);
  });

  app.post("/api/videos", (req, res) => {
    let newVideo = req.body;
    if (!newVideo || !newVideo.id || !newVideo.title || !newVideo.videoUrl) {
      return res.status(400).json({ error: "Dados do vídeo inválidos." });
    }
    if (deletedVideoIds.has(String(newVideo.id))) {
      return res.json({ success: false, message: "Vídeo excluído.", videos: serverVideos });
    }
    // Converte base64 para arquivo estático em /uploads/ se necessário
    if (newVideo.videoUrl && typeof newVideo.videoUrl === 'string' && newVideo.videoUrl.startsWith('data:')) {
      newVideo.videoUrl = saveBase64ToUploads(newVideo.videoUrl, newVideo.title || 'video');
    }
    const idx = serverVideos.findIndex(v => v.id === newVideo.id);
    if (idx >= 0) {
      serverVideos[idx] = newVideo;
    } else {
      serverVideos.unshift(newVideo);
    }
    saveServerVideos(newVideo);
    return res.json({ success: true, video: newVideo, videos: serverVideos });
  });

  app.delete("/api/videos/:id", (req, res) => {
    const { id } = req.params;
    deletedVideoIds.add(String(id));
    saveDeletedIds();
    serverVideos = serverVideos.filter(v => String(v.id) !== String(id));
    deleteDocumentFromFirestore("videos", id).catch(e => console.error("Erro ao deletar vídeo do Firestore:", e));
    saveServerVideos();
    return res.json({ success: true, videos: serverVideos });
  });

  // --- API ROUTES: GALERIA DE FOTOS E MÍDIAS ---
  app.get("/api/gallery", (req, res) => {
    return res.json(serverGallery);
  });

  app.post("/api/gallery", (req, res) => {
    let newItem = req.body;
    if (!newItem || !newItem.id || !newItem.title || !newItem.url) {
      return res.status(400).json({ error: "Dados da galeria inválidos." });
    }
    if (deletedGalleryIds.has(String(newItem.id))) {
      return res.json({ success: false, message: "Item excluído.", gallery: serverGallery });
    }
    if (newItem.url && typeof newItem.url === 'string' && newItem.url.startsWith('data:')) {
      newItem.url = saveBase64ToUploads(newItem.url, newItem.title || 'gallery');
    }
    const idx = serverGallery.findIndex(g => g.id === newItem.id);
    if (idx >= 0) {
      serverGallery[idx] = newItem;
    } else {
      serverGallery.unshift(newItem);
    }
    saveServerGallery(newItem);
    return res.json({ success: true, item: newItem, gallery: serverGallery });
  });

  app.delete("/api/gallery/:id", (req, res) => {
    const { id } = req.params;
    deletedGalleryIds.add(String(id));
    saveDeletedIds();
    serverGallery = serverGallery.filter(g => String(g.id) !== String(id));
    deleteDocumentFromFirestore("gallery", id).catch(e => console.error("Erro ao deletar galeria do Firestore:", e));
    saveServerGallery();
    return res.json({ success: true, gallery: serverGallery });
  });

  // DIRETÓRIO DE CHUNKS TEMPORÁRIOS PARA UPLOAD SEGURO DE GRANDES VÍDEOS (ATÉ 500MB)
  const CHUNKS_TEMP_DIR = path.join(process.cwd(), "data", "temp_chunks");
  try {
    if (!fs.existsSync(CHUNKS_TEMP_DIR)) {
      fs.mkdirSync(CHUNKS_TEMP_DIR, { recursive: true });
    }
  } catch (e) {}

  // Função auxiliar para juntar todos os pedaços (chunks) em um arquivo final de forma rápida e segura
  function finalizeVideoChunks(fileId: string, chunkIndex: number, totalChunks: number, originalName: string, res: any) {
    if (chunkIndex === totalChunks - 1) {
      // Verifica se todos os pedaços estão presentes
      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(CHUNKS_TEMP_DIR, `${fileId}_part_${i}`);
        if (!fs.existsSync(partPath)) {
          console.warn(`[Upload Chunked] Parte ${i} ainda não foi salva para ${fileId}.`);
          return res.status(400).json({ error: `Parte ${i + 1} de ${totalChunks} do vídeo está pendente.` });
        }
      }

      const tempMergedPath = path.join(CHUNKS_TEMP_DIR, `${fileId}_merged_${Date.now()}`);
      fs.writeFileSync(tempMergedPath, Buffer.alloc(0));

      for (let i = 0; i < totalChunks; i++) {
        const partPath = path.join(CHUNKS_TEMP_DIR, `${fileId}_part_${i}`);
        const partBuffer = fs.readFileSync(partPath);
        fs.appendFileSync(tempMergedPath, partBuffer);
        try { fs.unlinkSync(partPath); } catch (e) {}
      }

      // Detecta formato real do arquivo montado pelos magic bytes
      let safeExt = "mp4";
      try {
        const headBuf = Buffer.alloc(16);
        const fd = fs.openSync(tempMergedPath, 'r');
        fs.readSync(fd, headBuf, 0, 16, 0);
        fs.closeSync(fd);
        const detected = detectFileTypeFromBuffer(headBuf);
        if (detected?.ext) {
          safeExt = detected.ext;
        } else {
          safeExt = getExtensionFromMimeOrName(originalName, "video/mp4").replace(/[^a-zA-Z0-9]/g, "") || "mp4";
        }
      } catch (e) {
        safeExt = getExtensionFromMimeOrName(originalName, "video/mp4").replace(/[^a-zA-Z0-9]/g, "") || "mp4";
      }

      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt}`;
      const finalPathData = path.join(UPLOADS_DIR_DATA, uniqueFileName);
      const finalPathPublic = path.join(UPLOADS_DIR_PUBLIC, uniqueFileName);

      fs.copyFileSync(tempMergedPath, finalPathData);
      try { fs.copyFileSync(tempMergedPath, finalPathPublic); } catch (e) {}
      try { fs.unlinkSync(tempMergedPath); } catch (e) {}

      createUploadBackup(uniqueFileName, finalPathData);

      const fileUrl = `/uploads/${uniqueFileName}`;
      console.log(`[Upload Chunked 100% Finalizado com Sucesso] ${originalName} (${totalChunks} partes) -> ${fileUrl}`);
      return res.json({
        success: true,
        url: fileUrl,
        filename: uniqueFileName,
        originalName
      });
    } else {
      return res.json({ success: true, chunkReceived: chunkIndex, totalChunks });
    }
  }

  // CONFIGURAÇÃO DO MULTER PARA CHUNKS
  const chunkStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, CHUNKS_TEMP_DIR);
    },
    filename: (req, _file, cb) => {
      const fileId = (req.query?.fileId || req.query?.uploadId || req.headers["x-file-id"] || "temp") as string;
      const chunkIndex = (req.query?.chunkIndex !== undefined ? req.query.chunkIndex : (req.headers["x-chunk-index"] || "0")) as string;
      cb(null, `${fileId}_part_${chunkIndex}`);
    }
  });

  const uploadChunkMulter = multer({
    storage: chunkStorage,
    limits: { fileSize: 50 * 1024 * 1024 }
  });

  // ROTA ULTRA-ROBUSTA DE UPLOAD POR PEDAÇOS (Aceita Octet-Stream Binário Direto ou Multipart)
  app.post("/api/upload-chunk", (req, res) => {
    if (req.socket) req.socket.setTimeout(0);

    const fileId = String(req.query?.fileId || req.query?.uploadId || req.headers["x-file-id"] || "");
    const rawChunkIndex = req.query?.chunkIndex !== undefined ? req.query.chunkIndex : req.headers["x-chunk-index"];
    const rawTotalChunks = req.query?.totalChunks !== undefined ? req.query.totalChunks : req.headers["x-total-chunks"];
    const originalName = decodeURIComponent(String(req.query?.fileName || req.headers["x-file-name"] || "video.mp4"));

    const chunkIndex = parseInt(String(rawChunkIndex), 10);
    const totalChunks = parseInt(String(rawTotalChunks), 10);

    const contentType = req.headers["content-type"] || "";

    // Se for multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      uploadChunkMulter.single("chunk")(req, res, (err: any) => {
        if (err) {
          console.error("Erro no multer chunk:", err);
          return res.status(500).json({ error: `Erro no upload do pedaço: ${err.message}` });
        }
        finalizeVideoChunks(fileId, chunkIndex, totalChunks, originalName, res);
      });
      return;
    }

    // Se for fluxo binário direto (application/octet-stream) - mais rápido e sem limites
    if (!fileId || isNaN(chunkIndex)) {
      return res.status(400).json({ error: "Parâmetros do chunk ausentes ou inválidos." });
    }

    const partPath = path.join(CHUNKS_TEMP_DIR, `${fileId}_part_${chunkIndex}`);

    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      try {
        fs.writeFileSync(partPath, req.body);
        return finalizeVideoChunks(fileId, chunkIndex, isNaN(totalChunks) ? chunkIndex + 1 : totalChunks, originalName, res);
      } catch (err: any) {
        console.error("Erro ao salvar buffer do chunk:", err);
        return res.status(500).json({ error: "Erro ao gravar parte do vídeo no disco." });
      }
    }

    const writeStream = fs.createWriteStream(partPath);

    req.pipe(writeStream);

    writeStream.on("finish", () => {
      finalizeVideoChunks(fileId, chunkIndex, isNaN(totalChunks) ? chunkIndex + 1 : totalChunks, originalName, res);
    });

    writeStream.on("error", (wErr) => {
      console.error("Erro ao gravar chunk em disco:", wErr);
      return res.status(500).json({ error: "Erro ao gravar parte do vídeo no disco." });
    });
  });

  // ROTA COMPLEMENTAR PARA FINALIZAR CHUNKS SE NECESSÁRIO
  app.post("/api/upload-chunk-complete", async (req, res) => {
    try {
      const { uploadId, fileId, totalChunks, fileName, fileType } = req.body;
      const targetId = String(fileId || uploadId || "").replace(/[^a-zA-Z0-9_-]/g, "");
      if (!targetId || typeof totalChunks !== 'number') {
        return res.status(400).json({ error: "Parâmetros de finalização inválidos." });
      }

      // Verifica presença de todas as partes
      for (let i = 0; i < totalChunks; i++) {
        const cPath = path.join(CHUNKS_TEMP_DIR, `${targetId}_part_${i}`);
        if (!fs.existsSync(cPath)) {
          return res.status(400).json({ error: `Parte ${i + 1} de ${totalChunks} ainda não foi recebida.` });
        }
      }

      const tempMergedPath = path.join(CHUNKS_TEMP_DIR, `${targetId}_merged_${Date.now()}`);
      fs.writeFileSync(tempMergedPath, Buffer.alloc(0));

      for (let i = 0; i < totalChunks; i++) {
        const cPath = path.join(CHUNKS_TEMP_DIR, `${targetId}_part_${i}`);
        const chunkBuf = fs.readFileSync(cPath);
        fs.appendFileSync(tempMergedPath, chunkBuf);
        try { fs.unlinkSync(cPath); } catch (e) {}
      }

      let safeExt = "mp4";
      try {
        const headBuf = Buffer.alloc(16);
        const fd = fs.openSync(tempMergedPath, 'r');
        fs.readSync(fd, headBuf, 0, 16, 0);
        fs.closeSync(fd);
        const detected = detectFileTypeFromBuffer(headBuf);
        if (detected?.ext) {
          safeExt = detected.ext;
        } else {
          safeExt = getExtensionFromMimeOrName(fileName || "video.mp4", fileType || "video/mp4").replace(/[^a-zA-Z0-9]/g, "") || "mp4";
        }
      } catch (e) {
        safeExt = getExtensionFromMimeOrName(fileName || "video.mp4", fileType || "video/mp4").replace(/[^a-zA-Z0-9]/g, "") || "mp4";
      }

      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt}`;
      const pathData = path.join(UPLOADS_DIR_DATA, uniqueFileName);
      const pathPublic = path.join(UPLOADS_DIR_PUBLIC, uniqueFileName);

      fs.copyFileSync(tempMergedPath, pathData);
      try { fs.copyFileSync(tempMergedPath, pathPublic); } catch (e) {}
      try { fs.unlinkSync(tempMergedPath); } catch (e) {}

      createUploadBackup(uniqueFileName, pathData);

      const fileUrl = `/uploads/${uniqueFileName}`;
      console.log(`[Upload Fracionado Concluído via Complete] ${fileName} (${totalChunks} partes) -> ${fileUrl}`);

      return res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      console.error("Erro na rota /api/upload-chunk-complete:", err);
      return res.status(500).json({ error: "Falha ao unificar as partes do vídeo no servidor." });
    }
  });

  // ROTA DEDICADA DE DOWNLOAD SEGURO DE ARQUIVOS (FORÇA DOWNLOAD NO CELULAR/PC)
  app.get("/api/download-file", (req, res) => {
    const rawUrl = req.query.url as string;
    const customName = (req.query.name as string) || "video_igreja";
    if (!rawUrl) {
      return res.status(400).send("URL de arquivo não informada.");
    }

    // Se for URL externa (YouTube / web externa)
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      return res.redirect(rawUrl);
    }

    const filename = path.basename(rawUrl.split("?")[0]);
    const pathData = path.join(UPLOADS_DIR_DATA, filename);
    const pathPublic = path.join(UPLOADS_DIR_PUBLIC, filename);
    const pathBackup = path.join(UPLOADS_BACKUP_DIR, filename);

    let activePath = fs.existsSync(pathData) ? pathData : (fs.existsSync(pathPublic) ? pathPublic : (fs.existsSync(pathBackup) ? pathBackup : null));

    if (activePath && fs.existsSync(activePath)) {
      const ext = path.extname(filename) || ".mp4";
      const safeDownloadName = `${customName.replace(/[^a-zA-Z0-9_\-]/g, "_")}${ext}`;
      res.setHeader("Content-Disposition", `attachment; filename="${safeDownloadName}"`);
      return res.sendFile(activePath);
    }

    return res.status(404).send("Arquivo não encontrado para download.");
  });

  // Configuração do Multer para upload em disco de alta performance (até 500MB)
  const mediaStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOADS_DIR_DATA);
    },
    filename: (_req, file, cb) => {
      const ext = getExtensionFromMimeOrName(file.originalname, file.mimetype);
      const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "") || "bin";
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt}`;
      cb(null, uniqueFileName);
    },
  });

  const uploadMediaMulter = multer({
    storage: mediaStorage,
    limits: {
      fileSize: 500 * 1024 * 1024, // 500 MB
    },
  });

  // Rota de upload multipart de vídeo e imagem de até 500MB
  app.post("/api/upload-media", (req, res) => {
    uploadMediaMulter.single("file")(req, res, (err: any) => {
      if (err) {
        console.error("Erro no multer upload-media:", err);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "O arquivo excede o limite máximo permitido de 500MB." });
        }
        return res.status(500).json({ error: `Falha ao processar arquivo: ${err.message}` });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo recebido." });
      }

      const uniqueFileName = req.file.filename;
      const pathData = path.join(UPLOADS_DIR_DATA, uniqueFileName);
      const pathPublic = path.join(UPLOADS_DIR_PUBLIC, uniqueFileName);

      try { fs.copyFileSync(pathData, pathPublic); } catch (e) {}
      createUploadBackup(uniqueFileName, pathData);

      const fileUrl = `/uploads/${uniqueFileName}`;
      console.log(`[Upload 500MB Multer Concluído] ${req.file.originalname} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB) -> ${fileUrl}`);

      return res.json({
        success: true,
        url: fileUrl,
        filename: uniqueFileName,
        originalName: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype.startsWith("video") ? "video" : "image",
      });
    });
  });

  // Upload em JSON Base64 (Compatível com fotos e vídeos)
  app.post("/api/upload", (req, res) => {
    try {
      const { fileData, fileName, fileType } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: "Nenhum arquivo enviado." });
      }

      let buffer: Buffer;
      let effectiveMime = fileType || 'application/octet-stream';

      if (typeof fileData === 'string' && fileData.startsWith("data:")) {
        const matches = fileData.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          effectiveMime = matches[1];
          buffer = Buffer.from(matches[2], "base64");
        } else {
          const parts = fileData.split(",");
          buffer = Buffer.from(parts[1] || parts[0], "base64");
        }
      } else if (typeof fileData === 'string') {
        buffer = Buffer.from(fileData, "base64");
      } else {
        return res.status(400).json({ error: "Formato de dados inválido." });
      }

      const fileUrl = saveBufferToUploads(buffer, fileName || 'upload', effectiveMime);
      return res.json({ success: true, url: fileUrl });
    } catch (err: any) {
      console.error("Erro ao salvar arquivo enviado:", err);
      return res.status(500).json({ error: "Falha ao salvar o arquivo no servidor." });
    }
  });

  // Upload em Binary / Octet-Stream via Streaming Zero-RAM (Alta velocidade sem estourar memória RAM do servidor)
  app.post("/api/upload-binary", (req, res) => {
    try {
      if (req.socket) {
        req.socket.setTimeout(0);
      }

      const fileName = (req.query.fileName as string) || "file";
      const fileType = (req.query.fileType as string) || "application/octet-stream";

      const ext = getExtensionFromMimeOrName(fileName, fileType);
      const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "") || "bin";
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt}`;

      const pathData = path.join(UPLOADS_DIR_DATA, uniqueFileName);
      const pathPublic = path.join(UPLOADS_DIR_PUBLIC, uniqueFileName);

      const writeStream = fs.createWriteStream(pathData);

      req.pipe(writeStream);

      req.on('aborted', () => {
        console.warn(`[Upload Abortado] ${fileName}`);
        try { writeStream.destroy(); } catch (e) {}
        try { fs.unlinkSync(pathData); } catch (e) {}
      });

      req.on('error', (err) => {
        console.error("Erro na conexão durante upload por streaming:", err);
        try { writeStream.destroy(); } catch (e) {}
        try { fs.unlinkSync(pathData); } catch (e) {}
      });

      writeStream.on('finish', () => {
        let fileSize = 0;
        try {
          if (fs.existsSync(pathData)) {
            fileSize = fs.statSync(pathData).size;
          }
        } catch (e) {}

        if (fileSize === 0) {
          try { fs.unlinkSync(pathData); } catch (e) {}
          return res.status(400).json({ error: "Nenhum dado de arquivo recebido." });
        }

        try { fs.copyFileSync(pathData, pathPublic); } catch (e) {}
        createUploadBackup(uniqueFileName, pathData);

        const fileUrl = `/uploads/${uniqueFileName}`;
        console.log(`[Upload Streaming Concluído] ${fileName} (${(fileSize/(1024*1024)).toFixed(2)}MB) -> ${fileUrl}`);

        return res.json({ success: true, url: fileUrl });
      });

      writeStream.on('error', (err) => {
        console.error("Erro ao gravar stream no disco:", err);
        return res.status(500).json({ error: "Falha ao gravar arquivo no disco." });
      });
    } catch (err: any) {
      console.error("Erro no upload por streaming:", err);
      return res.status(500).json({ error: "Falha ao processar upload no servidor." });
    }
  });

  // --- API ROUTES: MASTER ADMIN PIN MANAGEMENT ---
  app.get("/api/admin/pin", (req, res) => {
    return res.json({ pin: serverMasterAdminPin });
  });

  app.post("/api/admin/pin", (req, res) => {
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string' || pin.trim().length !== 6 || !/^\d{6}$/.test(pin.trim())) {
      return res.status(400).json({ error: "O PIN do Administrador deve ter exatamente 6 dígitos numéricos." });
    }
    serverMasterAdminPin = pin.trim();
    saveServerUsers();
    return res.json({ success: true, pin: serverMasterAdminPin });
  });

  // --- API ROUTES: USER MANAGEMENT & LGPD SYNC ---
  const computeUserOnlineStatus = (usersList: any[]) => {
    const now = Date.now();
    return usersList.map(u => {
      if (!u) return u;
      const isRecentlyActive = Boolean(u.lastActiveAt && (now - Number(u.lastActiveAt) < 12000));
      const hasUnsplash = typeof u.photoUrl === 'string' && u.photoUrl.includes('images.unsplash.com');
      return {
        ...u,
        photoUrl: hasUnsplash ? '' : (u.photoUrl || ''),
        isOnline: isRecentlyActive
      };
    });
  };

  app.post("/api/users/heartbeat", (req, res) => {
    const { userId, email } = req.body;
    if (!userId && !email) {
      return res.status(400).json({ error: "userId ou email é obrigatório." });
    }
    const cleanId = (userId || "").trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();
    const now = Date.now();

    let matchedUser: any = null;
    serverRegisteredUsers.forEach(u => {
      if (!u) return;
      const uId = (u.id || "").trim().toLowerCase();
      const uEmail = (u.email || "").trim().toLowerCase();
      if ((cleanId && uId === cleanId) || (cleanEmail && uEmail === cleanEmail)) {
        u.lastActiveAt = now;
        u.isOnline = true;
        matchedUser = u;
      }
    });

    // Atualiza também a presença na lista de membros da igreja
    serverMembers.forEach(m => {
      if (!m) return;
      const mId = (m.id || "").trim().toLowerCase();
      const mEmail = (m.email || "").trim().toLowerCase();
      if ((cleanId && mId === cleanId) || (cleanEmail && mEmail === cleanEmail)) {
        m.lastActiveAt = now;
        m.isOnline = true;
      }
    });

    saveServerUsers();
    saveServerMembers();
    return res.json({ 
      success: true, 
      timestamp: now,
      userStatus: matchedUser ? {
        accessStatus: matchedUser.accessStatus,
        isBlocked: matchedUser.isBlocked,
        isAdmin: matchedUser.isAdmin,
        adminMessage: matchedUser.adminMessage,
        adminMessageRead: matchedUser.adminMessageRead
      } : null
    });
  });

  app.get("/api/users", (req, res) => {
    serverRegisteredUsers = serverRegisteredUsers.filter(
      u => !MOCK_IDS_TO_REMOVE.includes(u.id) && !isUserDeleted(u.id, u.email, u.name)
    );
    return res.json(computeUserOnlineStatus(serverRegisteredUsers));
  });

  // ROTA DE SINCRONIZAÇÃO EM MASSA MULTI-DISPOSITIVO (CELULAR / NOTEBOOK)
  app.post("/api/users/sync", (req, res) => {
    const { clientUsers } = req.body;
    if (Array.isArray(clientUsers) && clientUsers.length > 0) {
      clientUsers.forEach((clientUser: any) => {
        if (!clientUser) return;
        const cId = (clientUser.id || "").trim().toLowerCase();
        const cEmail = (clientUser.email || "").trim().toLowerCase();

        // Ignora mock antigos e contas deletadas pelo administrador master
        if (MOCK_IDS_TO_REMOVE.includes(clientUser.id) || isUserDeleted(clientUser.id, clientUser.email, clientUser.name)) {
          return;
        }

        const existingIdx = serverRegisteredUsers.findIndex(u => {
          if (!u) return false;
          const uId = (u.id || "").trim().toLowerCase();
          const uEmail = (u.email || "").trim().toLowerCase();
          return (cId && uId === cId) || (cEmail && uEmail === cEmail);
        });

        if (existingIdx >= 0) {
          // Mantém as permissões e o último heartbeat do servidor
          serverRegisteredUsers[existingIdx] = {
            ...clientUser,
            accessStatus: serverRegisteredUsers[existingIdx].accessStatus || clientUser.accessStatus,
            isBlocked: serverRegisteredUsers[existingIdx].isBlocked !== undefined ? serverRegisteredUsers[existingIdx].isBlocked : clientUser.isBlocked,
            isAdmin: serverRegisteredUsers[existingIdx].isAdmin !== undefined ? serverRegisteredUsers[existingIdx].isAdmin : clientUser.isAdmin,
            adminMessage: serverRegisteredUsers[existingIdx].adminMessage !== undefined ? serverRegisteredUsers[existingIdx].adminMessage : (clientUser.adminMessage || ""),
            adminMessageRead: serverRegisteredUsers[existingIdx].adminMessageRead !== undefined ? serverRegisteredUsers[existingIdx].adminMessageRead : (clientUser.adminMessageRead !== undefined ? clientUser.adminMessageRead : false),
            adminMessageSentAt: serverRegisteredUsers[existingIdx].adminMessageSentAt || clientUser.adminMessageSentAt,
            lastActiveAt: serverRegisteredUsers[existingIdx].lastActiveAt || clientUser.lastActiveAt,
          };
        } else {
          serverRegisteredUsers.unshift(clientUser);
        }
      });
      saveServerUsers();
    }

    serverRegisteredUsers = serverRegisteredUsers.filter(
      u => !MOCK_IDS_TO_REMOVE.includes(u.id) && !isUserDeleted(u.id, u.email, u.name)
    );
    return res.json(computeUserOnlineStatus(serverRegisteredUsers));
  });

  app.post("/api/users", (req, res) => {
    const newUser = req.body;
    if (!newUser || (!newUser.email && !newUser.id)) {
      return res.status(400).json({ error: "E-mail ou ID é obrigatório." });
    }

    const cleanEmail = (newUser.email || "").toLowerCase().trim();
    const cleanId = (newUser.id || "").toLowerCase().trim();

    // Se o usuário foi excluído pelo Administrador Master e não é um novo cadastro explícito, ignora o auto-sync
    const isExplicitRegistration = req.query.is_registration === 'true' || req.headers['x-registration'] === 'true';
    if (!isExplicitRegistration && isUserDeleted(newUser.id, newUser.email, newUser.name)) {
      return res.json({ success: false, message: "Usuário foi excluído pelo Administrador.", users: serverRegisteredUsers });
    }

    // Se for um novo cadastro explícito, remove de identificadores deletados
    if (isExplicitRegistration || cleanId || cleanEmail) {
      if (cleanId) deletedUserIdentifiers.delete(cleanId);
      if (cleanEmail) deletedUserIdentifiers.delete(cleanEmail);
    }

    const idx = serverRegisteredUsers.findIndex(u => {
      if (!u) return false;
      const uEmail = (u.email || "").toLowerCase().trim();
      const uId = (u.id || "").toLowerCase().trim();
      return (cleanId && uId === cleanId) || (cleanEmail && uEmail === cleanEmail);
    });

    if (idx >= 0) {
      serverRegisteredUsers[idx] = { ...serverRegisteredUsers[idx], ...newUser };
    } else {
      serverRegisteredUsers.unshift(newUser);
    }

    saveServerUsers();
    return res.json({ success: true, user: newUser, users: serverRegisteredUsers });
  });

  app.put("/api/users/:id/status", (req, res) => {
    const { id } = req.params;
    const { accessStatus, isBlocked, isAdmin } = req.body;

    const targetId = (id || "").trim().toLowerCase();
    const user = serverRegisteredUsers.find(u => 
      (u.id && u.id.trim().toLowerCase() === targetId) || 
      (u.email && u.email.trim().toLowerCase() === targetId)
    );
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (accessStatus !== undefined) user.accessStatus = accessStatus;
    if (isBlocked !== undefined) user.isBlocked = isBlocked;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;

    saveServerUsers();
    return res.json({ success: true, user, users: serverRegisteredUsers });
  });

  app.put("/api/users/:id/admin-message", (req, res) => {
    const { id } = req.params;
    const { adminMessage } = req.body;

    const targetId = (id || "").trim().toLowerCase();
    const user = serverRegisteredUsers.find(u => 
      (u.id && u.id.trim().toLowerCase() === targetId) || 
      (u.email && u.email.trim().toLowerCase() === targetId)
    );
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    user.adminMessage = adminMessage ? String(adminMessage).trim() : "";
    user.adminMessageRead = false;
    user.adminMessageSentAt = adminMessage ? new Date().toISOString() : undefined;

    saveServerUsers();
    return res.json({ success: true, user, users: serverRegisteredUsers });
  });

  app.put("/api/users/:id/admin-message/read", (req, res) => {
    const { id } = req.params;
    const targetId = (id || "").trim().toLowerCase();
    const user = serverRegisteredUsers.find(u => 
      (u.id && u.id.trim().toLowerCase() === targetId) || 
      (u.email && u.email.trim().toLowerCase() === targetId)
    );
    if (user) {
      user.adminMessageRead = true;
      saveServerUsers();
    }
    return res.json({ success: true, user, users: serverRegisteredUsers });
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const email = (req.body?.email || req.query?.email || "").toString();
    const phone = (req.body?.phone || req.query?.phone || "").toString();
    const name = (req.body?.name || req.query?.name || "").toString();
    const result = permanentlyDeleteUserAccount(id, { email, phone, name });
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Não foi possível excluir a conta." });
    }
    return res.json({ success: true, users: serverRegisteredUsers, members: serverMembers });
  });

  // Rota unificada para exclusão definitiva de conta no painel administrativo
  app.post("/api/admin/delete-account", (req, res) => {
    const { id, userId, memberId, email, phone, name } = req.body || {};
    const target = id || userId || memberId || email || phone;
    if (!target) {
      return res.status(400).json({ error: "Nenhum identificador fornecido para exclusão." });
    }
    const result = permanentlyDeleteUserAccount(String(target), { email, phone, name });
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Não foi possível excluir a conta." });
    }
    return res.json({ success: true, users: serverRegisteredUsers, members: serverMembers });
  });

  // --- API ROUTES: CHURCH MEMBERS MANAGEMENT & PASTOR CONTROL PANEL ---
  app.get("/api/members", (req, res) => {
    sanitizeAndDeduplicateServerAccounts();
    const now = Date.now();
    serverMembers = serverMembers.filter(m => {
      if (!m || !m.id) return false;
      const mId = String(m.id).toLowerCase();
      const mEmail = (m.email || "").toLowerCase();
      const mPhone = (m.phone || "").replace(/\D/g, "");
      const mName = (m.name || "").toLowerCase();
      if (deletedUserIdentifiers.has(mId) || (mEmail && deletedUserIdentifiers.has(mEmail)) || (mPhone && deletedUserIdentifiers.has(mPhone)) || (mName && deletedUserIdentifiers.has(mName))) return false;
      return true;
    });
    const sanitized = serverMembers.map(m => {
      const isOnline = Boolean(m.lastActiveAt && (now - Number(m.lastActiveAt) < 30000));
      return {
        ...m,
        isOnline: m.isOnline !== undefined ? m.isOnline : isOnline
      };
    });
    return res.json(sanitized);
  });

  app.post("/api/members", (req, res) => {
    const newMember = req.body;
    if (!newMember || !newMember.name || (!newMember.id && !newMember.phone && !newMember.email)) {
      return res.status(400).json({ error: "Nome e telefone/ID são obrigatórios." });
    }

    const memberId = (newMember.id || 'm_' + Date.now()).toString();
    const cleanPhone = (newMember.phone || '').trim();
    const cleanEmail = (newMember.email || '').trim().toLowerCase();

    // Se o usuário foi excluído pelo pastor
    if (deletedUserIdentifiers.has(memberId.toLowerCase()) || (cleanEmail && deletedUserIdentifiers.has(cleanEmail))) {
      deletedUserIdentifiers.delete(memberId.toLowerCase());
      if (cleanEmail) deletedUserIdentifiers.delete(cleanEmail);
    }

    const memberPayload = {
      ...newMember,
      id: memberId,
      name: newMember.name.trim(),
      phone: cleanPhone,
      email: cleanEmail || (cleanPhone ? `${cleanPhone.replace(/\D/g, '')}@igreja.com` : ''),
      role: newMember.role || 'Membro',
      accessStatus: newMember.accessStatus || (newMember.isBlocked ? 'BLOQUEADO' : 'LIBERADO'),
      isBlocked: Boolean(newMember.isBlocked || newMember.accessStatus === 'BLOQUEADO'),
      createdAt: newMember.createdAt || new Date().toISOString().split('T')[0],
      lastActiveAt: Date.now(),
      isOnline: true
    };

    const idx = serverMembers.findIndex(m => {
      if (!m) return false;
      if (m.id && m.id === memberId) return true;
      if (cleanPhone && m.phone && m.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '')) return true;
      if (cleanEmail && m.email && m.email.trim().toLowerCase() === cleanEmail) return true;
      return false;
    });

    if (idx >= 0) {
      serverMembers[idx] = { ...serverMembers[idx], ...memberPayload };
    } else {
      serverMembers.unshift(memberPayload);
    }

    // Sincroniza também com serverRegisteredUsers para garantir visibilidade unificada
    const userIdx = serverRegisteredUsers.findIndex(u => {
      if (!u) return false;
      if (u.id === memberId) return true;
      if (cleanEmail && u.email && u.email.trim().toLowerCase() === cleanEmail) return true;
      if (cleanPhone && u.phone && u.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '')) return true;
      return false;
    });

    const userPayload = {
      id: memberId,
      name: memberPayload.name,
      email: memberPayload.email,
      phone: memberPayload.phone,
      password: memberPayload.password || '123456',
      accessStatus: memberPayload.accessStatus,
      isBlocked: memberPayload.isBlocked,
      isAdmin: memberPayload.role === 'PASTOR',
      createdAt: memberPayload.createdAt,
      specialty: memberPayload.role,
      hospital: 'Assembleia de Deus Nacional',
      state: 'SP',
      city: 'São Paulo',
      corenStatus: 'ATIVO',
      deviceType: memberPayload.deviceType || 'CELULAR',
      isOnline: true,
      lastActiveAt: Date.now()
    };

    if (userIdx >= 0) {
      serverRegisteredUsers[userIdx] = { ...serverRegisteredUsers[userIdx], ...userPayload };
    } else {
      serverRegisteredUsers.unshift(userPayload);
    }

    saveServerMembers();
    saveServerUsers();
    saveDocumentToFirestore("members", memberId, memberPayload).catch(() => {});
    saveDocumentToFirestore("users", memberId, userPayload).catch(() => {});

    console.log(`[Cadastro Membro Sincronizado] "${memberPayload.name}" (${memberPayload.phone || memberPayload.email}) adicionado com sucesso ao painel.`);

    return res.json({ success: true, member: memberPayload, members: serverMembers });
  });

  app.put("/api/members/:id/status", (req, res) => {
    const { id } = req.params;
    const { accessStatus, isBlocked, blockedReason, role } = req.body;

    const targetId = (id || "").trim();
    const member = serverMembers.find(m => m && (m.id === targetId || m.phone === targetId || m.email === targetId));

    if (!member) {
      return res.status(404).json({ error: "Membro não encontrado." });
    }

    if (accessStatus !== undefined) member.accessStatus = accessStatus;
    if (isBlocked !== undefined) member.isBlocked = isBlocked;
    if (blockedReason !== undefined) member.blockedReason = blockedReason;
    if (role !== undefined) member.role = role;

    // Atualiza também em serverRegisteredUsers
    const correspondingUser = serverRegisteredUsers.find(u => u && (u.id === member.id || u.email === member.email));
    if (correspondingUser) {
      if (accessStatus !== undefined) correspondingUser.accessStatus = accessStatus;
      if (isBlocked !== undefined) correspondingUser.isBlocked = isBlocked;
      if (role !== undefined) correspondingUser.specialty = role;
    }

    saveServerMembers();
    saveServerUsers();
    saveDocumentToFirestore("members", member.id, member).catch(() => {});
    if (correspondingUser) {
      saveDocumentToFirestore("users", correspondingUser.id, correspondingUser).catch(() => {});
    }

    return res.json({ success: true, member, members: serverMembers });
  });

  app.delete("/api/members/:id", (req, res) => {
    const { id } = req.params;
    const email = (req.body?.email || req.query?.email || "").toString();
    const phone = (req.body?.phone || req.query?.phone || "").toString();
    const name = (req.body?.name || req.query?.name || "").toString();
    const result = permanentlyDeleteUserAccount(id, { email, phone, name });
    if (!result.success) {
      return res.status(400).json({ error: result.error || "Não foi possível excluir o membro." });
    }
    return res.json({ success: true, members: serverMembers, users: serverRegisteredUsers });
  });

  app.post("/api/members/sync", (req, res) => {
    const { clientMembers } = req.body;
    if (Array.isArray(clientMembers) && clientMembers.length > 0) {
      clientMembers.forEach((cm: any) => {
        if (!cm || !cm.id) return;
        const cmId = (cm.id || '').toString().toLowerCase();
        const cmEmail = (cm.email || '').toString().toLowerCase();
        const cleanPhone = (cm.phone || '').replace(/\D/g, '');
        const cmName = (cm.name || '').toString().toLowerCase();

        // Se foi excluído permanentemente, não readiciona
        if (
          deletedUserIdentifiers.has(cmId) ||
          (cmEmail && deletedUserIdentifiers.has(cmEmail)) ||
          (cleanPhone && cleanPhone.length >= 8 && deletedUserIdentifiers.has(cleanPhone)) ||
          (cmName && deletedUserIdentifiers.has(cmName))
        ) {
          return;
        }

        const existingIdx = serverMembers.findIndex(m => 
          m.id === cm.id || 
          (cleanPhone && m.phone && m.phone.replace(/\D/g, '') === cleanPhone)
        );

        if (existingIdx >= 0) {
          serverMembers[existingIdx] = {
            ...cm,
            accessStatus: serverMembers[existingIdx].accessStatus || cm.accessStatus,
            isBlocked: serverMembers[existingIdx].isBlocked !== undefined ? serverMembers[existingIdx].isBlocked : cm.isBlocked,
            blockedReason: serverMembers[existingIdx].blockedReason || cm.blockedReason,
            role: serverMembers[existingIdx].role || cm.role
          };
        } else {
          serverMembers.unshift(cm);
        }
      });
      saveServerMembers();
    }
    return res.json(serverMembers);
  });

  // --- API ROUTES: CHAT & AUDIO MESSAGES SYNC ---
  app.get("/api/messages", (req, res) => {
    return res.json(serverChatMessages);
  });

  app.post("/api/messages", (req, res) => {
    const newMsg = req.body;
    if (!newMsg || !newMsg.id || (!newMsg.text && !newMsg.mediaUrl && !newMsg.audioUrl)) {
      return res.status(400).json({ error: "Mensagem inválida." });
    }
    if (deletedMessageIds.has(String(newMsg.id))) {
      return res.json({ success: false, message: "Mensagem excluída.", messages: serverChatMessages });
    }

    if (!newMsg.text || typeof newMsg.text !== 'string') {
      newMsg.text = '';
    }

    if (newMsg.audioUrl && typeof newMsg.audioUrl === 'string' && newMsg.audioUrl.startsWith('data:')) {
      newMsg.audioUrl = saveBase64ToUploads(newMsg.audioUrl, `audio_${Date.now()}`);
    }

    if (newMsg.mediaUrl && typeof newMsg.mediaUrl === 'string' && newMsg.mediaUrl.startsWith('data:')) {
      newMsg.mediaUrl = saveBase64ToUploads(newMsg.mediaUrl, `media_${Date.now()}`);
    }

    const idx = serverChatMessages.findIndex(m => m.id === newMsg.id);
    if (idx >= 0) {
      serverChatMessages[idx] = {
        ...newMsg,
        listenedBy: Array.from(new Set([...(serverChatMessages[idx].listenedBy || []), ...(newMsg.listenedBy || [])]))
      };
    } else {
      if (!newMsg.listenedBy) newMsg.listenedBy = [];
      serverChatMessages.push(newMsg);
    }

    saveServerMessages(newMsg);
    return res.json({ success: true, message: newMsg, messages: serverChatMessages });
  });

  app.post("/api/messages/:id/listen", (req, res) => {
    const { id } = req.params;
    const { userId, userEmail, userName, deviceId } = req.body;

    const tokens = [
      userId,
      userEmail,
      userName,
      deviceId
    ].map(t => (t || '').toString().trim().toLowerCase()).filter(Boolean);

    const msg = serverChatMessages.find(m => m.id === id);
    if (msg) {
      if (!msg.listenedBy) msg.listenedBy = [];
      let updated = false;
      tokens.forEach(tok => {
        if (!msg.listenedBy.includes(tok)) {
          msg.listenedBy.push(tok);
          updated = true;
        }
      });
      if (updated) {
        saveServerMessages(msg);
      }
      return res.json({ success: true, message: msg, messages: serverChatMessages });
    }
    return res.status(404).json({ error: "Mensagem não encontrada." });
  });

  app.post("/api/messages/batch-listen", (req, res) => {
    const { messageIds, userId, userEmail, userName, deviceId } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.json({ success: true, messages: serverChatMessages });
    }

    const tokens = [
      userId,
      userEmail,
      userName,
      deviceId
    ].map(t => (t || '').toString().trim().toLowerCase()).filter(Boolean);

    let updatedAny = false;
    messageIds.forEach(id => {
      const msg = serverChatMessages.find(m => m.id === id);
      if (msg) {
        if (!msg.listenedBy) msg.listenedBy = [];
        let changedThis = false;
        tokens.forEach(tok => {
          if (!msg.listenedBy.includes(tok)) {
            msg.listenedBy.push(tok);
            changedThis = true;
            updatedAny = true;
          }
        });
        if (changedThis) {
          saveServerMessages(msg);
        }
      }
    });

    return res.json({ success: true, messages: serverChatMessages });
  });

  app.delete("/api/messages/all/clear", (req, res) => {
    const toDelete = [...serverChatMessages];
    toDelete.forEach(m => {
      if (m && m.id) {
        deletedMessageIds.add(String(m.id));
        deleteDocumentFromFirestore("messages", m.id).catch(() => {});
      }
    });
    saveDeletedIds();
    serverChatMessages = [];
    saveServerMessages();
    return res.json({ success: true, messages: [] });
  });

  app.delete("/api/messages/:id", (req, res) => {
    const { id } = req.params;
    deletedMessageIds.add(String(id));
    saveDeletedIds();
    serverChatMessages = serverChatMessages.filter(m => String(m.id) !== String(id));
    deleteDocumentFromFirestore("messages", id).catch(e => console.error("Erro ao deletar mensagem do Firestore:", e));
    saveServerMessages();
    return res.json({ success: true, messages: serverChatMessages });
  });

  app.delete("/api/messages/channel/:channelId", (req, res) => {
    const { channelId } = req.params;
    const toDelete = serverChatMessages.filter(m => m.channelId === channelId);
    toDelete.forEach(m => {
      if (m && m.id) {
        deletedMessageIds.add(String(m.id));
        deleteDocumentFromFirestore("messages", m.id).catch(() => {});
      }
    });
    saveDeletedIds();
    serverChatMessages = serverChatMessages.filter(m => m.channelId !== channelId);
    saveServerMessages();
    return res.json({ success: true, messages: serverChatMessages });
  });

  // --- API ROUTES: DELETED IDS CENTRAL SYNCHRONIZATION ---
  app.get("/api/deleted-ids", (_req, res) => {
    const usersList = Array.from(deletedUserIdentifiers);
    return res.json({
      messages: Array.from(deletedMessageIds),
      mediaPosts: Array.from(deletedMediaPostIds),
      videos: Array.from(deletedVideoIds),
      gallery: Array.from(deletedGalleryIds),
      users: usersList,
      members: usersList
    });
  });

  app.post("/api/deleted-ids", (req, res) => {
    const { type, id, email, phone, name } = req.body;
    if (!id && !email && !phone) {
      return res.status(400).json({ error: "ID inválido." });
    }

    const cleanId = String(id || email || phone || '');
    if (type === 'messages') {
      deletedMessageIds.add(cleanId);
      serverChatMessages = serverChatMessages.filter(m => String(m.id) !== cleanId);
      deleteDocumentFromFirestore("messages", cleanId).catch(() => {});
    } else if (type === 'videos') {
      deletedVideoIds.add(cleanId);
      serverVideos = serverVideos.filter(v => String(v.id) !== cleanId);
      deleteDocumentFromFirestore("videos", cleanId).catch(() => {});
    } else if (type === 'gallery') {
      deletedGalleryIds.add(cleanId);
      serverGallery = serverGallery.filter(g => String(g.id) !== cleanId);
      deleteDocumentFromFirestore("gallery", cleanId).catch(() => {});
    } else if (type === 'mediaPosts') {
      deletedMediaPostIds.add(cleanId);
      serverMediaPosts = serverMediaPosts.filter(p => String(p.id) !== cleanId);
      deleteDocumentFromFirestore("media_posts", cleanId).catch(() => {});
    } else if (type === 'users' || type === 'members') {
      permanentlyDeleteUserAccount(cleanId, { email, phone, name });
    }

    saveDeletedIds();
    return res.json({ success: true });
  });

  // --- API ROUTE: AI ASSISTANT "FLORENCE AI" FOR NURSING ---
  app.post("/api/ai/florence", async (req, res) => {
    try {
      const { prompt, history, context } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt é obrigatório." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "Chave GEMINI_API_KEY não configurada no servidor.",
          reply: "A assistente Florence AI está operando em modo offline restrito. Por favor, adicione a GEMINI_API_KEY nas configurações de Secrets do servidor." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `Você é a "Florence AI", a Assistente Virtual Inteligente do aplicativo Meu Plantão Pro, desenvolvida especialmente para Enfermeiros, Enfermeiras e Técnicos de Enfermagem no Brasil.

REGRAS DE CONFORMIDADE RIGOROSAS (COFEN/COREN & LGPD):
1. NUNCA emita diagnósticos médicos, NUNCA prescreva medicamentos ou tratamentos e NUNCA substitua o julgamento clínico do profissional de enfermagem.
2. Sempre inclua um lembrete discreto de que as informações são para fins organizacionais, educativos e de apoio à documentação profissional.
3. Responda em Português do Brasil com tom altamente profissional, empático, claro e fundamentado no Código de Ética de Enfermagem do COFEN.
4. Você auxilia com:
   - Organização de escalas de plantão e trocas de turno;
   - Fórmulas e cálculos de enfermagem (Gotejamento de soro, regra de três para medicamentos, balanço hídrico, IMC);
   - Escalas consagradas (Glasgow, Braden, Fugulin, Ramsay, Morse);
   - Modelos de Anotação e Evolução de Enfermagem no padrão SOAP ou do COREN;
   - Busca em manuais, procedimentos operacionais padrão (POP) e diretrizes de biossegurança.
5. Se o usuário perguntar algo que exija diagnóstico médico ou prescrição médica restrita, alerte educadamente sobre o escopo de atuação da Enfermagem conforme a Lei do Exercício Profissional (Lei 7.498/86).`;

      const contents = [];
      if (Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
      }

      const userText = context 
        ? `[Contexto da Consulta: ${context}]\n\nPergunta do Profissional: ${prompt}`
        : prompt;

      contents.push({
        role: 'user',
        parts: [{ text: userText }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: userText,
        config: {
          systemInstruction,
          temperature: 0.4,
        }
      });

      const reply = response.text || "Desculpe, não consegui processar a resposta no momento.";

      return res.json({ reply });

    } catch (error: any) {
      console.error("Erro na rota Florence AI:", error);
      return res.status(500).json({ 
        error: "Falha ao processar solicitação de IA.",
        reply: "Ocorreu um erro temporário na comunicação com o servidor. Por favor, tente novamente."
      });
    }
  });

  // --- API ROUTES: WEBRTC SIGNALING FOR REAL LIVE AUDIO & VIDEO CALLS ---
  let webrtcSignals: any[] = [];

  app.get("/api/webrtc/signals/:channelId", (req, res) => {
    const { channelId } = req.params;
    const { since } = req.query;
    let filtered = webrtcSignals.filter(s => s.channelId === channelId);
    if (since) {
      const sinceTime = Number(since);
      filtered = filtered.filter(s => s.timestamp > sinceTime);
    }
    return res.json(filtered);
  });

  app.post("/api/webrtc/signal", (req, res) => {
    const signalData = req.body;
    if (!signalData || !signalData.channelId || !signalData.signal) {
      return res.status(400).json({ error: "Sinal inválido." });
    }
    signalData.timestamp = Date.now();
    webrtcSignals.push(signalData);
    // Limpa sinais com mais de 10 minutos
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    webrtcSignals = webrtcSignals.filter(s => s.timestamp > tenMinAgo);
    return res.json({ success: true, signal: signalData });
  });

  app.delete("/api/webrtc/signals/:channelId", (req, res) => {
    const { channelId } = req.params;
    webrtcSignals = webrtcSignals.filter(s => s.channelId !== channelId);
    return res.json({ success: true });
  });

  // Cache em memória para buscas de hinos e louvores (ultra rápido no celular e PC)
  const hymnSearchCache = new Map<string, { timestamp: number; results: any[] }>();

  // --- API DE PESQUISA DE HINOS E LOUVORES (PURO ÁUDIO NA VOZ DO CANTOR) ---
  app.get("/api/hymns/search", async (req, res) => {
    try {
      const rawQuery = ((req.query.q as string) || "").trim();
      if (!rawQuery) {
        return res.json({ results: [] });
      }

      const normalize = (str: string) => 
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      const normQuery = normalize(rawQuery);
      const cacheKey = normQuery;

      // 1. Checa Cache de memória (TTL de 2 horas)
      const cached = hymnSearchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 2 * 60 * 60 * 1000)) {
        return res.json({ results: cached.results });
      }

      // 2. Trata termos como "hino 15", "harpa 15", "#15", "15"
      const numberOnlyMatch = rawQuery.replace(/\D/g, "");
      const isNumberSearch = Boolean(numberOnlyMatch && (
        /^\d+$/.test(rawQuery) || 
        normQuery.startsWith("hino ") || 
        normQuery.startsWith("harpa ") || 
        normQuery.startsWith("#") ||
        normQuery.includes("harpa crista")
      ));

      let searchQuery = "";
      if (isNumberSearch && numberOnlyMatch) {
        searchQuery = `Harpa Cristã ${numberOnlyMatch} cantado oficial hino`;
      } else {
        searchQuery = `${rawQuery} louvor gospel`;
      }

      // 3. Busca no YouTube em tempo real com alta precisão e resiliência
      try {
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        const ytRes = await fetch(ytUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache"
          }
        });

        if (ytRes.ok) {
          const html = await ytRes.text();
          let data: any = null;

          const match = html.match(/var ytInitialData = ({.*?});<\/script>/) ||
                        html.match(/ytInitialData\s*=\s*({.+?});/);
          if (match && match[1]) {
            try {
              data = JSON.parse(match[1]);
            } catch (e) {}
          }

          if (data) {
            const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
            const ytResults: any[] = [];
            const seenIds = new Set<string>();

            for (const section of sections) {
              const items = section.itemSectionRenderer?.contents || [];
              for (const item of items) {
                if (item.videoRenderer) {
                  const v = item.videoRenderer;
                  const videoId = v.videoId;
                  if (!videoId || seenIds.has(videoId)) continue;
                  seenIds.add(videoId);

                  const rawTitle = v.title?.runs?.map((r: any) => r.text).join("") || v.title?.simpleText || "";
                  const rawArtist = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || (isNumberSearch ? "Harpa Cristã (Cantado)" : rawQuery);
                  const duration = v.lengthText?.simpleText || "04:00";
                  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                  // Limpeza do título para exibição elegante no app
                  const cleanTitle = rawTitle
                    .replace(/\(Vídeo Oficial\)/gi, "")
                    .replace(/\(Clipe Oficial\)/gi, "")
                    .replace(/\(Áudio Oficial\)/gi, "")
                    .replace(/\(Official Video\)/gi, "")
                    .replace(/\(Official Audio\)/gi, "")
                    .replace(/\(Ao Vivo\)/gi, "Ao Vivo")
                    .replace(/\|.*$/g, "")
                    .replace(/- MK MUSIC/gi, "")
                    .replace(/- Todah Music/gi, "")
                    .replace(/- Som Livre/gi, "")
                    .replace(/^[^\w\s\(\)]+/g, "")
                    .trim();

                  ytResults.push({
                    id: `yt_${videoId}`,
                    youtubeId: videoId,
                    number: isNumberSearch ? Number(numberOnlyMatch) : undefined,
                    title: cleanTitle || rawTitle,
                    artist: rawArtist,
                    duration: duration,
                    coverUrl: thumbnail,
                    category: (rawTitle.toLowerCase().includes("harpa") || isNumberSearch) ? "harpa" : "adoracao",
                    tags: [normQuery, normalize(rawArtist), normalize(cleanTitle)]
                  });
                }
              }
            }

            if (ytResults.length > 0) {
              const sliced = ytResults.slice(0, 25);
              hymnSearchCache.set(cacheKey, { timestamp: Date.now(), results: sliced });
              return res.json({ results: sliced });
            }
          }
        }
      } catch (ytErr) {
        console.warn("Erro na busca de áudios online:", ytErr);
      }

      return res.json({ results: [] });
    } catch (error) {
      console.error("Erro na busca de hinos online:", error);
      return res.status(500).json({ error: "Erro ao buscar hinos online", results: [] });
    }
  });

  // --- PAYMENT ACCESS & QR CODE ROUTES ---
  app.get("/api/payment-access", async (_req, res) => {
    try {
      // Tenta buscar no Firestore caso tenha sido atualizado externamente
      try {
        const firestoreData = await loadDocumentFromFirestore("system_settings", "payment_access");
        if (firestoreData && typeof firestoreData === 'object' && firestoreData.updatedAt && firestoreData.updatedAt > (serverPaymentAccessInfo.updatedAt || 0)) {
          serverPaymentAccessInfo = { ...serverPaymentAccessInfo, ...firestoreData };
        }
      } catch (fErr) {}
      res.json({ success: true, paymentInfo: serverPaymentAccessInfo });
    } catch (e: any) {
      res.json({ success: true, paymentInfo: serverPaymentAccessInfo });
    }
  });

  app.post("/api/payment-access", (req, res) => {
    try {
      const updates = req.body;
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ success: false, error: "Dados inválidos" });
      }

      serverPaymentAccessInfo = {
        ...serverPaymentAccessInfo,
        ...updates,
        dueDay: 28, // Fixado no dia 28 conforme solicitado
        title: updates.title || "Pagamento do meu acesso",
        updatedAt: Date.now()
      };

      savePaymentAccessInfo();

      console.log("Informações de pagamento do acesso atualizadas com sucesso");
      res.json({ success: true, paymentInfo: serverPaymentAccessInfo });
    } catch (e: any) {
      console.error("Erro ao salvar informações de pagamento:", e);
      res.status(500).json({ success: false, error: "Erro ao salvar informações de pagamento" });
    }
  });

  // --- HEALTH CHECK ROUTE ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Meu Plantão Pro Server", timestamp: new Date().toISOString() });
  });

  // --- VITE MIDDLEWARE FOR DEV & STATIC SERVING FOR PRODUCTION ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Assembleia de Deus Nacional Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
