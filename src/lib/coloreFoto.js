// Stima il colore dalla foto appena scattata, prima dell'upload.
// Si lavora sull'anteprima locale del file, così il browser non blocca la lettura.

function caricaImmagine(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Immagine non leggibile"));
    img.src = url;
  });
}

function hexDaRgb(r, g, b) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

// Media di una piccola area attorno al punto scelto (in percentuale sull'immagine).
export async function coloreDaFoto(url, xPct = 0.5, yPct = 0.5) {
  const img = await caricaImmagine(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const lato = Math.max(10, Math.round(Math.min(canvas.width, canvas.height) * 0.16));
  const cx = Math.round(canvas.width * xPct);
  const cy = Math.round(canvas.height * yPct);
  const x = Math.max(0, Math.min(canvas.width - lato, cx - lato / 2));
  const y = Math.max(0, Math.min(canvas.height - lato, cy - lato / 2));

  const dati = ctx.getImageData(x, y, lato, lato).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < dati.length; i += 4) {
    r += dati[i];
    g += dati[i + 1];
    b += dati[i + 2];
    n += 1;
  }
  return hexDaRgb(r / n, g / n, b / n);
}