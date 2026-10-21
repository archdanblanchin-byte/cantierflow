// Categorie merceologiche suggerite per l'inventario.
// Sono un suggerimento: il magazziniere può comunque scrivere una categoria propria.
export const CATEGORIE_MATERIALE = [
  "Pitture e vernici",
  "Malte e intonaci",
  "Rasanti e stucchi",
  "Prodotti di protezione",
  "Prodotti di pulizia",
  "Rulli e pennelli",
  "Attrezzi e utensili",
  "Abbigliamento e DPI",
  "Ferramenta e minuteria",
  "Nastri e adesivi",
  "Silicone e sigillanti",
  "Abrasivi e carteggiatura",
  "Impermeabilizzanti e guaine",
  "Solventi e diluenti",
  "Isolanti e pannelli",
  "Idraulica e impianti",
  "Materiale elettrico",
  "Antigraffiti",
  "Varie",
];

export const SENZA_CATEGORIA = "Senza categoria";

export function etichettaCategoria(valore) {
  return String(valore || "").trim() || SENZA_CATEGORIA;
}

// Gli scaffali vanno letti come numeri: 1, 2, 3 ... 85 e non 1, 10, 11, 2.
export function numeroScaffale(valore) {
  const trovato = String(valore ?? "").match(/\d+/);
  return trovato ? Number(trovato[0]) : null;
}

export function confrontaScaffale(a, b) {
  const na = numeroScaffale(a.posizione_scaffale);
  const nb = numeroScaffale(b.posizione_scaffale);
  if (na === null && nb === null) return String(a.nome).localeCompare(String(b.nome), "it");
  if (na === null) return 1;
  if (nb === null) return -1;
  if (na !== nb) return na - nb;
  return String(a.nome).localeCompare(String(b.nome), "it");
}

// Categorie effettivamente presenti in inventario, nell'ordine suggerito,
// con il numero di prodotti di ciascuna.
export function categoriePresenti(materiali) {
  const conteggi = new Map();
  materiali.forEach((m) => {
    const c = etichettaCategoria(m.categoria);
    conteggi.set(c, (conteggi.get(c) || 0) + 1);
  });
  const posizione = (c) => {
    const i = CATEGORIE_MATERIALE.indexOf(c);
    return i === -1 ? 999 : i;
  };
  return [...conteggi.keys()]
    .sort((a, b) => posizione(a) - posizione(b) || a.localeCompare(b, "it"))
    .map((nome) => ({ nome, conteggio: conteggi.get(nome) }));
}

// Scaffali presenti in inventario, in ordine numerico.
export function scaffaliPresenti(materiali) {
  return [...new Set(materiali.map((m) => String(m.posizione_scaffale || "").trim()).filter(Boolean))].sort(
    (a, b) => (numeroScaffale(a) ?? 9999) - (numeroScaffale(b) ?? 9999) || a.localeCompare(b, "it")
  );
}