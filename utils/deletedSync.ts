import { syncDocToFirestore, deleteDocFromFirestore, fetchCollectionFromFirestore } from './clientFirebase';
import { deleteAudioBlobLocally } from './audioStorage';
import { deletePhotoBlobLocally } from './galleryStorage';
import { ChatMessage, VideoItem, GalleryItem, Member, UserProfile } from '../types';

interface DeletedIdsPayload {
  messages?: string[];
  videos?: string[];
  gallery?: string[];
  mediaPosts?: string[];
  users?: string[];
  members?: string[];
}

const STORAGE_KEY = 'ad_deleted_ids_cache';
const LEGACY_DELETED_MEMBERS_KEY = 'ad_deleted_member_ids';

const memoryDeleted = {
  messages: new Set<string>(),
  videos: new Set<string>(),
  gallery: new Set<string>(),
  mediaPosts: new Set<string>(),
  users: new Set<string>()
};

function normalizeIdentifier(val?: string | null): string {
  return (val || '').toString().trim().toLowerCase();
}

function extractPhoneDigits(val?: string | null): string {
  return (val || '').toString().replace(/\D/g, '');
}

// Carrega imediatamente do localStorage
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed: DeletedIdsPayload = JSON.parse(saved);
    if (Array.isArray(parsed.messages)) parsed.messages.forEach(id => memoryDeleted.messages.add(String(id)));
    if (Array.isArray(parsed.videos)) parsed.videos.forEach(id => memoryDeleted.videos.add(String(id)));
    if (Array.isArray(parsed.gallery)) parsed.gallery.forEach(id => memoryDeleted.gallery.add(String(id)));
    if (Array.isArray(parsed.mediaPosts)) parsed.mediaPosts.forEach(id => memoryDeleted.mediaPosts.add(String(id)));
    if (Array.isArray(parsed.users)) parsed.users.forEach(id => memoryDeleted.users.add(normalizeIdentifier(id)));
    if (Array.isArray(parsed.members)) parsed.members.forEach(id => memoryDeleted.users.add(normalizeIdentifier(id)));
  }

  const legacySaved = localStorage.getItem(LEGACY_DELETED_MEMBERS_KEY);
  if (legacySaved) {
    const legacyArr = JSON.parse(legacySaved);
    if (Array.isArray(legacyArr)) {
      legacyArr.forEach(id => {
        if (id) {
          memoryDeleted.users.add(normalizeIdentifier(id));
          const d = extractPhoneDigits(id);
          if (d && d.length >= 8) memoryDeleted.users.add(d);
        }
      });
    }
  }
} catch (e) {}

function persistLocally() {
  try {
    const usersArr = Array.from(memoryDeleted.users);
    const obj: DeletedIdsPayload = {
      messages: Array.from(memoryDeleted.messages),
      videos: Array.from(memoryDeleted.videos),
      gallery: Array.from(memoryDeleted.gallery),
      mediaPosts: Array.from(memoryDeleted.mediaPosts),
      users: usersArr,
      members: usersArr
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    localStorage.setItem(LEGACY_DELETED_MEMBERS_KEY, JSON.stringify(usersArr));
  } catch (e) {}
}

/**
 * Inicializa e sincroniza a lista de IDs excluídos do Firestore e do Servidor
 */
export async function initDeletedIdsSync(): Promise<void> {
  try {
    // 1. Sincroniza do Firestore
    const sysSettings = await fetchCollectionFromFirestore<any>('system_settings').catch(() => []);
    const delDoc = sysSettings.find((s: any) => s.id === 'deleted_ids');
    if (delDoc) {
      if (Array.isArray(delDoc.messages)) delDoc.messages.forEach((id: string) => memoryDeleted.messages.add(String(id)));
      if (Array.isArray(delDoc.videos)) delDoc.videos.forEach((id: string) => memoryDeleted.videos.add(String(id)));
      if (Array.isArray(delDoc.gallery)) delDoc.gallery.forEach((id: string) => memoryDeleted.gallery.add(String(id)));
      if (Array.isArray(delDoc.mediaPosts)) delDoc.mediaPosts.forEach((id: string) => memoryDeleted.mediaPosts.add(String(id)));
      if (Array.isArray(delDoc.users)) delDoc.users.forEach((id: string) => memoryDeleted.users.add(normalizeIdentifier(id)));
      if (Array.isArray(delDoc.members)) delDoc.members.forEach((id: string) => memoryDeleted.users.add(normalizeIdentifier(id)));
    }
  } catch (e) {}

  try {
    // 2. Sincroniza do Servidor Node.js
    const res = await fetch('/api/deleted-ids').catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data) {
        if (Array.isArray(data.messages)) data.messages.forEach((id: string) => memoryDeleted.messages.add(String(id)));
        if (Array.isArray(data.videos)) data.videos.forEach((id: string) => memoryDeleted.videos.add(String(id)));
        if (Array.isArray(data.gallery)) data.gallery.forEach((id: string) => memoryDeleted.gallery.add(String(id)));
        if (Array.isArray(data.mediaPosts)) data.mediaPosts.forEach((id: string) => memoryDeleted.mediaPosts.add(String(id)));
        if (Array.isArray(data.users)) data.users.forEach((id: string) => memoryDeleted.users.add(normalizeIdentifier(id)));
        if (Array.isArray(data.members)) data.members.forEach((id: string) => memoryDeleted.users.add(normalizeIdentifier(id)));
      }
    }
  } catch (e) {}

  persistLocally();
}

