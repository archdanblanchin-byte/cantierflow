import { base44 } from '@/api/base44Client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// 210 x 297 mm a 96 dpi
const LARGHEZZA_A4_PX = 794;
const ALTEZZA_A4_PX = 1123;
const SCALA = 2;
const MAX_BASE64 = 8000000;

const attesaImmagine = (img) => new Promise((resolve) => {
  if (img.complete && img.naturalWidth > 0) return resolve();
  img.addEventListener('load', resolve, { once: true });
  img.addEventListener('error', resolve, { once: true });
});

// html2canvas non conosce i CSS grid: le griglie vengono ricostruite con flexbox
// usando le larghezze di colonna già risolte dal browser, così la pagina resta identica.
function griglieInFlex(doc) {
  Array.from(doc.querySelectorAll('*')).forEach((el) => {
    const cs = doc.defaultView.getComputedStyle(el);
    if (cs.display !== 'grid') return;
    const colonne = cs.gridTemplateColumns.split(' ').filter((c) => c.endsWith('px'));
    if (!colonne.length) return;
    el.style.display = 'flex';
    el.style.flexWrap = 'wrap';
    el.style.alignItems = 'flex-start';
    el.style.columnGap = cs.columnGap === 'normal' ? '0px' : cs.columnGap;
    el.style.rowGap = cs.rowGap === 'normal' ? '0px' : cs.rowGap;
    Array.from(el.children).forEach((figlio, i) => {
      const inline = figlio.getAttribute('style') || '';
      const tuttaRiga = /grid-column\s*:\s*1\s*\/\s*-1/.test(inline);
      figlio.style.width = tuttaRiga ? '100%' : colonne[i % colonne.length];
      figlio.style.flex = '0 0 auto';
      figlio.style.boxSizing = 'border-box';
    });
  });
}

// html2canvas non gestisce aspect-ratio né object-fit: ogni foto viene ritagliata
// alle stesse proporzioni che ha a schermo.
function preparaImmagine(img) {
  const r = img.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width));
  const h = Math.max(1, Math.round(r.height));
  if (img.naturalWidth && img.naturalHeight) {
    try {
      const c = document.createElement('canvas');
      c.width = w * SCALA;
      c.height = h * SCALA;
      const ctx = c.getContext('2d');
      const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
      ctx.drawImage(
        img,
        (c.width - img.naturalWidth * s) / 2,
        (c.height - img.naturalHeight * s) / 2,
        img.naturalWidth * s,
        img.naturalHeight * s,
      );
      img.src = c.toDataURL('image/jpeg', 0.85);
    } catch { /* in caso di problemi resta l'immagine originale */ }
  }
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.style.aspectRatio = 'auto';
  img.style.objectFit = 'fill';
  img.style.display = 'block';
}

function base64DaBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  return btoa(bin);
}

// Posizioni di taglio pagina che cadono tra un blocco e l'altro (non tagliano card e foto)
function calcolaTagli(confini, altezzaTotale) {
  const tagli = [];
  let corrente = 0;
  while (corrente + ALTEZZA_A4_PX < altezzaTotale - 1) {
    const target = corrente + ALTEZZA_A4_PX;
    let migliore = 0;
    confini.forEach((c) => {
      if (c > corrente + ALTEZZA_A4_PX * 0.9 && c <= target - 4) migliore = Math.max(migliore, c);
    });
    const taglio = Math.round(migliore > 0 ? migliore : target);
    if (taglio <= corrente) break;
    tagli.push(taglio);
    corrente = taglio;
  }
  return tagli;
}

/**
 * Genera il PDF del rilievo partendo dalla stessa impaginazione del pulsante "Genera PDF".
 * Restituisce il PDF in base64, oppure null se troppo pesante (in quel caso il salvataggio
 * su Drive usa il generatore del server).
 */
