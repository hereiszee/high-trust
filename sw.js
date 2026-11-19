/* High Trust service worker (docs/PERF.md).
   - assets/opt/* files carry a content hash in their name: cache-first, kept until a new manifest stops listing them
   - pinned CDN files (three r128, fonts): cache-first
   - everything else from this site (index.html, js, css, manifest.json, source assets): network first, cache when offline
   tools/build-assets.js rewrites ASSET_VERSION; bump SHELL_VERSION by hand only to throw away the cached app shell. */
const ASSET_VERSION='3eb45449';
const SHELL_VERSION='1';
const C_ASSETS='ht-assets', C_CDN='ht-cdn', C_SHELL='ht-shell-'+SHELL_VERSION;
const CDN=/^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.gstatic\.com|fonts\.googleapis\.com)\//;

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('ht-shell-') && k !== C_SHELL) await caches.delete(k);
  /* drop hashed asset files the current manifest no longer lists */
  try {
    const r = await fetch('assets/opt/manifest.json', { cache: 'no-cache' }); const m = await r.json(); const keep = new Set();
    const add = u => keep.add(new URL(u, self.registration.scope).href);
    for (const e of Object.values(m.files)) for (const t of ['m', 'l']) if (e[t] && e[t].f) Object.values(e[t].f).forEach(add);
    for (const b of Object.values(m.boot || {})) add(b.url);
    const c = await caches.open(C_ASSETS); for (const q of await c.keys()) if (!keep.has(q.url)) await c.delete(q);
  } catch (err) { }
  await self.clients.claim();
})()));

async function cacheFirst(req, name) {
  const c = await caches.open(name); const hit = await c.match(req); if (hit) return hit;
  const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r;
}
async function networkFirst(req) {
  const c = await caches.open(C_SHELL);
  try {
    const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r;
  } catch (err) { const hit = await c.match(req, { ignoreSearch: true }); if (hit) return hit; throw err }
}
/* the page sends what it loaded before this worker was in control: cache it (mostly straight from the HTTP cache) */
self.addEventListener('message', e => {
  const list = e.data && e.data.warm; if (!Array.isArray(list)) return;
  e.waitUntil((async () => { for (const href of list.slice(0, 400)) { try {
    const u = new URL(href); let name;
    if (u.origin === self.location.origin) name = u.pathname.includes('/assets/opt/') && !u.pathname.endsWith('/manifest.json') ? C_ASSETS : C_SHELL;
    else if (CDN.test(href)) name = C_CDN; else continue;
    const c = await caches.open(name); if (await c.match(href)) continue;
    const r = await fetch(href, { mode: u.origin === self.location.origin || !/fonts\.googleapis/.test(href) ? 'cors' : 'no-cors', credentials: 'omit' });
    if (r.ok || r.type === 'opaque') await c.put(href, r);
  } catch (err) { } } })());
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (u.pathname.includes('/assets/opt/') && !u.pathname.endsWith('/manifest.json')) e.respondWith(cacheFirst(req, C_ASSETS));
    else e.respondWith(networkFirst(req));
  } else if (CDN.test(req.url)) e.respondWith(cacheFirst(req, C_CDN));
});
