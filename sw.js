/* Suivi de cultures — service worker
   Page : réseau d'abord (toujours à jour, marche hors-ligne). Autres fichiers : cache d'abord.
   Appels IA jamais mis en cache. Nouvelle version activée au clic « Recharger » (message 'skipWaiting'). */
const VERSION = '3.4';
const CACHE = 'suivi-cultures-' + VERSION;
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];
const IA_HOSTS = /(^|\.)(api\.mistral\.ai|generativelanguage\.googleapis\.com|api\.anthropic\.com|api\.openai\.com)$/;
self.addEventListener('install', e => { e.waitUntil((async () => { const c = await caches.open(CACHE); await Promise.allSettled(ASSETS.map(a => c.add(a))); })()); });
self.addEventListener('activate', e => { e.waitUntil((async () => { const ks = await caches.keys(); await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))); await self.clients.claim(); })()); });
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (err) { return; }
  if (IA_HOSTS.test(url.hostname)) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  const isPage = req.mode === 'navigate' || req.destination === 'document';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isPage) { try { const r = await fetch(req); if (r && r.ok) cache.put(req, r.clone()); return r; } catch (err) { return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error(); } }
    const hit = await cache.match(req);
    if (hit) { fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); }).catch(() => {}); return hit; }
    try { const r = await fetch(req); if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; } catch (err) { return Response.error(); }
  })());
});
