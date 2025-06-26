const CACHE_NAME = 'yokamon-quiz-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap'
];
self.addEventListener('install', event => { event.waitUntil( caches.open(CACHE_NAME).then(cache => { console.log('Opened cache'); return cache.addAll(urlsToCache); }) ); });
self.addEventListener('activate', event => { const cacheWhitelist = [CACHE_NAME]; event.waitUntil( caches.keys().then(cacheNames => { return Promise.all( cacheNames.map(cacheName => { if (cacheWhitelist.indexOf(cacheName) === -1) { return caches.delete(cacheName); } }) ); }) ); });
self.addEventListener('fetch', event => { if (event.request.url.includes('/.netlify/functions/')) { event.respondWith(fetch(event.request)); return; } event.respondWith( caches.match(event.request).then(response => { if (response) { return response; } return fetch(event.request).then( response => { if(!response || response.status !== 200 || response.type !== 'basic') { return response; } const responseToCache = response.clone(); caches.open(CACHE_NAME).then(cache => { cache.put(event.request, responseToCache); }); return response; } ); }) ); });
