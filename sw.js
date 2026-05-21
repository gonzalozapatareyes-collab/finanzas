// Service Worker conservador - v21
// Cachea la app para uso offline pero siempre verifica actualizaciones

const CACHE_NAME = 'finanzas-gonzalo-v21';
const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

// Al instalar: cachear archivos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_FILES).catch((err) => {
        console.warn('SW: error cacheando', err);
      });
    })
  );
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// Al activar: limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cn) => {
          if (cn !== CACHE_NAME) {
            console.log('SW: eliminando cache viejo', cn);
            return caches.delete(cn);
          }
        })
      );
    })
  );
  // Tomar control de páginas abiertas inmediatamente
  self.clients.claim();
});

// Estrategia: Network First con fallback a cache
// Esto asegura que SIEMPRE intente traer la última versión de GitHub Pages,
// pero si no hay internet, usa lo cacheado
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No cachear llamadas a APIs externas (Google Drive, etc)
  if (url.hostname !== self.location.hostname) {
    return;  // dejar que pase normal sin interceptar
  }

  // Solo cachear GETs
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es OK, actualizar el cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Sin internet: usar cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
  );
});

// Mensaje desde la app para forzar actualización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
