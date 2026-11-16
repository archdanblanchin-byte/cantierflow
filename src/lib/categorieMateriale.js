// Categorie merceologiche suggerite per l'inventario.
// Sono un suggerimento: il magazziniere può comunque scrivere una categoria propria.
export const CATEGORIE_MATERIALE = [
  "Pitture, vernici e solventi",
  "Manti, intonaci e rasanti",
  "Pulizia, protezione e adesivi",
  "Rulli e pennelli",
  "Attrezzi e utensili",
  "Abbigliamento e DPI",
  "Ferramenta e minuteria",
  "Silicone e sigillanti",
  "Abrasivi e carteggiatura",
  "Isolanti e pannelli",
  "Idraulica e impianti",
  "Materiale elettrico",
  "Segnaletica di cantiere",
  "Varie",
];

export const SENZA_CATEGORIA = "Senza categoria";

// Sottocategorie di gestione del magazzino. Il responsabile le usa per dividere
// i materiali che deve controllare ogni giorno dagli altri.
export const CONTROLLO_QUOTIDIANO = "controllare ogni giorno";
export const SOTTOCATEGORIE_MATERIALE = [
  CONTROLLO_QUOTIDIANO,
  "stagionale",
  "occasionale",
  "non gestito",
];

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

// Sottocategorie presenti in inventario, con il numero di prodotti per ciascuna.
// "controllare ogni giorno" viene sempre mostrata per prima.
export function sottocategoriePresenti(materiali) {
  const conteggi = new Map();
  materiali.forEach((m) => {
    const s = String(m.sottocategoria || "").trim();
    if (!s) return;
    conteggi.set(s, (conteggi.get(s) || 0) + 1);
  });
  return [...conteggi.keys()]
    .sort((a, b) => {
      if (a === CONTROLLO_QUOTIDIANO) return -1;
      if (b === CONTROLLO_QUOTIDIANO) return 1;
      return a.localeCompare(b, "it");
    })
    .map((nome) => ({ nome, conteggio: conteggi.get(nome) }));
}

// Scaffali presenti in inventario, in ordine numerico.
export function scaffaliPresenti(materiali) {
  return [...new Set(materiali.map((m) => String(m.posizione_scaffale || "").trim()).filter(Boolean))].sort(
    (a, b) => (numeroScaffale(a) ?? 9999) - (numeroScaffale(b) ?? 9999) || a.localeCompare(b, "it")
  );
}