export async function generaPdfRilievo(sopraluogo) {
  const res = await base44.functions.invoke('generaPdfSopraluogo', { sopraluogo });
  const html = res.data?.html;
  if (!html) return null;
  const base64 = await htmlInPdf(html);
  // Il salvataggio su Drive usa il generatore del server quando il PDF è troppo pesante
  return base64.length > MAX_BASE64 ? null : base64;
}

/**
 * Trasforma una pagina HTML (impaginata a 794 px di larghezza) in un PDF base64.
 * Usata sia dal rilievo sia dalla visita: l'impaginazione arriva da fuori.
 */
export async function htmlInPdf(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-20000px;top:0;width:${LARGHEZZA_A4_PX}px;height:${ALTEZZA_A4_PX}px;border:0;background:#fff;`;
  document.body.appendChild(iframe);
  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
      setTimeout(resolve, 4000);
    });
    const doc = iframe.contentDocument;
    const body = doc.body;
    if (!body) return null;

    // senza barra di scorrimento la larghezza della pagina è esattamente 794 px
    doc.documentElement.style.overflow = 'hidden';

    // Le foto vengono ricaricate con crossOrigin per poterle ritagliare
    const immagini = Array.from(doc.images || []);
    immagini.forEach((img) => {
      const src = img.getAttribute('src');
      img.crossOrigin = 'anonymous';
      img.setAttribute('src', src);
    });
    await Promise.all(immagini.map(attesaImmagine));
    griglieInFlex(doc);
    immagini.forEach(preparaImmagine);
    await Promise.all(immagini.map(attesaImmagine));

    const bodyRect = body.getBoundingClientRect();
    const confini = [];
    Array.from(body.children).forEach((el) => {
      const r = el.getBoundingClientRect();
      confini.push(r.top - bodyRect.top, r.bottom - bodyRect.top);
    });
    const altezzaTotale = Math.max(body.scrollHeight, ALTEZZA_A4_PX);
    const tagli = calcolaTagli(confini, altezzaTotale);
    const partenze = [0, ...tagli];

    // Le pagine vengono disegnate a gruppi (il canvas non può superare i 16384 px)
    const pagine = partenze.map((y, i) => ({
      y,
      h: Math.min(ALTEZZA_A4_PX, (i + 1 < partenze.length ? partenze[i + 1] : altezzaTotale) - y),
    })).filter((p) => p.h > 0);

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    let primaPagina = true;
    let indice = 0;
    while (indice < pagine.length) {
      const gruppo = [];
      let altezzaGruppo = 0;
      while (indice < pagine.length) {
        const p = pagine[indice];
        if (gruppo.length && altezzaGruppo + p.h > 6500) break;
        gruppo.push(p);
        altezzaGruppo += p.h;
        indice++;
      }
      const canvas = await html2canvas(body, {
        x: 0,
        y: gruppo[0].y,
        width: LARGHEZZA_A4_PX,
        height: altezzaGruppo,
        scale: SCALA,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: LARGHEZZA_A4_PX,
        windowHeight: altezzaTotale,
      });
      let offset = 0;
      gruppo.forEach((p) => {
        let sorgente = canvas;
        if (gruppo.length > 1) {
          const daPx = Math.round(offset * SCALA);
          const aPx = Math.round((offset + p.h) * SCALA);
          sorgente = document.createElement('canvas');
          sorgente.width = canvas.width;
          sorgente.height = aPx - daPx;
          const ctx = sorgente.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sorgente.width, sorgente.height);
          ctx.drawImage(canvas, 0, daPx, canvas.width, sorgente.height, 0, 0, canvas.width, sorgente.height);
        }
        if (!primaPagina) pdf.addPage();
        pdf.addImage(
          sorgente.toDataURL('image/jpeg', 0.82),
          'JPEG',
          0,
          0,
          210,
          (p.h * 210) / LARGHEZZA_A4_PX,
        );
        primaPagina = false;
        offset += p.h;
      });
    }
    return base64DaBuffer(pdf.output('arraybuffer'));
  } finally {
    iframe.remove();
  }
}