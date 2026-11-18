import { base44 } from "@/api/base44Client";
import { num, totaliRilievi } from "@/lib/sopralluogoCalc";

export const STATI = [
  { key: "bozza", label: "Bozza", cls: "bg-slate-100 text-slate-700" },
  { key: "compilato", label: "Compilato", cls: "bg-emerald-100 text-emerald-700" },
  { key: "da_sviluppare", label: "Da sviluppare", cls: "bg-amber-100 text-amber-700" },
  { key: "preventivo_impostato", label: "Preventivo impostato", cls: "bg-blue-100 text-blue-700" },
];

export const statoInfo = (key) => STATI.find((s) => s.key === key) || STATI[0];

export const TIPI_ANAGRAFICA = [
  { key: "lavorazione", label: "Lavorazioni" },
  { key: "elemento", label: "Elementi" },
  { key: "stanza", label: "Stanze" },
  { key: "unita", label: "Unità" },
  { key: "sottrazione", label: "Sottrazioni" },
];

// Valori iniziali: le voci personalizzate si aggiungono nell'entità SopralluogoAnagrafica.
export const ANAGRAFICHE_DEFAULT = {
  lavorazione: ["Pittura interna", "Pittura esterna", "Intonaco termodeumidificante", "Resina", "Verniciatura travi", "Cartongesso", "Tramezzi", "Contropareti", "Controsoffitti", "Quadrotti", "Cappotto", "Cappotto con aerogel", "Altre lavorazioni"],
  elemento: ["Trave", "Parete extra", "Pilastro", "Nicchia", "Cornicione", "Zoccolino"],
  stanza: ["Soggiorno", "Cucina", "Camera", "Bagno", "Corridoio", "Ingresso", "Scala", "Studio", "Garage", "Cantina"],
  unita: ["m²", "ml", "m³", "pz", "a corpo"],
  sottrazione: ["Porta", "Finestra", "Portafinestra", "Arco", "Apertura", "Nicchia"],
};

export const newId = () => Math.random().toString(36).slice(2, 10);

export function nuovoSopralluogo() {
  return {
    tipo: "interno",
    cognome: "",
    nome: "",
    cantiere_nome: "",
    indirizzo: "",
    citta: "",
    latitudine: "",
    longitudine: "",
    telefono: "",
    email: "",
    data: new Date().toISOString().slice(0, 10),
    attenzione_attiva: false,
    attenzione: { nome: "", cognome: "", indirizzo: "", citta: "", telefono: "", email: "" },
    rilievi: [],
    prodotti_particolari: "",
    note_generali: "",
    note_dettaglio: "",
    foto_generali: [],
    foto_quote: [],
    allegati: [],
    preventivo_riferimento: "",
  };
}

export const nuovaMisura = (modalita, ultimaAltezza = "") => ({
  id: newId(),
  descrizione: "",
  riferimento: false,
  ...(modalita === "stanza" ? { altezza: ultimaAltezza, soffitto: true } : {}),
});

export const nuovaPorzione = (modalita = "semplice", ultimaAltezza = "") => ({
  id: newId(),
  nome: "",
  modalita,
  unita: "m²",
  note: "",
  misure: [nuovaMisura(modalita, ultimaAltezza)],
});

export const nomeCliente = (s) => [s.cognome, s.nome].filter(Boolean).join(" ") || "Senza nome";

// Stato dai dati: preventivo collegato > misure completate > bozza.
export function statoCalcolato(s) {
  if (String(s.preventivo_riferimento || "").trim()) return "preventivo_impostato";
  const rilievi = s.rilievi || [];
  if (rilievi.length) {
    const t = totaliRilievi(rilievi);
    if (t.lavorazioni.every((l) => l.porzioni.some((p) => p.totale > 0))) return "compilato";
  } else if ((s.stanze || []).length) {
    return "compilato";
  }
  return "bozza";
}

// La scelta manuale prevale.
export const statoEffettivo = (s) => s.stato_manuale || statoCalcolato(s);

export function cercaSopralluogo(s, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [s.cognome, s.nome, s.cantiere_nome, s.indirizzo, s.citta, s.telefono, s.email].some((v) =>
    String(v || "").toLowerCase().includes(q)
  );
}

export const numStanze = (s) =>
  (s.rilievi || []).reduce((n, r) => n + (r.porzioni || []).length, 0) + (s.stanze || []).length;

export const numFoto = (s) =>
  (s.foto_generali || []).length +
  (s.foto_quote || []).length +
  (s.rilievi || []).reduce((n, r) => n + (r.foto || []).length, 0);

const CAMPI_SISTEMA = ["id", "created_date", "updated_date", "created_by", "created_by_id", "is_sample", "entity_name", "app_id"];

// Solo valori serializzabili: coordinate numeriche, nessun campo di sistema.
export function payloadDaDraft(draft) {
  const p = {};
  Object.entries(draft).forEach(([k, v]) => {
    if (!CAMPI_SISTEMA.includes(k)) p[k] = v;
  });
  p.latitudine = String(p.latitudine ?? "").trim() === "" ? null : num(p.latitudine);
  p.longitudine = String(p.longitudine ?? "").trim() === "" ? null : num(p.longitudine);
  if (!p.stato_manuale) delete p.stato_manuale;
  return p;
}

export async function caricaSopralluoghi() {
  const items = [];
  let cursor;
  for (let i = 0; i < 12; i++) {
    const page = await base44.entities.Sopralluogo.list({ sort: "-updated_date", limit: 200, ...(cursor ? { cursor } : {}) });
    items.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return items;
}

export function sposta(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copia = [...arr];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}