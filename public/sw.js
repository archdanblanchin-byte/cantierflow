// Service worker minimale richiesto per rendere l'app installabile come PWA.
// Non intercetta le richieste: l'app continua a lavorare sempre online,
// senza rischi di contenuti vecchi in cache.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
