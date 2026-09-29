import { openDB, type DBSchema } from 'idb';
import { migrateData, type Backup } from './model';

interface LearningDB extends DBSchema {
  user: {
    key: string;
    value: Backup;
  };
}

const DB_NAME = 'fullstack-learning';
const DB_VERSION = 1;
const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('fullstack-learning')
  : null;

function announceChange(): void {
  window.dispatchEvent(new Event('learning-change'));
  channel?.postMessage('changed');
}

channel?.addEventListener('message', () => {
  window.dispatchEvent(new Event('learning-change'));
});

function connect() {
  return openDB<LearningDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('user')) db.createObjectStore('user');
    },
    blocking(_currentVersion, _blockedVersion, event) {
      (event.target as IDBDatabase).close();
    },
    blocked() {
      window.dispatchEvent(new Event('learning-blocked'));
    },
  });
}

export async function readData(): Promise<Backup> {
  const db = await connect();
  try {
    return migrateData(await db.get('user', 'state'));
  } finally {
    db.close();
  }
}

export async function readPreviousBackup(): Promise<Backup | undefined> {
  const db = await connect();
  try {
    const value = await db.get('user', 'before-import');
    return value === undefined ? undefined : migrateData(value);
  } finally {
    db.close();
  }
}

export async function updateData(change: (data: Backup) => void): Promise<Backup> {
  const db = await connect();
  const transaction = db.transaction('user', 'readwrite');

  try {
    const data = migrateData(await transaction.store.get('state'));
    change(data);
    data.exportedAt = new Date().toISOString();
    const checked = migrateData(data);
    await transaction.store.put(checked, 'state');
    await transaction.done;
    announceChange();
    return checked;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The browser may already have aborted this transaction.
    }
    await transaction.done.catch(() => {});
    throw error;
  } finally {
    db.close();
  }
}

export async function replaceData(data: Backup, preservePrevious = false): Promise<void> {
  const checked = migrateData(data);
  const db = await connect();
  const transaction = db.transaction('user', 'readwrite');

  try {
    if (preservePrevious) {
      const previous = migrateData(await transaction.store.get('state'));
      await transaction.store.put(previous, 'before-import');
    } else {
      await transaction.store.delete('before-import');
    }
    await transaction.store.put(checked, 'state');
    await transaction.done;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The browser may already have aborted this transaction.
    }
    await transaction.done.catch(() => {});
    throw error;
  } finally {
    db.close();
  }

  announceChange();
}

export function storageError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'Penyimpanan penuh. Export data lalu hapus materi offline yang tidak diperlukan.';
  }
  const detail = error instanceof Error ? ` ${error.message}` : '';
  return `Data belum tersimpan. Periksa izin penyimpanan browser, lalu coba lagi.${detail}`;
}

export function saveFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
