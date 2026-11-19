// Livello di avanzamento del sopralluogo.
// È calcolato dai dati del sopralluogo, così la lista resta sempre veritiera
// senza dover aggiornare a mano nessuna etichetta.
export const STATI_PERCORSO = {
  bozza: { label: 'Bozza', className: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  compilato: { label: 'Compilato', className: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  da_sviluppare: { label: 'Da sviluppare', className: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  preventivo_impostato: { label: 'Preventivo impostato', className: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
};

export const ORDINE_PERCORSO = ['bozza', 'compilato', 'da_sviluppare', 'preventivo_impostato'];

// Una stanza è "sviluppata" quando ha le misure del suo ambito:
// campate misurate (facciate) oppure lunghezza × larghezza × altezza (interni).
function stanzaSviluppata(stanza) {
  if (!stanza) return false;
  const haCampate = (stanza.misure || []).some((m) => (Number(m.mq) || 0) > 0);
  const haPorzioni = (stanza.pareti_extra || []).some((p) => (Number(p.mq) || 0) > 0);
  return (
    haCampate ||
    haPorzioni ||
    (Number(stanza.lunghezza) > 0 && Number(stanza.larghezza) > 0 && Number(stanza.altezza) > 0)
  );
}

export function calcolaStatoPercorso(sopraluogo) {
  if (!sopraluogo) return 'bozza';
  // Lo stato scelto a mano dalla lista ha la precedenza
  if (STATI_PERCORSO[sopraluogo.stato_manuale]) return sopraluogo.stato_manuale;
  if (sopraluogo.preventivo_id || sopraluogo.preventivo_numero) return 'preventivo_impostato';
  const stanze = (sopraluogo.stanze || []).filter(Boolean);
  return stanze.length > 0 && stanze.every(stanzaSviluppata) ? 'compilato' : 'bozza';
}

export function infoStatoPercorso(sopraluogo) {
  const key = calcolaStatoPercorso(sopraluogo);
  return { key, livello: ORDINE_PERCORSO.indexOf(key), ...STATI_PERCORSO[key] };
}