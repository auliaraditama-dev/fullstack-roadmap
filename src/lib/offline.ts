export interface OfflineFile {
  url: string;
  bytes: number;
  hash: string;
}

export interface OfflineModule {
  id: string;
  title: string;
  files: OfflineFile[];
}

export interface OfflineManifest {
  version: string;
  modules: OfflineModule[];
  shell: OfflineFile[];
}

import { withOfflineLock } from './offline-lock';

export const POINTER_CACHE = 'fs-installed';
const VERSION_PATTERN = /^[a-f0-9]{8,64}$/i;
const MODULE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;

function ownsModuleCache(cacheName: string, moduleId: string): boolean {
  const prefix = `fs-module-${moduleId}-`;
  return cacheName.startsWith(prefix) && VERSION_PATTERN.test(cacheName.slice(prefix.length).split('-')[0] ?? '');
}

export function validOfflineUrl(url: string): boolean {
  return url.startsWith('/')
    && !url.startsWith('//')
    && !url.includes('..')
    && !url.includes('?')
    && !url.includes('#')
    && !url.includes('\\')
    && !/%2e|%2f|%5c/i.test(url)
    && !Array.from(url).some((character) => character.charCodeAt(0) < 33)
    && !url.startsWith('/api/');
}

function assertFile(value: unknown): asserts value is OfflineFile {
  if (!value || typeof value !== 'object') throw new Error('Manifest tidak valid.');
  const file = value as Partial<OfflineFile>;
  if (
    typeof file.url !== 'string'
    || !validOfflineUrl(file.url)
    || !Number.isSafeInteger(file.bytes)
    || (file.bytes ?? -1) < 0
    || typeof file.hash !== 'string'
    || !HASH_PATTERN.test(file.hash)
  ) {
    throw new Error('Manifest tidak valid.');
  }
}

function assertModule(value: unknown): asserts value is OfflineModule {
  if (!value || typeof value !== 'object') throw new Error('Manifest tidak valid.');
  const module = value as Partial<OfflineModule>;
  if (
    typeof module.id !== 'string'
    || !MODULE_ID_PATTERN.test(module.id)
    || typeof module.title !== 'string'
    || module.title.length === 0
    || module.title.length > 200
    || !Array.isArray(module.files)
  ) {
    throw new Error('Manifest tidak valid.');
  }
  uniqueFiles(module.files);
}

export function uniqueFiles(files: OfflineFile[]): OfflineFile[] {
  const map = new Map<string, OfflineFile>();
  for (const file of files) {
    assertFile(file);
    const existing = map.get(file.url);
    if (existing && (existing.bytes !== file.bytes || existing.hash !== file.hash)) {
      throw new Error('Manifest memiliki metadata file yang bertentangan.');
    }
    map.set(file.url, file);
  }
  return [...map.values()];
}

export function validateManifest(value: unknown): OfflineManifest {
  if (!value || typeof value !== 'object') throw new Error('Manifest tidak valid.');
  const candidate = value as Partial<OfflineManifest>;
  if (
    typeof candidate.version !== 'string'
    || !VERSION_PATTERN.test(candidate.version)
    || !Array.isArray(candidate.shell)
    || !Array.isArray(candidate.modules)
  ) {
    throw new Error('Manifest tidak valid.');
  }

  const shell = uniqueFiles(candidate.shell);
  candidate.modules.forEach(assertModule);
  uniqueFiles([...shell, ...candidate.modules.flatMap(module => module.files)]);
  const moduleIds = candidate.modules.map((module) => module.id);
  if (new Set(moduleIds).size !== moduleIds.length) throw new Error('Manifest memiliki modul duplikat.');

  return { version: candidate.version, shell, modules: candidate.modules };
}

export async function manifest(): Promise<OfflineManifest> {
  const response = await fetch('/offline-manifest.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Daftar unduhan belum tersedia. Buka build production.');
  return validateManifest(await response.json());
}

export function installed(): Promise<Record<string, string>> {
  return withOfflineLock(readInstalled);
}

