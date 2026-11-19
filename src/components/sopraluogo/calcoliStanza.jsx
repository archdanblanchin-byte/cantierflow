/**
 * Calcola le superfici di una stanza
 */
export function calcolaStanza(stanza) {
  const l = parseFloat(stanza.lunghezza) || 0;
  const w = parseFloat(stanza.larghezza) || 0;
  const h = parseFloat(stanza.altezza) || 0;

  // Pareti: (l + w) * 2 * h
  const mq_pareti_lordo = (l + w) * 2 * h;

  // Aperture (porte e archi): superficie da sottrarre dalle pareti
  const mq_aperture = (stanza.aperture || []).reduce((acc, ap) => {
    const mq = (parseFloat(ap.lunghezza) || 0) * (parseFloat(ap.altezza) || 0) * (ap.tipo === 'arco' ? 2 : 1);
    return acc + mq;
  }, 0);

  const mq_pareti = Math.max(0, mq_pareti_lordo - mq_aperture);

  // Soffitto: l * w
  const mq_soffitto = stanza.soffitto ? l * w : 0;

  // Travi: soffitto × 1.65
  const mq_travi = stanza.travi ? l * w * 1.65 : 0;

  // Sigillatura travi: ml_parete × 2 × sviluppo (default 1.65)
  const sviluppo = parseFloat(stanza.travi_sviluppo) || 1.65;
  const mq_sigillatura_travi = (stanza.travi && stanza.travi_sigillatura_ml)
    ? (parseFloat(stanza.travi_sigillatura_ml) || 0) * 2 * sviluppo
    : 0;

  // Voci extra aggregate per tipo
  const extra = {};
  (stanza.voci_extra || []).forEach((v) => {
    // Le voci "Altro" si raggruppano per descrizione: nel riepilogo si legge
    // il testo scritto dall'utente invece della parola "Altro".
    const desc = v.tipo === 'altro' ? (v.descrizione || '') : '';
    const key = desc ? `altro::${desc}` : v.tipo;
    if (!extra[key]) extra[key] = { valore: 0, unita: v.unita, descrizione: desc };
    // Calcola valore in base alla modalità (supporta sia lunghezze[] che lunghezza_m legacy)
    let valore = parseFloat(v.valore) || 0;
    if (v.modalita === 'lxa') {
      const lunghezze = v.lunghezze || (v.lunghezza_m ? [v.lunghezza_m] : []);
      const tot = lunghezze.reduce((s, l) => s + (parseFloat(l) || 0), 0);
      valore = tot * (parseFloat(v.altezza_m) || 0);
    } else if (v.modalita === 'perc') {
      // % rispetto alle pareti nette della stanza (calcolate sopra)
      const mq_base = Math.max(0, mq_pareti_lordo - mq_aperture) + (stanza.soffitto ? l * w : 0);
      valore = mq_base * ((parseFloat(v.valore) || 0) / 100);
    }
    extra[key].valore += valore;
  });

  // Travi esterne
  const mq_travi_esterne = (stanza.travi_esterne || []).reduce((acc, t) => {
    const l = parseFloat(t.lunghezza_m) || 0;
    const la = parseFloat(t.larghezza_m) || 0;
    const sv = parseFloat(t.sviluppo) || 1;
    const mq = t.modalita === 'lxa_sviluppo' ? l * la * sv : t.modalita === 'lxl' ? l * la : parseFloat(t.mq) || 0;
    return acc + mq;
  }, 0);

  // Pareti extra
  const mq_pareti_extra = (stanza.pareti_extra || []).reduce((acc, p) => {
    const mq = p.modalita === 'lxa'
      ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0)
      : parseFloat(p.mq) || 0;
    return acc + mq;
  }, 0);

  // Totale stanza (le travi sono ESCLUSE — voce separata)
  const totale_mq = mq_pareti + mq_soffitto + mq_pareti_extra + mq_travi_esterne;

  return { mq_pareti, mq_pareti_lordo, mq_soffitto, mq_travi, mq_sigillatura_travi, mq_aperture, mq_pareti_extra, mq_travi_esterne, extra, totale_mq };
}

export function calcolaTotaliGlobali(stanze) {
  const totali = {
    mq_pareti: 0,
    mq_soffitto: 0,
    mq_travi: 0,
    mq_sigillatura_travi: 0,
    totale_mq: 0,
    extra: {},
  };

  (stanze || []).forEach((s) => {
    const c = calcolaStanza(s);
    totali.mq_pareti += c.mq_pareti;
    totali.mq_soffitto += c.mq_soffitto;
    totali.mq_travi += c.mq_travi; // travi = voce separata, non nel totale pittura
    totali.mq_sigillatura_travi += c.mq_sigillatura_travi;
    totali.totale_mq += c.totale_mq;
    Object.entries(c.extra).forEach(([key, val]) => {
      if (!totali.extra[key]) totali.extra[key] = { valore: 0, unita: val.unita, descrizione: val.descrizione };
      totali.extra[key].valore += val.valore;
    });
  });

  return totali;
}

/**
 * Restituisce l'ambito di una stanza (interno/esterno).
 * Retrocompatibilità: facciate e travi_esterne → esterno; tutto il resto → interno.
 */
export function getAmbito(stanza) {
  if (stanza.ambito) return stanza.ambito;
  if (stanza.tipo === 'facciata' || stanza.tipo === 'travi_esterne') return 'esterno';
  return 'interno';
}

/**
 * Calcola i totali delle stanze normali/travi (escluse facciate) suddivisi per ambito.
 */
export function calcolaTotaliByAmbito(stanze) {
  const result = {
    interno: { mq_pareti: 0, mq_soffitto: 0, mq_travi: 0, mq_sigillatura_travi: 0, totale_mq: 0, extra: {}, count: 0 },
    esterno: { mq_pareti: 0, mq_soffitto: 0, mq_travi: 0, mq_sigillatura_travi: 0, totale_mq: 0, extra: {}, count: 0 },
  };

  (stanze || []).forEach(s => {
    if (s.tipo === 'facciata') return;
    const ambito = getAmbito(s);
    const c = calcolaStanza(s);
    const t = result[ambito];
    t.mq_pareti += c.mq_pareti;
    t.mq_soffitto += c.mq_soffitto;
    t.mq_travi += c.mq_travi;
    t.mq_sigillatura_travi += c.mq_sigillatura_travi;
    t.totale_mq += c.totale_mq;
    t.count++;
    Object.entries(c.extra).forEach(([key, val]) => {
      if (!t.extra[key]) t.extra[key] = { valore: 0, unita: val.unita, descrizione: val.descrizione };
      t.extra[key].valore += val.valore;
    });
  });

  return result;
}

/**
 * Calcola i mq totali di una facciata.
 */
export function facciataMqTotale(f) {
  const misure = (f.misure || []).reduce((acc, m) => acc + (parseFloat(m.mq) || 0), 0);
  const sottrai = (f.sottrazioni || []).reduce((acc, s) =>
    acc + (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * (s.tipo === 'porta_2_lati' ? 2 : 1), 0);
  const aggiungi = (f.porzioni || []).reduce((acc, p) =>
    acc + (p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0), 0);
  return misure - sottrai + aggiungi;
}