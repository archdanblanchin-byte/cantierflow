import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// La check list di magazzino è una tabella a colonne fisse:
// N° sezione | prodotto | quantitativo minimo | unità | fornitore.
const LIMITE_SEZIONE = 60;
const LIMITE_NOME = 270;
const LIMITE_MINIMO = 320;
const LIMITE_UNITA = 395;

// Trasforma il quantitativo minimo scritto a mano in un numero.
// X, trattino, "cesto", "vuoto", "con mq" non sono quantità: restituisce null.
export function minimoNumerico(valore) {
  const s = String(valore ?? "").replace(",", ".").trim();
  if (!s || !/\d/.test(s)) return null;
  const somma = s.match(/^(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)$/);
  if (somma) return Number(somma[1]) + Number(somma[2]);
  const prodotto = s.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i);
  if (prodotto) return Number(prodotto[1]) * Number(prodotto[2]);
  const primo = s.match(/\d+(?:\.\d+)?/);
  return primo ? Number(primo[0]) : null;
}

// Porta le righe lette nel formato dell'inventario: la colonna N° è compilata solo
// sulla prima riga di ogni gruppo, quindi viene propagata; i doppioni interni al
// file vengono uniti e i minimi non numerici restano annotati.
export function preparaRighe(grezze) {
  let sezioneCorrente = "";
  const visti = new Set();
  const righe = [];

  for (const grezza of grezze) {
    if (grezza.sezione) sezioneCorrente = String(grezza.sezione).trim();
    const nome = String(grezza.nome || "").trim();
    const chiave = nome.toLowerCase().replace(/\s+/g, " ");
    if (!nome || visti.has(chiave)) continue;
    visti.add(chiave);

    const minimo = minimoNumerico(grezza.minimo);
    const note = [];
    const testoMinimo = String(grezza.minimo ?? "").trim();
    if (minimo === null && testoMinimo) note.push(`Minimo check list: ${testoMinimo}`);
    let unita = String(grezza.unita_misura ?? "").trim();
    if (/^\d+$/.test(unita)) {
      note.push(`Unità check list: ${unita}`);
      unita = "";
    }

    righe.push({
      nome,
      posizione_scaffale: sezioneCorrente,
      fornitore: String(grezza.fornitore || "").trim(),
      unita_misura: unita,
      minimo,
      note_checklist: note.join(" · "),
    });
  }

  return righe;
}

// Legge il PDF della check list nel browser e restituisce i prodotti pronti per l'importazione.
export async function leggiChecklistPdf(file) {
  const buffer = await file.arrayBuffer();
  const documento = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false }).promise;
  const grezze = [];

  try {
    for (let p = 1; p <= documento.numPages; p++) {
      const pagina = await documento.getPage(p);
      const contenuto = await pagina.getTextContent();
      const linee = [];

      for (const voce of contenuto.items) {
        const y = Math.round(voce.transform[5]);
        let linea = linee.find((l) => Math.abs(l.y - y) <= 2);
        if (!linea) {
          linea = { y, celle: [] };
          linee.push(linea);
        }
        linea.celle.push({ x: Math.round(voce.transform[4]), testo: voce.str.trim() });
      }

      linee.sort((a, b) => b.y - a.y);

      for (const linea of linee) {
        const celle = linea.celle.filter((c) => c.testo);
        if (!celle.length) continue;
        if (celle.some((c) => /CHECK LIST|Pagina \d+ di|Fornitore|Tipologia/i.test(c.testo))) continue;

        const nome = celle
          .filter((c) => c.x >= LIMITE_SEZIONE && c.x < LIMITE_NOME)
          .map((c) => c.testo)
          .join(" ")
          .trim();
        if (!nome) continue;

        grezze.push({
          sezione: celle.find((c) => c.x < LIMITE_SEZIONE)?.testo || "",
          nome,
          minimo: celle.find((c) => c.x >= LIMITE_NOME && c.x < LIMITE_MINIMO)?.testo || "",
          unita_misura: celle.find((c) => c.x >= LIMITE_MINIMO && c.x < LIMITE_UNITA)?.testo || "",
          fornitore: celle
            .filter((c) => c.x >= LIMITE_UNITA)
            .map((c) => c.testo)
            .join(" ")
            .trim(),
        });
      }
    }
  } finally {
    documento.destroy();
  }

  return preparaRighe(grezze);
}