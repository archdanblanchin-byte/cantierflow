import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// "ResizeObserver loop completed with undelivered notifications" è un avviso
// interno del browser (non un errore dell'app): nasce dai pannelli che si
// ridimensionano da soli (menu a tendina, tendine di ricerca). Non rompe nulla,
// quindi lo silenziamo per non farlo comparire come errore.
window.addEventListener('error', (e) => {
  if (typeof e.message === 'string' && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

// Registra il service worker per rendere l'app installabile come PWA.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)