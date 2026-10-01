// Service worker minimale richiesto per rendere l'app installabile come PWA.
// Il fetch handler è obbligatorio per i criteri di installabilità di Chrome:
// non usa cache, l'app continua a lavorare sempre online, senza contenuti vecchi.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Passa sempre alla rete: nessuna cache, nessun contenuto obsoleto.
  event.respondWith(fetch(event.request));
});
