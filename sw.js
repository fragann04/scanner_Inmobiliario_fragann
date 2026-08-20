// Service worker del Scanner Inmobiliario — estrategia RED PRIMERO:
// siempre intenta traer la versión fresca (los datos cambian a diario) y
// solo usa la copia en caché si no hay conexión. Así la PWA nunca enseña
// inventario viejo teniendo internet.
const CACHE = "scanner-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith("http")) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