export function isMessageDeleted(id: string): boolean {
  if (!id) return false;
  return memoryDeleted.messages.has(String(id));
}

export function isVideoDeleted(id: string): boolean {
  if (!id) return false;
  return memoryDeleted.videos.has(String(id));
}

export function isGalleryDeleted(id: string): boolean {
  if (!id) return false;
  return memoryDeleted.gallery.has(String(id));
}

export function isMediaPostDeleted(id: string): boolean {
  if (!id) return false;
  return memoryDeleted.mediaPosts.has(String(id));
}

export function isGuestOrAnonymousUser(id?: string, email?: string, phone?: string, name?: string): boolean {
  const normId = normalizeIdentifier(id);
  const normEmail = normalizeIdentifier(email);
  const normName = normalizeIdentifier(name);
  const phoneDigits = extractPhoneDigits(phone);

  if (
    normId.startsWith('usr_guest') ||
    normId.startsWith('visitante_') ||
    normId.startsWith('guest_') ||
    normId.startsWith('anon_') ||
    normId === 'usr_guest_unauthenticated'
  ) {
    return true;
  }

  if (
    normName === 'aguardando login' ||
    normName === 'aguardando logui' ||
    normName.includes('aguardando log') ||
    normName === 'visitante' ||
    normName === 'visitante (não autenticado)' ||
    normName === 'visitante (nao autenticado)' ||
    normName === 'aguardando cadastro ou login'
  ) {
    return true;
  }

  if (normEmail.includes('visitante@') || normEmail.includes('guest@')) {
    return true;
  }

  if (!phoneDigits && (!normEmail || normEmail.includes('@igreja.com')) && normId.includes('guest')) {
    return true;
  }

  return false;
}

export function isUserOrMemberDeleted(id?: string, email?: string, phone?: string, name?: string): boolean {
  const normId = normalizeIdentifier(id);
  const normEmail = normalizeIdentifier(email);
  const normName = normalizeIdentifier(name);
  const phoneDigits = extractPhoneDigits(phone);

  // Usuários guests / anônimos nunca entram na lista de membros
  if (isGuestOrAnonymousUser(id, email, phone, name)) {
    return true;
  }

  // Protege o pastor / administrador master contra deleção acidental
  if (
    normId === 'usr_admin_master' ||
    normId === 'm_pastor_master' ||
    normId === 'usr_pastor_master' ||
    normEmail === 'bjuscelino33@gmail.com' ||
    normEmail === 'meuplantaopro@gmail.com'
  ) {
    return false;
  }

  if (normId && memoryDeleted.users.has(normId)) return true;
  if (normEmail && memoryDeleted.users.has(normEmail)) return true;
  if (phoneDigits && phoneDigits.length >= 8 && memoryDeleted.users.has(phoneDigits)) return true;
  if (normName && memoryDeleted.users.has(normName)) return true;

  return false;
}

export function isMemberDeleted(id?: string, email?: string, phone?: string, name?: string): boolean {
  return isUserOrMemberDeleted(id, email, phone, name);
}

export function isUserDeleted(id?: string, email?: string, phone?: string, name?: string): boolean {
  return isUserOrMemberDeleted(id, email, phone, name);
}

export function filterActiveMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.filter(m => m && m.id && !memoryDeleted.messages.has(String(m.id)));
}

export function filterActiveVideos(videos: VideoItem[]): VideoItem[] {
  if (!Array.isArray(videos)) return [];
  return videos.filter(v => v && v.id && !memoryDeleted.videos.has(String(v.id)));
}

export function filterActiveGallery(items: GalleryItem[]): GalleryItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter(g => g && g.id && !memoryDeleted.gallery.has(String(g.id)));
}

