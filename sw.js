// Offline-Cache: App startet ohne Internet, Updates werden im Hintergrund geladen.
const CACHE = 'dartscorer-v3';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png',
  './js/main.js', './js/store.js', './js/match.js', './js/checkout.js', './js/x01.js',
  './js/party.js', './js/stats.js', './js/games.js', './js/ui/views.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
