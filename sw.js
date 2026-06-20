/**
 * VOIDBORN — SERVICE WORKER
 * Caches the shell + data. Chapter pages cached on first visit.
 * Strategy: Cache-first for assets, network-first for data.
 */

const VERSION = 'vb-v1.0.0';

const SHELL_CACHE = VERSION + '-shell';
const DATA_CACHE  = VERSION + '-data';
const PAGE_CACHE  = VERSION + '-pages';

// App shell — always available offline
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/chapters.html',
  '/reader.html',
  '/characters.html',
  '/about.html',
  '/404.html',
  '/assets/css/global.css',
  '/assets/css/home.css',
  '/assets/css/chapters.css',
  '/assets/css/reader.css',
  '/assets/css/pages.css',
  '/assets/js/core.js',
  '/assets/js/home.js',
  '/assets/js/chapters.js',
  '/assets/js/reader.js',
  '/assets/js/characters.js',
  '/assets/js/about.js',
  '/manifest.json'
];

const DATA_ASSETS = [
  '/data/manga.json',
  '/data/chapters.json',
  '/data/characters.json'
];

// ── INSTALL ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_ASSETS).catch(() => {})),
      caches.open(DATA_CACHE).then(cache => cache.addAll(DATA_ASSETS).catch(() => {}))
    ]).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== DATA_CACHE && k !== PAGE_CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;

  const path = url.pathname;

  // Data files: network-first, fall back to cache
  if (path.startsWith('/data/')) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // Chapter images: cache-first (offline reading)
  if (path.startsWith('/chapters/')) {
    event.respondWith(cacheFirst(event.request, PAGE_CACHE));
    return;
  }

  // Shell assets: cache-first
  event.respondWith(
    cacheFirst(event.request, SHELL_CACHE)
      .catch(() => caches.match('/404.html'))
  );
});

// ── STRATEGIES ────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('Network and cache both failed');
  }
}
