// Eenvoudige service worker: app-bestanden offline beschikbaar,
// altijd eerst het netwerk proberen (zodat updates direct doorkomen).
const CACHE = 'vdven-v2';
const BESTANDEN = ['./', './index.html', './style.css', './app.js', './config.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return; // Supabase e.d. niet cachen
  if (url.pathname.endsWith('/version.json')) return; // altijd rechtstreeks
  // 'no-cache': bij de server navragen of er een nieuwere versie is (geen verouderde kopie).
  // Een paginaverzoek (navigate) mag niet met extra opties worden gekopieerd; daarom via de url.
  const verzoek = e.request.mode === 'navigate'
    ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
    : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    fetch(verzoek)
      .then((res) => {
        const kopie = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, kopie));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
