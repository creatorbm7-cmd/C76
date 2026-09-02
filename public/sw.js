/* eslint-disable no-restricted-globals */
/**
 * C7Winner Service Worker
 *
 * Strategy:
 *  - Static assets (/assets/*) → cache-first (immutable, hashed filenames)
 *  - HTML navigations → network-first with offline fallback
 *  - Same-origin GET only — third-party + non-GET requests pass through
 *  - Old cache versions cleaned on activate
 *
 * To force a fresh install, bump CACHE_VERSION.
 */

const CACHE_VERSION = 'c7w-v374-nav-active';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const HTML_CACHE   = `${CACHE_VERSION}-html`;

// Pre-cache the app shell on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
];

self.addEventListener('install', (event) => {
  // Activate this SW immediately on first install
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Best-effort — don't fail install if a single URL 404s
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients so the new SW controls already-open tabs
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Listen for SKIP_WAITING message — allows the page to upgrade an open tab
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigation → network-first
  const isHtml =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');
  if (isHtml) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Hashed assets / static files → cache-first
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/sounds/') ||
    /\.(css|js|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|gif|ico|mp3|ogg|wav)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Everything else: pass through to network with a cache fallback
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok && res.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    // Cache miss + network down — return a 503
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const cache = await caches.open(HTML_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // Last resort: try the app shell for navigations
    const shell = await caches.match('/');
    if (shell) return shell;
    return new Response('Offline — please reconnect.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

