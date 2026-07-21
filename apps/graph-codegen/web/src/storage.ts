/** One chat line: user prompt, agent reply, tool/build status, or error. */
export interface ChatEntry {
  kind: 'user' | 'agent' | 'status' | 'error';
  text: string;
  ms?: number;
}

export interface DiagnosticEntry {
  attempt: number;
  ok: boolean;
  messages: string[];
  /** True for errors reported by the running preview (spec/render failures), not the bundler. */
  runtime?: boolean;
}

/**
 * A full conversation snapshot as kept in IndexedDB. The id is the server
 * session id, so continuing a stored conversation is just sending the next
 * prompt with this id — the server restores its workspace from disk if needed.
 */
export interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  entries: ChatEntry[];
  files: Record<string, string>;
  diagnostics: DiagnosticEntry[];
  html: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
  model: string;
}

const DATABASE_NAME = 'graph-codegen';
const STORE_NAME = 'conversations';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
    });
  } finally {
    database.close();
  }
}

export function saveConversation(record: StoredConversation): Promise<IDBValidKey> {
  return withStore('readwrite', (store) => store.put(record));
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const records = await withStore<StoredConversation[]>('readonly', (store) => store.getAll());
  return records
    .map(({ id, title, updatedAt, model }) => ({ id, title, updatedAt, model }))
    .sort((first, second) => second.updatedAt - first.updatedAt);
}

export function loadConversation(id: string): Promise<StoredConversation | undefined> {
  return withStore<StoredConversation | undefined>('readonly', (store) => store.get(id));
}

export function deleteConversation(id: string): Promise<undefined> {
  return withStore('readwrite', (store) => store.delete(id));
}
