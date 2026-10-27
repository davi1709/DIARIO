// Guarda o app no aparelho para abrir mesmo sem internet. Os dados em si ficam no Firestore e no armazenamento local.
const CACHE = 'diario-v3';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'favicon.ico', 'apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];
const HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === self.location.origin;
  if (!same && !HOSTS.includes(u.hostname)) return;
  const isPage = same && (r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html'));
  if (isPage) {
    // a página principal vem da rede quando há internet, para as atualizações chegarem logo
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(h => h || caches.match('index.html'))));
    return;
  }
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(r, { ignoreSearch: same }).then(hit => {
        const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(r, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