export function deduplicateMembersList(members: Member[]): Member[] {
  if (!Array.isArray(members)) return [];

  const masterPastorMember: Member = {
    id: 'm_pastor_master',
    name: 'Pr. Juscelino (Pastor Presidente)',
    email: 'bjuscelino33@gmail.com',
    phone: '(11) 99876-5432',
    role: 'PASTOR',
    accessStatus: 'LIBERADO',
    isBlocked: false,
    isOnline: true,
    createdAt: '2024-01-01'
  };

  const result: Member[] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const seenIds = new Set<string>();

  // Sempre inicia com o Pastor Master oficial único
  result.push(masterPastorMember);
  seenEmails.add('bjuscelino33@gmail.com');
  seenEmails.add('meuplantaopro@gmail.com');
  seenIds.add('m_pastor_master');
  seenIds.add('usr_pastor_master');
  seenIds.add('usr_admin_master');
  seenIds.add('pastor_master_1');

  members.forEach(m => {
    if (!m || !m.id) return;
    const mId = String(m.id).trim().toLowerCase();
    const mEmail = (m.email || '').toString().trim().toLowerCase();
    const mPhone = (m.phone || '').toString().replace(/\D/g, '');
    const mName = (m.name || '').toString().trim().toLowerCase();

    // Se for conta duplicada do pastor / admin master, unifica no masterPastorMember já inserido
    if (
      mId === 'm_pastor_master' ||
      mId === 'usr_pastor_master' ||
      mId === 'usr_admin_master' ||
      mId === 'pastor_master_1' ||
      mId.includes('pastor_master') ||
      mId.includes('admin_master') ||
      mEmail.includes('bjuscelino33') ||
      mEmail === 'meuplantaopro@gmail.com' ||
      mName.includes('juscelino') ||
      mPhone === '11998765432' ||
      mPhone === '998765432'
    ) {
      if (m.lastActiveAt) {
        masterPastorMember.lastActiveAt = Math.max(Number(masterPastorMember.lastActiveAt || 0), Number(m.lastActiveAt));
      }
      if (m.isOnline !== undefined) {
        masterPastorMember.isOnline = Boolean(m.isOnline || masterPastorMember.isOnline);
      }
      return;
    }

    // Se estiver excluído
    if (isUserOrMemberDeleted(m.id, m.email, m.phone, m.name)) return;

    if (seenIds.has(mId)) return;
    if (mEmail && seenEmails.has(mEmail)) return;
    if (mPhone && mPhone.length >= 8 && seenPhones.has(mPhone)) return;

    seenIds.add(mId);
    if (mEmail) seenEmails.add(mEmail);
    if (mPhone && mPhone.length >= 8) seenPhones.add(mPhone);

    result.push(m);
  });

  return result;
}

export function filterActiveMembers(members: Member[]): Member[] {
  if (!Array.isArray(members)) return [];
  const filtered = members.filter(m => m && !isUserOrMemberDeleted(m.id, m.email, m.phone, m.name));
  return deduplicateMembersList(filtered);
}

export function filterActiveUsers(users: UserProfile[]): UserProfile[] {
  if (!Array.isArray(users)) return [];
  return users.filter(u => u && !isUserOrMemberDeleted(u.id, u.email, u.phone, u.name));
}

/**
 * Marca uma conta de membro ou usuário como permanentemente excluída em todos os níveis
 */
export async function markMemberOrUserDeleted(id?: string, email?: string, phone?: string, name?: string): Promise<void> {
  const normId = normalizeIdentifier(id);
  const normEmail = normalizeIdentifier(email);
  const normName = normalizeIdentifier(name);
  const phoneDigits = extractPhoneDigits(phone);

  if (normId) memoryDeleted.users.add(normId);
  if (normEmail) memoryDeleted.users.add(normEmail);
  if (phoneDigits && phoneDigits.length >= 8) memoryDeleted.users.add(phoneDigits);
  if (normName && normName.length > 2) memoryDeleted.users.add(normName);

  persistLocally();

  // Limpa também caches locais de storage se existirem
  try {
    const cleanStorageList = (key: string) => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            const filtered = arr.filter((item: any) => !isUserOrMemberDeleted(item?.id, item?.email, item?.phone, item?.name));
            localStorage.setItem(key, JSON.stringify(filtered));
          }
        } catch (e) {}
      }
    };
    cleanStorageList('ad_members');
    cleanStorageList('ad_users');
    cleanStorageList('ad_registered_users');
    cleanStorageList('all_users_storage_v4');
    cleanStorageList('system_admin_users_db');
  } catch (e) {}

  // 1. Remove do Firestore collections 'members' e 'users'
  if (id) {
    deleteDocFromFirestore('members', id).catch(() => {});
    deleteDocFromFirestore('users', id).catch(() => {});
  }

  // 2. Registra na coleção de segurança system_settings/deleted_ids
  syncDocToFirestore('system_settings', 'deleted_ids', {
    messages: Array.from(memoryDeleted.messages),
    videos: Array.from(memoryDeleted.videos),
    gallery: Array.from(memoryDeleted.gallery),
    mediaPosts: Array.from(memoryDeleted.mediaPosts),
    users: Array.from(memoryDeleted.users),
    members: Array.from(memoryDeleted.users),
    timestamp: Date.now()
  }).catch(() => {});

  // 3. Notifica backend Node.js
  const cleanId = id || email || phone || '';
  if (cleanId) {
    fetch(`/api/members/${encodeURIComponent(cleanId)}`, { method: 'DELETE' }).catch(() => {});
    fetch(`/api/users/${encodeURIComponent(cleanId)}`, { method: 'DELETE' }).catch(() => {});
    fetch('/api/admin/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cleanId, email: normEmail, phone: phoneDigits, name: normName })
    }).catch(() => {});
    fetch('/api/deleted-ids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'users', id: cleanId, email: normEmail, phone: phoneDigits })
    }).catch(() => {});
  }
}

