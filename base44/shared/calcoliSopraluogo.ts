// Calcoli del sopralluogo condivisi dalle funzioni di stampa e di salvataggio su Drive.

export function calcolaStanza(s) {
  const l = parseFloat(s.lunghezza) || 0;
  const w = parseFloat(s.larghezza) || 0;
  const h = parseFloat(s.altezza) || 0;
  const mq_pareti_lordo = (l + w) * 2 * h;
  const mq_aperture = (s.aperture || []).reduce((acc, ap) =>
    acc + (parseFloat(ap.lunghezza) || 0) * (parseFloat(ap.altezza) || 0) * (ap.tipo === 'arco' ? 2 : 1), 0);
  const mq_pareti = Math.max(0, mq_pareti_lordo - mq_aperture);
  const mq_soffitto = s.soffitto ? l * w : 0;
  const mq_travi = s.travi ? l * w * 1.65 : 0;
  const sviluppo = parseFloat(s.travi_sviluppo) || 1.65;
  const mq_sig = (s.travi && s.travi_sigillatura_ml) ? (parseFloat(s.travi_sigillatura_ml) || 0) * 2 * sviluppo : 0;
  const mq_pareti_extra = (s.pareti_extra || []).reduce((acc, p) =>
    acc + (p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0), 0);
  const mq_travi_esterne = (s.travi_esterne || []).reduce((acc, t) => {
    const tl = parseFloat(t.lunghezza_m) || 0, tla = parseFloat(t.larghezza_m) || 0, tsv = parseFloat(t.sviluppo) || 1;
    return acc + (t.modalita === 'lxa_sviluppo' ? tl * tla * tsv : t.modalita === 'lxl' ? tl * tla : parseFloat(t.mq) || 0);
  }, 0);
  const extra = {};
  (s.voci_extra || []).forEach((v) => {
    // Le voci "Altro" si raggruppano per descrizione, così nel riepilogo si legge
    // la descrizione scritta dall'utente e non la parola "Altro".
    const desc = v.tipo === 'altro' ? (v.descrizione || '') : '';
    const key = desc ? `altro::${desc}` : v.tipo;
    if (!extra[key]) extra[key] = { valore: 0, unita: v.unita, descrizione: desc };
    extra[key].valore += parseFloat(v.valore) || 0;
  });
  return {
    mq_pareti_lordo, mq_aperture, mq_pareti, mq_soffitto, mq_travi,
    mq_sigillatura_travi: mq_sig, mq_pareti_extra, mq_travi_esterne, extra,
    totale_mq: mq_pareti + mq_soffitto + mq_travi + mq_pareti_extra + mq_travi_esterne,
  };
}

export function calcolaTotali(stanze) {
  const t = { mq_pareti: 0, mq_soffitto: 0, mq_travi: 0, mq_sigillatura_travi: 0, mq_pareti_extra: 0, mq_travi_esterne: 0, totale_mq: 0, extra: {} };
  stanze.forEach((s) => {
    const c = calcolaStanza(s);
    t.mq_pareti += c.mq_pareti;
    t.mq_soffitto += c.mq_soffitto;
    t.mq_travi += c.mq_travi;
    t.mq_sigillatura_travi += c.mq_sigillatura_travi;
    t.mq_pareti_extra += c.mq_pareti_extra;
    t.mq_travi_esterne += c.mq_travi_esterne;
    t.totale_mq += c.totale_mq;
    Object.entries(c.extra).forEach(([k, v]) => {
      if (!t.extra[k]) t.extra[k] = { valore: 0, unita: v.unita, descrizione: v.descrizione };
      t.extra[k].valore += v.valore;
    });
  });
  return t;
}

export function facciataMqTotale(f) {
  const misure = (f.misure || []).reduce((acc, m) => acc + (parseFloat(m.mq) || 0), 0);
  const sottrai = (f.sottrazioni || []).reduce((acc, s) =>
    acc + (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * (s.tipo === 'porta_2_lati' ? 2 : 1), 0);
  const aggiungi = (f.porzioni || []).reduce((acc, p) =>
    acc + (p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0), 0);
  return misure - sottrai + aggiungi;
}