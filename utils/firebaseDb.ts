import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import firebaseConfig from "../firebase-applet-config.json";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const QUOTA_FILE = path.join(process.cwd(), "data", "firestore_quota_exceeded.json");

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function checkIsQuotaExceeded(): boolean {
  try {
    if (fs.existsSync(QUOTA_FILE)) {
      const content = JSON.parse(fs.readFileSync(QUOTA_FILE, "utf-8"));
      if (content && content.quotaExceeded) {
        if (content.date && content.date !== getTodayString()) {
          // Novo dia! Reseta a cota diária do Firestore automaticamente
          try { fs.unlinkSync(QUOTA_FILE); } catch (e) {}
          return false;
        }
        return true;
      }
    }
  } catch (e) {}
  return false;
}

function setQuotaExceededState() {
  try {
    const dir = path.dirname(QUOTA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      QUOTA_FILE,
      JSON.stringify({ quotaExceeded: true, date: getTodayString() }, null, 2),
      "utf-8"
    );
  } catch (e) {}
}

function handleFirestoreError(error: any, actionName: string) {
  const errMsg = String(error?.message || error || '');
  const errCode = String(error?.code || '');
  if (errCode.includes('resource-exhausted') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota limit exceeded')) {
    setQuotaExceededState();
    console.warn(`[Firebase] Cota diária do Firestore atingida (RESOURCE_EXHAUSTED). Alternando para armazenamento local de alta velocidade em disco de forma transparente.`);
    return;
  }
  console.error(`Erro no Firestore (${actionName}):`, error);
}

/**
 * Carrega todos os documentos de uma coleção do Firestore
 */
export async function loadCollectionFromFirestore<T = any>(collectionName: string): Promise<T[]> {
  if (checkIsQuotaExceeded()) return [];
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() } as T);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, `loadCollectionFromFirestore(${collectionName})`);
    return [];
  }
}

/**
 * Carrega um documento específico do Firestore por ID
 */
export async function loadDocumentFromFirestore<T = any>(collectionName: string, docId: string): Promise<T | null> {
  if (checkIsQuotaExceeded()) return null;
  try {
    if (!docId) return null;
    const docSnap = await getDoc(doc(db, collectionName, String(docId)));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, `loadDocumentFromFirestore(${collectionName}, ${docId})`);
    return null;
  }
}

/**
 * Salva ou atualiza um documento específico por ID na coleção
 */
export async function saveDocumentToFirestore(collectionName: string, docId: string, data: any): Promise<boolean> {
  if (checkIsQuotaExceeded()) return false;
  try {
    if (!docId) return false;
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, collectionName, String(docId)), cleanData, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, `saveDocumentToFirestore(${collectionName}, ${docId})`);
    return false;
  }
}

/**
 * Remove um documento do Firestore por ID
 */
export async function deleteDocumentFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  if (checkIsQuotaExceeded()) return false;
  try {
    if (!docId) return false;
    await deleteDoc(doc(db, collectionName, String(docId)));
    return true;
  } catch (error) {
    handleFirestoreError(error, `deleteDocumentFromFirestore(${collectionName}, ${docId})`);
    return false;
  }
}

/**
 * Salva um lote (batch) de itens na coleção do Firestore
 */
export async function saveBatchToFirestore(collectionName: string, items: any[]): Promise<boolean> {
  if (checkIsQuotaExceeded()) return false;
  try {
    if (!Array.isArray(items) || items.length === 0) return true;
    const validItems = items.filter(item => item && item.id);
    if (validItems.length === 0) return true;

    // Divide em lotes de até 400 itens para não estourar o limite de 500 do Firestore
    const CHUNK_SIZE = 400;
    for (let i = 0; i < validItems.length; i += CHUNK_SIZE) {
      if (checkIsQuotaExceeded()) return false;
      const chunk = validItems.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docRef = doc(db, collectionName, String(item.id));
        const cleanData = JSON.parse(JSON.stringify(item));
        batch.set(docRef, cleanData, { merge: true });
      });
      await batch.commit();
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, `saveBatchToFirestore(${collectionName})`);
    return false;
  }
}
