// Normalizza e deduplica un elenco di voci per la presentazione:
// - trim degli spazi
// - accorpa i duplicati case-insensitive (mantiene la prima versione ben formattata)
// - ordina alfabeticamente, mettendo eventuali vuoti in fondo
//
// La pulizia è solo visiva: i record originali nell'anagrafica non vengono toccati.
export function normalizzaElenco(voci = []) {
  const mappa = new Map();
  for (const raw of voci) {
    const pulito = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!pulito) continue;
    const chiave = pulito.toLowerCase();
    const esiste = mappa.get(chiave);
    if (!esiste) {
      mappa.set(chiave, pulito);
    } else if (pulito !== esiste && /^[A-Z]/.test(pulito) && !/^[A-Z]/.test(esiste)) {
      // preferisci la versione con l'iniziale maiuscola
      mappa.set(chiave, pulito);
    }
  }
  return [...mappa.values()].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}