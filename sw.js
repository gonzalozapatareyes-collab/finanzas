// Service Worker v30 - Mis Finanzas
const CACHE_NAME = 'mis-finanzas-v30';
const APP_FILES = [
  './', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png',
  './apple-touch-icon.png', './favicon-32.png'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES).catch(()=>{})));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((cn) => Promise.all(cn.map((c) => c !== CACHE_NAME ? caches.delete(c) : null))));
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname !== self.location.hostname) return;
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const c = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, c));
      }
      return response;
    }).catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
  );
});
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
