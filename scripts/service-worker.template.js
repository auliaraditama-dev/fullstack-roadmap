const VERSION = '__VERSION__';
const SHELL = `fs-shell-${VERSION}`;
const PAGES = `fs-pages-${VERSION}`;
const FILES = __SHELL__;
const POINTER_CACHE = 'fs-installed';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll([...FILES, '/offline-manifest.json']);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    const previousShell = names.filter((name) => name.startsWith('fs-shell-') && name !== SHELL).at(-1);
    for (const name of names) {
      const staleShell = name.startsWith('fs-shell-') && name !== SHELL && name !== previousShell;
      const stalePages = name.startsWith('fs-pages-') && name !== PAGES;
      if (staleShell || stalePages) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

async function moduleResponse(request) {
  const pointers = await caches.open(POINTER_CACHE);
  for (const key of await pointers.keys()) {
    const pointer = await pointers.match(key);
    if (!pointer) continue;
    const cacheName = await pointer.text();
    if (!cacheName.startsWith('fs-module-')) continue;
    const response = await (await caches.open(cacheName)).match(request);
    if (response) return response;
  }
  return undefined;
}

async function localResponse(request) {
  return await (await caches.open(PAGES)).match(request)
    ?? await moduleResponse(request)
    ?? await (await caches.open(SHELL)).match(request);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET'
    || url.origin !== self.location.origin
    || url.pathname.startsWith('/api/')
    || request.headers.has('Authorization')
    || url.pathname === '/service-worker.js'
  ) return;

  event.respondWith((async () => {
    if (url.pathname === '/offline-manifest.json' || url.pathname === '/search-index.json') {
      try {
        const fresh = await fetch(request);
        if (fresh.ok && fresh.type === 'basic') await (await caches.open(PAGES)).put(request, fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        return await localResponse(request) ?? new Response('Indeks belum diunduh', { status: 503 });
      }
    }

    if (request.mode !== 'navigate' && (request.cache === 'no-cache' || request.cache === 'reload')) {
      return fetch(request);
    }

    if (url.pathname.startsWith('/_astro/')) {
      const hit = await localResponse(request);
      if (hit) return hit;
      for (const name of await caches.keys()) {
        if (!name.startsWith('fs-module-') && !name.startsWith('fs-shell-')) continue;
        const old = await (await caches.open(name)).match(request);
        if (old) return old;
      }
      return fetch(request);
    }

    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic' && !url.search) {
          await (await caches.open(PAGES)).put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        const hit = await localResponse(request);
        if (hit) return hit;
        return await (await caches.open(SHELL)).match('/offline/') ?? new Response(
          'Materi belum diunduh. Sambungkan internet dan buka halaman Offline.',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        );
      }
    }

    const cached = await localResponse(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (
        response.ok
        && response.type === 'basic'
        && (url.pathname === '/search-index.json' || url.pathname === '/offline-manifest.json')
      ) {
        await (await caches.open(PAGES)).put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      return new Response('File belum tersedia offline', { status: 503 });
    }
  })());
});
