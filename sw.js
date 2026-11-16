// Offline-Cache: App startet ohne Internet, Updates werden im Hintergrund geladen.
const CACHE = 'dartscorer-v17';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png',
  './css/tokens.css', './css/base.css', './css/screens.css', './css/fx.css',
  './fonts/bc-500.woff2', './fonts/bc-600.woff2', './fonts/bc-700.woff2', './fonts/bc-800.woff2', './fonts/bc-800i.woff2', './fonts/cinzel.woff2',
  './js/main.js', './js/store.js', './js/match.js', './js/checkout.js', './js/x01.js', './js/party.js', './js/stats.js', './js/games.js', './js/bots.js', './js/bulloff.js', './js/fx.js', './js/botsim.js',
  './js/ui/common.js', './js/ui/svg.js', './js/ui/board.js', './js/ui/play.js', './js/ui/setup.js', './js/ui/game.js',
  './js/ui/moments.js', './js/ui/result.js', './js/ui/sheets.js', './js/ui/stats-view.js', './js/ui/stats-extra.js', './js/ui/charts.js', './js/ui/compare.js', './js/ui/avatar.js', './js/ui/bulloff-view.js',
  './js/ui/fx.js', './js/ui/fx-core.js', './js/ui/fx-anims.js', './js/ui/fx-art.js', './bots/bilder.json',
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
