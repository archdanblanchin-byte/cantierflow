import { caricaFotoPrivata } from "@/lib/campioni";

// Le foto delle tre categorie vivono nello storage privato: si caricano con
// UploadPrivateFile e si mostrano con un link firmato a scadenza.
export { caricaFotoPrivata, urlFoto } from "@/lib/campioni";

// Ogni foto è legata a un cantiere: le categorie si aprono per cartelle.
export const SENZA_CANTIERE = "__senza__";

export function gruppiCantiere(record) {
  const mappa = new Map();
  (record || []).forEach((r) => {
    const id = r.cantiere_id || SENZA_CANTIERE;
    const voce = mappa.get(id) || { id, nome: r.cantiere_nome || "Senza cantiere", count: 0 };
    voce.count += 1;
    mappa.set(id, voce);
  });
  return [...mappa.values()].sort((a, b) => String(a.nome).localeCompare(String(b.nome), "it"));
}

export function inCantiere(record, cantiereId) {
  return (record?.cantiere_id || SENZA_CANTIERE) === cantiereId;
}

function caricaImmagine(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Immagine non leggibile"));
    img.src = url;
  });
}

export function fileDaDataUrl(dataUrl, nome = "annotata.jpg") {
  const [meta, base64] = String(dataUrl).split(",");
  const tipo = (meta.match(/data:(.*?);/) || [])[1] || "image/jpeg";
  const binario = atob(base64 || "");
  const byte = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) byte[i] = binario.charCodeAt(i);
  return new File([byte], nome, { type: tipo });
}

export async function caricaAnnotataDaDataUrl(dataUrl) {
  return caricaFotoPrivata(fileDaDataUrl(dataUrl, "annotata.jpg"));
}

// Disegna i contorni della foto "prima": serve come guida per riprendere la
// stessa inquadratura quando si scatta il "dopo".
export async function contorniDaFoto(url) {
  const img = await caricaImmagine(url);
  const scala = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
  const larghezza = Math.max(1, Math.round(img.naturalWidth * scala));
  const altezza = Math.max(1, Math.round(img.naturalHeight * scala));

  const canvas = document.createElement("canvas");
  canvas.width = larghezza;
  canvas.height = altezza;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, larghezza, altezza);

  const origine = ctx.getImageData(0, 0, larghezza, altezza);
  const grigio = new Float32Array(larghezza * altezza);
  for (let i = 0; i < grigio.length; i += 1) {
    const p = i * 4;
    grigio[i] = origine.data[p] * 0.299 + origine.data[p + 1] * 0.587 + origine.data[p + 2] * 0.114;
  }

  const uscita = ctx.createImageData(larghezza, altezza);
  const soglia = 30;
  for (let y = 1; y < altezza - 1; y += 1) {
    for (let x = 1; x < larghezza - 1; x += 1) {
      const i = y * larghezza + x;
      const gx =
        -grigio[i - larghezza - 1] - 2 * grigio[i - 1] - grigio[i + larghezza - 1] +
        grigio[i - larghezza + 1] + 2 * grigio[i + 1] + grigio[i + larghezza + 1];
      const gy =
        -grigio[i - larghezza - 1] - 2 * grigio[i - larghezza] - grigio[i - larghezza + 1] +
        grigio[i + larghezza - 1] + 2 * grigio[i + larghezza] + grigio[i + larghezza + 1];
      const intensita = Math.sqrt(gx * gx + gy * gy);
      if (intensita > soglia) {
        const p = i * 4;
        uscita.data[p] = 255;
        uscita.data[p + 1] = 255;
        uscita.data[p + 2] = 255;
        uscita.data[p + 3] = Math.min(255, (intensita - soglia) * 4);
      }
    }
  }
  ctx.putImageData(uscita, 0, 0);
  return canvas.toDataURL("image/png");
}