/**
 * Marca uma mensagem ou áudio como permanentemente excluído em todos os níveis
 */
export async function markMessageDeleted(id: string): Promise<void> {
  if (!id) return;
  const cleanId = String(id);
  memoryDeleted.messages.add(cleanId);
  persistLocally();

  // 1. Remove áudio do IndexedDB
  await deleteAudioBlobLocally(cleanId).catch(() => {});

  // 2. Remove do Firestore collection 'messages'
  deleteDocFromFirestore('messages', cleanId).catch(() => {});

  // 3. Registra na coleção de segurança system_settings/deleted_ids
  syncDocToFirestore('system_settings', 'deleted_ids', {
    messages: Array.from(memoryDeleted.messages),
    videos: Array.from(memoryDeleted.videos),
    gallery: Array.from(memoryDeleted.gallery),
    mediaPosts: Array.from(memoryDeleted.mediaPosts),
    users: Array.from(memoryDeleted.users),
    timestamp: Date.now()
  }).catch(() => {});

  // 4. Notifica backend Node.js
  fetch(`/api/messages/${cleanId}`, { method: 'DELETE' }).catch(() => {});
  fetch('/api/deleted-ids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'messages', id: cleanId })
  }).catch(() => {});
}

/**
 * Marca um vídeo como permanentemente excluído em todos os níveis
 */
export async function markVideoDeleted(id: string): Promise<void> {
  if (!id) return;
  const cleanId = String(id);
  memoryDeleted.videos.add(cleanId);
  persistLocally();

  // 1. Remove do Firestore collection 'videos'
  deleteDocFromFirestore('videos', cleanId).catch(() => {});

  // 2. Registra na coleção de segurança system_settings/deleted_ids
  syncDocToFirestore('system_settings', 'deleted_ids', {
    messages: Array.from(memoryDeleted.messages),
    videos: Array.from(memoryDeleted.videos),
    gallery: Array.from(memoryDeleted.gallery),
    mediaPosts: Array.from(memoryDeleted.mediaPosts),
    users: Array.from(memoryDeleted.users),
    timestamp: Date.now()
  }).catch(() => {});

  // 3. Notifica backend Node.js
  fetch(`/api/videos/${cleanId}`, { method: 'DELETE' }).catch(() => {});
  fetch('/api/deleted-ids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'videos', id: cleanId })
  }).catch(() => {});
}

/**
 * Marca uma foto da galeria como permanentemente excluída em todos os níveis
 */
export async function markGalleryDeleted(id: string): Promise<void> {
  if (!id) return;
  const cleanId = String(id);
  memoryDeleted.gallery.add(cleanId);
  persistLocally();

  // 1. Remove foto do IndexedDB
  await deletePhotoBlobLocally(cleanId).catch(() => {});

  // 2. Remove do Firestore collection 'gallery'
  deleteDocFromFirestore('gallery', cleanId).catch(() => {});

  // 3. Registra na coleção de segurança system_settings/deleted_ids
  syncDocToFirestore('system_settings', 'deleted_ids', {
    messages: Array.from(memoryDeleted.messages),
    videos: Array.from(memoryDeleted.videos),
    gallery: Array.from(memoryDeleted.gallery),
    mediaPosts: Array.from(memoryDeleted.mediaPosts),
    users: Array.from(memoryDeleted.users),
    timestamp: Date.now()
  }).catch(() => {});

  // 4. Notifica backend Node.js
  fetch(`/api/gallery/${cleanId}`, { method: 'DELETE' }).catch(() => {});
  fetch('/api/deleted-ids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'gallery', id: cleanId })
  }).catch(() => {});
}

