/**
 * offlineQueue.ts — Fila de escritas offline via IndexedDB.
 *
 * Quando o app está sem internet, dbSet() chama enqueue() em vez de chamar o Supabase.
 * Quando a conexão volta, flushQueue() processa todas as operações pendentes em ordem.
 */

const DB_NAME    = 'gestao3d_offline';
const DB_VERSION = 1;
const STORE      = 'write_queue';

export interface QueuedWrite {
  id?:       number;         // auto-increment (IndexedDB)
  key:       string;         // chave do app_store
  value:     unknown;        // valor a gravar
  tenantId?: string | null;  // tenant ativo na hora da escrita
  ts:        number;         // timestamp para ordenação
}

// ── Abre (ou cria) o banco IndexedDB ──────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Adiciona uma operação à fila ───────────────────────────────────────────────
export async function enqueue(write: Omit<QueuedWrite, 'id'>): Promise<void> {
  try {
    const db   = await openDB();
    const tx   = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.add(write);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[offlineQueue] enqueue error:', e);
  }
}

// ── Lê todos os itens pendentes (em ordem de inserção) ────────────────────────
export async function dequeueAll(): Promise<QueuedWrite[]> {
  try {
    const db    = await openDB();
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const items = await new Promise<QueuedWrite[]>((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result as QueuedWrite[]);
      req.onerror   = () => rej(req.error);
    });
    db.close();
    return items.sort((a, b) => a.ts - b.ts);
  } catch (e) {
    console.warn('[offlineQueue] dequeueAll error:', e);
    return [];
  }
}

// ── Remove um item processado da fila ─────────────────────────────────────────
export async function removeFromQueue(id: number): Promise<void> {
  try {
    const db    = await openDB();
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.delete(id);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[offlineQueue] removeFromQueue error:', e);
  }
}

// ── Conta itens pendentes na fila ─────────────────────────────────────────────
export async function queueSize(): Promise<number> {
  try {
    const db    = await openDB();
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const count = await new Promise<number>((res, rej) => {
      const req = store.count();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}
