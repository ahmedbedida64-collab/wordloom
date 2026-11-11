const CACHE_NAME = 'wordloom-standalone-v19';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

const CORE_COVERS = [
  './covers/cover_aesop_fables.jpg',
  './covers/cover_canterville_ghost.jpg',
  './covers/cover_chekhov_stories.jpg',
  './covers/cover_grimm_tales.jpg',
  './covers/cover_hardy_stories.jpg',
  './covers/cover_irving_alhambra.jpg',
  './covers/cover_irving_tales.jpg',
  './covers/cover_kipling_stories.jpg',
  './covers/cover_london_tales.jpg',
  './covers/cover_maupassant_stories.jpg',
  './covers/cover_ohenry_million.jpg',
  './covers/cover_poe_stories.jpg',
  './covers/cover_saki_stories.jpg',
  './covers/cover_secret_sharer.jpg',
  './covers/cover_twain_humor.jpg',
  './covers/cover_wilde_fairy_tales.jpg',
  './covers/cover_yellow_wallpaper.jpg',
  './covers/cover_metamorphosis.jpg',
  './covers/cover_jekyll_hyde.jpg',
  './covers/cover_bartleby.jpg',
  './covers/cover_alice_wonderland.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_SHELL);
      // Pre-cache core book covers for complete offline presentation
      await Promise.allSettled(
        CORE_COVERS.map(cover => cache.add(cover).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Network-first strategy with dynamic runtime caching for covers and assets:
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
