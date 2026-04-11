const CACHE_VERSION = 'gfintrac-v3';
const CACHE_NAME = CACHE_VERSION;

// Cache only local assets — let CDN assets be fetched fresh with network-first
const LOCAL_ASSETS = [
    './',
    './index.html',
    './app.js',
    './styles.css',
    './manifest.json',
    './expense.png'
];

// ── INSTALL: Cache local assets ────────────────────────────────────────────
self.addEventListener('install', (event) => {
    self.skipWaiting(); // activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(LOCAL_ASSETS);
        }).catch((err) => console.warn('[SW] Install cache failed:', err))
    );
});

// ── ACTIVATE: Clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim()) // take control of open pages immediately
    );
});

// ── FETCH: Cache-first for local, Network-first for CDN ───────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET or chrome-extension requests
    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;

    const isLocal = url.origin === self.location.origin;

    if (isLocal) {
        // Cache-first for local assets
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                });
            }).catch(() => caches.match('./index.html')) // offline fallback
        );
    } else {
        // Network-first for CDN assets (fonts, chartjs, etc.)
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
    }
});