async function readInstalled(): Promise<Record<string, string>> {
  if (!('caches' in globalThis)) return {};
  const pointers = await caches.open(POINTER_CACHE);
  const keys = await pointers.keys();
  const records: Record<string, string> = {};

  for (const key of keys) {
    const moduleId = new URL(key.url).pathname.split('/').pop();
    if (!moduleId || !MODULE_ID_PATTERN.test(moduleId)) {
      await pointers.delete(key);
      continue;
    }

    const pointer = await pointers.match(key);
    if (!pointer) continue;
    const cacheName = await pointer.text();
    if (!ownsModuleCache(cacheName, moduleId)) {
      await pointers.delete(key);
      continue;
    }

    const moduleCache = await caches.open(cacheName);
    const receipt = await moduleCache.match('/__receipt');
    if (!receipt) {
      await pointers.delete(key);
      continue;
    }

    try {
      const urls = await receipt.json() as unknown;
      if (!Array.isArray(urls) || urls.length === 0 || !urls.every((url) => typeof url === 'string' && validOfflineUrl(url))) {
        await pointers.delete(key);
        continue;
      }
      const complete = await Promise.all(urls.map((url) => moduleCache.match(url)));
      if (complete.every(Boolean)) records[moduleId] = cacheName;
      else await pointers.delete(key);
    } catch {
      await pointers.delete(key);
    }
  }

  return records;
}

async function pruneModuleGenerations(moduleId: string, keep: ReadonlySet<string>): Promise<void> {
  for (const cacheName of await caches.keys()) {
    if (ownsModuleCache(cacheName, moduleId) && !keep.has(cacheName)) {
      await caches.delete(cacheName);
    }
  }
}

async function downloadUnlocked(
  module: OfflineModule,
  version: string,
  shell: OfflineFile[],
  progress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  assertModule(module);
  if (!VERSION_PATTERN.test(version)) throw new Error('Versi manifest tidak valid.');

  const files = uniqueFiles([...shell, ...module.files]);
  signal?.throwIfAborted();
  if (!files.length) throw new Error('Modul tidak memiliki file.');
  const stage = `fs-module-${module.id}-${version}-${crypto.randomUUID()}`;
  const cache = await caches.open(stage);

  try {
    let done = 0;
    for (const file of files) {
      signal?.throwIfAborted();
      const response = await fetch(file.url, { cache: 'no-cache', signal, credentials: 'same-origin' });
      if (!response.ok || response.type === 'opaque' || response.redirected) {
        throw new Error(`Unduhan gagal: ${file.url}. Coba lagi saat online.`);
      }

      const bytes = await response.clone().arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      if (bytes.byteLength !== file.bytes || digest !== file.hash) {
        throw new Error('Materi berubah saat diunduh. Muat ulang lalu coba lagi.');
      }

      await cache.put(file.url, response);
      progress(++done, files.length);
    }

    signal?.throwIfAborted();
    await cache.put('/__receipt', new Response(JSON.stringify(files.map((file) => file.url)), {
      headers: { 'Content-Type': 'application/json' },
    }));

    const pointers = await caches.open(POINTER_CACHE);
    const pointerKey = `/__module/${module.id}`;
    const previousResponse = await pointers.match(pointerKey);
    const previous = previousResponse ? await previousResponse.text() : null;
    await pointers.put(pointerKey, new Response(stage));
    // Cleanup must never roll back a successfully committed pointer.
    await pruneModuleGenerations(module.id, new Set([stage, ...(previous ? [previous] : [])])).catch(() => {});
  } catch (error) {
    await caches.delete(stage);
    throw error;
  }
}

export function downloadModule(module: OfflineModule, version: string, shell: OfflineFile[], progress: (done: number, total: number) => void, signal?: AbortSignal): Promise<void> {
  return withOfflineLock(() => downloadUnlocked(module, version, shell, progress, signal));
}

export function removeModule(id: string): Promise<void> {
  return withOfflineLock(() => removeUnlocked(id));
}

async function removeUnlocked(id: string): Promise<void> {
  if (!MODULE_ID_PATTERN.test(id)) throw new Error('ID modul tidak valid.');
  const pointers = await caches.open(POINTER_CACHE);
  await pointers.delete(`/__module/${id}`);
  for (const cacheName of await caches.keys()) {
    if (ownsModuleCache(cacheName, id)) await caches.delete(cacheName);
  }
}

export function clearOffline(): Promise<void> {
  return withOfflineLock(clearUnlocked);
}

async function clearUnlocked(): Promise<void> {
  for (const cacheName of await caches.keys()) {
    if (cacheName.startsWith('fs-module-') || cacheName === POINTER_CACHE || cacheName.startsWith('fs-pages-')) {
      await caches.delete(cacheName);
    }
  }
}

export async function isAvailable(url: string, records?: Record<string, string>): Promise<boolean> {
  if (!validOfflineUrl(url)) return false;
  records ??= await installed();
  for (const cacheName of Object.values(records)) {
    const cache = await caches.open(cacheName);
    if (await cache.match(url)) return true;
  }
  return false;
}
