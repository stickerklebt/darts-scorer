// Offline-Cache: App startet ohne Internet, Updates werden im Hintergrund geladen.
const CACHE = 'dartscorer-v123';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png', './favicon.svg',
  './css/tokens.css', './css/base.css', './css/screens.css', './css/fx.css',
  './fonts/league-gothic.woff2', './fonts/cinzel.woff2', './fonts/fell.woff2', './fonts/fell-i.woff2',
  './js/main.js', './js/store.js', './js/match.js', './js/checkout.js', './js/x01.js', './js/party.js', './js/stats.js', './js/games.js', './js/bots.js', './js/bulloff.js', './js/fx.js', './js/botsim.js', './js/demo.js', './js/cricket.js', './js/api.js', './js/sync.js', './js/filehint.js', './js/errlog.js', './js/history.js', './js/caller.js',
  './js/ui/common.js', './js/ui/svg.js', './js/ui/board.js', './js/ui/play.js', './js/ui/setup.js', './js/ui/game.js',
  './js/ui/moments.js', './js/ui/result.js', './js/ui/sheets.js', './js/ui/stats-view.js', './js/ui/stats-extra.js', './js/ui/charts.js', './js/ui/compare.js', './js/ui/avatar.js', './js/ui/bulloff-view.js', './js/ui/auth.js', './js/ui/friends.js', './js/ui/history.js', './js/ui/aimboard.js', './js/ui/caller.js', './js/ui/legdetail.js', './js/ui/banner.js', './js/trophies.js', './js/bruch.js', './js/ui/bruch.js', './js/camera.js', './js/camera-link.js', './js/board-geometry.js', './js/homography.js', './js/detect-core.js', './js/detector.js', './js/detector-worker.js', './js/calibration.js', './js/ui/camstation.js', './js/ui/camsetup.js', './js/camfuse.js', './js/ui/camview.js', './js/calib-refine.js', './js/voice.js', './js/online.js', './js/ui/versus.js',
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
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Server-Daten (Konto, Freunde, Sync) nie aus dem Cache – immer direkt ans Netz
  if (url.pathname.includes('/api/') || url.pathname.endsWith('/healthz')) return;
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
