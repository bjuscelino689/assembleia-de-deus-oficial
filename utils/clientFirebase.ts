import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Inicializa o Firebase Client SDK de forma segura
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Salva ou atualiza um documento no Firestore com tratamento de fallback
 */
export async function syncDocToFirestore(collectionName: string, docId: string, data: any): Promise<boolean> {
  try {
    if (!docId) return false;
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, collectionName, String(docId)), cleanData, { merge: true });
    return true;
  } catch (error) {
    console.warn(`[Firebase Sync] Não foi possível sincronizar na nuvem (${collectionName}/${docId}):`, error);
    return false;
  }
}

/**
 * Remove um documento do Firestore
 */
export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  try {
    if (!docId) return false;
    await deleteDoc(doc(db, collectionName, String(docId)));
    return true;
  } catch (error) {
    console.warn(`[Firebase Delete] Erro ao remover do Firestore (${collectionName}/${docId}):`, error);
    return false;
  }
}

/**
 * Carrega todos os itens de uma coleção do Firestore
 */
export async function fetchCollectionFromFirestore<T = any>(collectionName: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    const list: T[] = [];
    snap.forEach(d => {
      list.push({ id: d.id, ...d.data() } as T);
    });
    return list;
  } catch (error) {
    console.warn(`[Firebase Fetch] Coleção ${collectionName}:`, error);
    return [];
  }
}

/**
 * Carrega um único documento do Firestore
 */
export async function fetchDocumentFromFirestore<T = any>(collectionName: string, docId: string): Promise<T | null> {
  try {
    if (!docId) return null;
    const snap = await getDoc(doc(db, collectionName, String(docId)));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as T;
    }
    return null;
  } catch (error) {
    console.warn(`[Firebase Fetch Doc] Documento ${collectionName}/${docId}:`, error);
    return null;
  }
}

/**
 * Ouve em tempo real as atualizações do Firestore
 */
export function subscribeToCollection<T = any>(
  collectionName: string, 
  callback: (items: T[]) => void
): () => void {
  try {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const list: T[] = [];
      snapshot.forEach(d => {
        list.push({ id: d.id, ...d.data() } as T);
      });
      callback(list);
    }, (err) => {
      console.warn(`[Firebase Listener] ${collectionName}:`, err);
    });
    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}
