/**
 * MOVFLIX — Service Worker v11
 * Network-first with same-origin-only caching (no cross-origin response poisoning).
 */
const CACHE_NAME = "movflix-v11";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache cross-origin traffic (API, streams, fonts) — pass straight through
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network first, cache + home fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(() =>
        caches.match(req).then(cached => cached || caches.match("/index.html"))
      )
    );
    return;
  }

  // Same-origin assets: network first, then cache
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
