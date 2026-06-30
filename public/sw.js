const CACHE_VERSION = '2026-06-24';
const STATIC_CACHE = `aniworld-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `aniworld-images-${CACHE_VERSION}`;
const API_CACHE = `aniworld-api-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/offline.html',
  '/logo.png',
  '/app-icon.jpg',
  '/favicon.ico',
];

// Helper to limit cache size (LRU-like pruning)
function limitCacheSize(cacheName, maxItems, pruneCount) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        const itemsToDelete = Math.min(pruneCount, keys.length);
        for (let i = 0; i < itemsToDelete; i++) {
          cache.delete(keys[i]);
        }
      }
    });
  });
}

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  const activeCaches = [STATIC_CACHE, IMAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!activeCaches.includes(key)) {
            console.log(`[Service Worker] Removing old cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Navigation requests (Page loading) -> Network First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.open(STATIC_CACHE).then((cache) => {
          return cache.match('/offline.html');
        });
      })
    );
    return;
  }

  // 2. Restricted APIs - NEVER CACHE
  // Exclude auth, admin, user, webpush, and list entry modifications (POST/DELETE/PATCH)
  const isRestrictedApi = url.pathname.startsWith('/api/auth') ||
                          url.pathname.startsWith('/api/admin') ||
                          url.pathname.startsWith('/api/user') ||
                          url.pathname.startsWith('/api/webpush') ||
                          (url.pathname.startsWith('/api/list/entry') && request.method !== 'GET');

  if (isRestrictedApi) {
    return; // Let browser fetch naturally without intercepting
  }

  // 3. Read-only Public APIs -> Network-First (cache updates on success)
  const isPublicApi = url.pathname.startsWith('/api/anime') ||
                      url.pathname.startsWith('/api/search') ||
                      url.pathname.startsWith('/api/discover') ||
                      url.pathname.startsWith('/api/trending');

  if (isPublicApi && request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 4. Remote Image Caching (MyAnimeList / AniList posters) -> Cache-First
  const isPosterImage = url.hostname.includes('cdn.myanimelist.net') ||
                        url.hostname.includes('s4.anilist.co') ||
                        url.hostname.includes('img.youtube.com') ||
                        url.hostname.includes('artworks.thetvdb.com') ||
                        url.pathname.endsWith('.png') ||
                        url.pathname.endsWith('.jpg') ||
                        url.pathname.endsWith('.jpeg');

  if (isPosterImage && request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(IMAGE_CACHE).then((cache) => {
              cache.put(request, responseClone);
              // LRU Pruning: if cache size exceeds 250 items, delete oldest 50
              limitCacheSize(IMAGE_CACHE, 250, 50);
            });
          }
          return response;
        }).catch(() => {
          // Silent fallback for images
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
    );
    return;
  }

  // 5. Static Assets (JS, CSS, fonts, internal images) -> Stale-While-Revalidate
  const isStaticAsset = url.pathname.startsWith('/_next/static') ||
                        url.pathname.startsWith('/cursors') ||
                        url.pathname.endsWith('.woff2') ||
                        url.pathname.endsWith('.svg');

  if (isStaticAsset && request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Push Notification Listener
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || '',
        icon: data.icon || '/logo.png',
        badge: '/app-icon.jpg',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/',
        },
      };
      event.waitUntil(
        self.registration.showNotification(data.title || 'AnimeWorld RJ', options)
      );
    } catch (e) {
      // Fallback text if payload isn't JSON
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('AnimeWorld RJ', {
          body: text,
          icon: '/logo.png',
          badge: '/app-icon.jpg',
        })
      );
    }
  }
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate to the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message listener for skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
