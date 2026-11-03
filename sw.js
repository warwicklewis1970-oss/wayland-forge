// Wayland Forge service worker: cache everything for offline use.
const VERSION = 'wayland-forge-v38';
const ASSETS = [
  './', './index.html', './style.css', './js/app.js', './js/blacksmith.js', './js/tour.js', './manifest.webmanifest',
  './vendor/opentype.min.js', './vendor/jspdf.umd.min.js', './vendor/svg2pdf.umd.min.js', './vendor/imagetracer.js',
  './icons/anvil.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  "./fonts/MountainsofChristmas-Bold-sub.ttf",
  "./fonts/BerkshireSwash-Regular-sub.ttf",
  "./fonts/EmilysCandy-Regular-sub.ttf",
  "./fonts/GreatVibes-Regular-sub.ttf",
  "./fonts/DancingScript-sub.ttf",
  "./fonts/Pacifico-Regular-sub.ttf",
  "./fonts/Lobster-Regular-sub.ttf",
  "./fonts/Fredoka-sub.ttf",
  "./fonts/AlfaSlabOne-Regular.ttf",
  "./fonts/BebasNeue-Regular.ttf",
  "./fonts/Cinzelwght.ttf",
  "./fonts/MetalMania-Regular.ttf",
  "./fonts/Oswaldwght.ttf",
  "./fonts/PirataOne-Regular.ttf",
  "./fonts/PlayfairDisplaywght.ttf",
  "./fonts/Rye-Regular.ttf",
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so updates show immediately), cache as offline fallback.
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
});
