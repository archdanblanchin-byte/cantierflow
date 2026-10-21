import { base44 } from "@/api/base44Client";

// Tipi di materiale riutilizzabile che finiscono in "Campioni e avanzi".
export const TIPI_CAMPIONE = [
  "Pittura",
  "Vernice",
  "Graffiato",
  "Rivestimento",
  "Smalto",
  "Impregnante",
  "Antiruggine",
  "Colla e adesivo",
  "Altro",
];

export const UNITA_CAMPIONE = ["L", "kg", "pz", "ml"];

// Un colore è valido solo se è un esadecimale pieno.
export function coloreValido(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(String(hex || "").trim());
}

// Testo leggibile sopra un riempimento di quel colore.
export function testoSuColore(hex) {
  if (!coloreValido(hex)) return "#14181f";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#14181f" : "#ffffff";
}

export function etichettaTipo(tipo) {
  return String(tipo || "").trim() || "Altro";
}

// L'archivio è condiviso: si legge a pagine finché non è completo.
export async function caricaCampioni() {
  const items = [];
  let cursor;
  for (let i = 0; i < 12; i++) {
    const page = await base44.entities.Campione.list({
      sort: "-updated_date",
      limit: 200,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return items;
}

export async function caricaCantieri() {
  const page = await base44.entities.Cantiere.list({ sort: "nome", limit: 500 });
  return page?.items || [];
}

// Le foto dei campioni sono private: si caricano nello storage privato
// e si mostrano con un link firmato a scadenza.
export async function caricaFotoPrivata(file) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return file_uri;
}

export async function urlFoto(file_uri) {
  if (!file_uri) return "";
  if (/^https?:\/\//.test(file_uri)) return file_uri;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri,
    expires_in: 3600,
  });
  return signed_url;
}

// Chiede all'AI di trascrivere l'etichetta fotografata.
export async function estraiEtichetta({ file_uri, tipo_etichetta }) {
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri,
    expires_in: 900,
  });
  const res = await base44.functions.invoke("estrai_etichetta", {
    foto_url: signed_url,
    tipo_etichetta,
  });
  if (res.data?.error) throw new Error(res.data.error);
  return res.data?.dati || {};
}