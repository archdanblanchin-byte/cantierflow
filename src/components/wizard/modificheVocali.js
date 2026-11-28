const testo = (v) => typeof v === 'string' ? v.trim().slice(0, 1000) : undefined;
const numero = (v) => Number.isFinite(v) && v >= 0 ? v : undefined;
const uguale = (a, b) => String(a || '').trim().toLocaleLowerCase('it') === String(b || '').trim().toLocaleLowerCase('it');
const arrotonda = (n) => Math.round(n * 10000) / 10000;

function applicaCampi(before, v, catalogo, materiale, ordine) {
  const item = { ...before };
  const nome = testo(v.nome);
  const descrizione = testo(v.descrizione);
  if (descrizione !== undefined) item.descrizione = descrizione;
  if (materiale) {
    if (nome && !uguale(nome, item.descrizione_custom || item.nome)) {
      const match = catalogo.find(m => uguale(m.nome, nome));
      Object.assign(item, { materiale_id: match?.id || '', nome: match?.nome || nome, descrizione_custom: match ? '' : nome, unita_misura: match?.unita_misura || '', da_capannone: false });
    }
    if (testo(v.unita_misura) !== undefined) item.unita_misura = testo(v.unita_misura);
    if (numero(v.quantita) !== undefined) item.quantita = v.quantita;
    return item;
  }
  if (typeof v.extra === 'boolean') item.extra = v.extra;
  if (nome && !uguale(nome, item.tipo_lavorazione_nome || item.descrizione_custom || item.descrizione)) {
    const categoria = testo(v.categoria);
    const match = catalogo.find(t => uguale(t.nome, nome) && (!categoria || uguale(t.categoria, categoria))) || catalogo.find(t => uguale(t.nome, nome));
    Object.assign(item, { tipo_lavorazione_id: match?.id || '', tipo_lavorazione_nome: match?.nome || nome, categoria: match?.categoria || '__custom__', descrizione_custom: match ? '' : nome });
    if (descrizione === undefined) item.descrizione = nome;
  }
  const persone = numero(v.numero_persone) ?? (item.modalita_calcolo === 'per_persone' ? item.numero_persone : undefined);
  const perPersona = numero(v.ore_per_persona) ?? (item.modalita_calcolo === 'per_persone' ? item.ore_per_persona : undefined);
  if (numero(v.ore) !== undefined) {
    Object.assign(item, { ore: v.ore, modalita_calcolo: 'manuale', numero_persone: 0, ore_per_persona: 0 });
  } else if ((numero(v.numero_persone) !== undefined || numero(v.ore_per_persona) !== undefined) && persone > 0 && perPersona !== undefined) {
    Object.assign(item, { ore: arrotonda(persone * perPersona), modalita_calcolo: 'per_persone', numero_persone: persone, ore_per_persona: perPersona });
  }
  return { ...item, ordine: item.ordine ?? ordine };
}

export function descriviVoce(row, materiale, fmtOre) {
  if (!row) return '';
  const nome = materiale ? (row.descrizione_custom || row.nome) : (row.tipo_lavorazione_nome || row.descrizione_custom || row.descrizione);
  const dettagli = row.descrizione && !uguale(nome, row.descrizione) ? ` · ${row.descrizione}` : '';
  const valore = materiale ? [row.quantita ?? 0, row.unita_misura].filter(v => v !== undefined && v !== '').join(' ') : fmtOre(row.ore || 0);
  return `${nome || 'Voce senza nome'}${row.extra ? ' (Extra)' : ''}${dettagli} · ${valore}`;
}

export function preparaModifiche(righe, { modifiche = [], avviso }, { catalogo, materiale, oreSquadra }) {
  const righeFinali = [...righe];
  const operazioni = [];
  let ordine = righe.reduce((max, row) => Math.max(max, row.ordine ?? 0), -1) + 1;
  let residuo = null;
  let warning = avviso;
  const usate = new Set();
  for (const op of modifiche) {
    if (!op || !['aggiungi', 'correggi', 'rimuovi'].includes(op.azione)) continue;
    const nuova = op.azione === 'aggiungi';
    const index = nuova ? righeFinali.length : op.riga - 1;
    if (!nuova && (!Number.isInteger(op.riga) || !righe[index] || usate.has(index))) continue;
    const prima = nuova ? null : righe[index];
    const campi = op.campi || {};
    if (nuova && !(testo(campi.nome) || (!materiale && testo(campi.descrizione)))) continue;
    const base = prima || (materiale ? { quantita: 0 } : { ore: 0, extra: false, modalita_calcolo: 'manuale' });
    const dopo = op.azione === 'rimuovi' ? null : applicaCampi(base, campi, catalogo, materiale, nuova ? ordine++ : ordine);
    if (!nuova) usate.add(index);
    righeFinali[index] = dopo;
    const change = { index, azione: op.azione, prima, dopo };
    operazioni.push(change);
    if (!materiale && dopo && op.residuo) {
      if (residuo !== null) residuo = false;
      else residuo = change;
    }
  }
  if (residuo) {
    const assegnate = righeFinali.reduce((s, row, i) => s + (i === residuo.index ? 0 : row?.ore || 0), 0);
    const ore = arrotonda(oreSquadra - assegnate);
    if (Number.isFinite(ore) && ore > 0) {
      Object.assign(residuo.dopo, { ore, modalita_calcolo: 'manuale', numero_persone: 0, ore_per_persona: 0 });
      residuo.residuo = true;
    } else warning = [warning, 'Non ci sono ore disponibili da assegnare come residuo.'].filter(Boolean).join(' ');
  } else if (residuo === false) warning = [warning, 'Non ho assegnato il residuo: è stata indicata più di una lavorazione.'].filter(Boolean).join(' ');
  return { righe: righeFinali.filter(Boolean), cambi: operazioni.filter(c => JSON.stringify(c.prima) !== JSON.stringify(c.dopo)), avviso: warning };
}