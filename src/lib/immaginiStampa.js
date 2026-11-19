// Le foto caricate (spesso da telefono, 3-5 MB l'una) finirebbero nel PDF a piena
// risoluzione, rendendo il file enorme. Prima della stampa ogni immagine viene
// ridimensionata e ricompressa una sola volta, poi riutilizzata dalla cache.
const cache = new Map();

const LATO_MAX = 1400;
const QUALITA = 0.8;

export function caricaImmagineStampa(url) {
  if (!url || typeof url !== 'string') return Promise.resolve(url);
  if (cache.has(url)) return cache.get(url);

  const promessa = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const larghezza = img.naturalWidth;
        const altezza = img.naturalHeight;
        if (!larghezza || !altezza) return resolve(url);
        const scala = Math.min(1, LATO_MAX / Math.max(larghezza, altezza));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(larghezza * scala));
        canvas.height = Math.max(1, Math.round(altezza * scala));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(blob ? URL.createObjectURL(blob) : url),
          'image/jpeg',
          QUALITA,
        );
      } catch {
        // immagine non elaborabile (formato o permessi): resta l'originale
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });

  cache.set(url, promessa);
  return promessa;
}