// Rilevamento misure per lavorazioni: calcoli e liste di default.
// Le liste di default restano nel codice; le voci aggiunte dall'utente
// vengono salvate nelle anagrafiche (entità) e si sommano a queste.
//
// Struttura: lavorazione → porzioni[] → misure[]
// Una porzione ha UNA SOLA modalità attiva e contiene una o più misurazioni
// della STESSA modalità (pulsante "+"), che vengono sommate tra loro.
// Cambiando modalità i dati della modalità precedente vengono azzerati.

export const SVILUPPO_DEFAULT = 1.65;

export const MODALITA_RILIEVO = [
  { key: 'semplice', label: 'Misura semplice' },
  { key: 'bxa', label: 'Base × Altezza' },
  { key: 'stanza', label: 'Stanza' },
  { key: 'lxa_sviluppo', label: 'Lungh. × Largh. + Sviluppo' },
  { key: 'mq_sviluppo', label: 'm² + Sviluppo' }
];

export const LAVORAZIONI_DEFAULT = [
  'Pittura interna',
  'Pittura esterna',
  'Intonaco termodeumidificante',
  'Resina',
  'Verniciatura travi',
  'Cartongesso',
  'Tramezzi',
  'Contropareti',
  'Controsoffitti',
  'Quadrotti',
  'Cappotto',
  'Cappotto con aerogel',
  'Altre lavorazioni'
];

export const ELEMENTI_DEFAULT = ['Parete', 'Camino', 'Pilastro', 'Balcone', 'Cornicione', 'Altro'];

export const STANZE_DEFAULT = ['Soggiorno', 'Cucina', 'Bagno', 'Camera 1', 'Camera 2', 'Corridoio', 'Garage', 'Altro'];

export const UNITA_DEFAULT = ['m', 'm²', 'm³', 'pezzi', 'ml'];

export const SOTTRAZIONI_DEFAULT = ['Porta', 'Finestra', 'Camino', 'Vano', 'Pilastro', 'Altro'];

/** Campi che compongono una misura, per ciascuna modalità */
const CAMPI_MISURA = {
  semplice: ['quantita'],
  bxa: ['base', 'altezza'],
  stanza: ['lunghezza', 'larghezza', 'altezza', 'soffitto', 'sottrazioni', 'aggiunte'],
  lxa_sviluppo: ['lunghezza', 'larghezza', 'sviluppo'],
  mq_sviluppo: ['mq', 'sviluppo']
};

export function num(v) {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

export function fmtMq(n, dec = 2) {
  return num(n).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** Nuova misura vuota per la modalità scelta */
export function creaMisura(modalita = 'semplice', altezzaPrecedente = '') {
  switch (modalita) {
    case 'bxa':
      return { base: '', altezza: '' };
    case 'stanza':
      return { lunghezza: '', larghezza: '', altezza: altezzaPrecedente || '', soffitto: true, sottrazioni: [], aggiunte: [] };
    case 'lxa_sviluppo':
      return { lunghezza: '', larghezza: '', sviluppo: String(SVILUPPO_DEFAULT) };
    case 'mq_sviluppo':
      return { mq: '', sviluppo: String(SVILUPPO_DEFAULT) };
    default:
      return { quantita: '' };
  }
}

/** Misure di una porzione. Le porzioni salvate con il formato precedente hanno i
    campi della misura direttamente sulla porzione: vengono letti come misura unica. */
export function misurePorzione(p) {
  if (Array.isArray(p.misure) && p.misure.length > 0) return p.misure;
  const campi = CAMPI_MISURA[p.modalita] || CAMPI_MISURA.semplice;
  const misura = {};
  campi.forEach((k) => { misura[k] = p[k]; });
  return [misura];
}

/** Voce di porzione aggiunta o sottratta alla stanza (semplice oppure base × altezza) */
export function calcolaVoceStanza(v) {
  if (v.modalita === 'bxa') return num(v.base) * num(v.altezza);
  return num(v.quantita);
}

export const calcolaSottrazione = calcolaVoceStanza;

/** Nuova porzione aggiunta/sottratta da compilare (vuota) */
export function creaVoceStanza() {
  return { id: nuovoId(), modalita: 'bxa', descrizione: '', quantita: '', unita: 'm²', base: '', altezza: '' };
}

/** Superficie/quantità di una singola misura, in base alla modalità */
export function calcolaMisura(m, modalita) {
  switch (modalita) {
    case 'bxa':
      return num(m.base) * num(m.altezza);
    case 'stanza':
      return dettaglioStanza(m).totale;
    case 'lxa_sviluppo':
      return num(m.lunghezza) * num(m.larghezza) * (num(m.sviluppo) || SVILUPPO_DEFAULT);
    case 'mq_sviluppo':
      return num(m.mq) * (num(m.sviluppo) || SVILUPPO_DEFAULT);
    default:
      return num(m.quantita);
  }
}

/** Totale di una porzione: somma delle sue misure (mai tra modalità diverse) */
export function calcolaPorzione(p) {
  return misurePorzione(p).reduce((a, m) => a + calcolaMisura(m, p.modalita), 0);
}

/** Dettaglio della stanza: pareti, soffitto, porzioni sottratte e aggiunte, totale */
export function dettaglioStanza(m) {
  const l = num(m.lunghezza);
  const w = num(m.larghezza);
  const h = num(m.altezza);
  const pareti = (l + w) * 2 * h;
  const soffitto = m.soffitto !== false ? l * w : 0;
  const sottrazioni = (m.sottrazioni || []).reduce((a, s) => a + calcolaVoceStanza(s), 0);
  const aggiunte = (m.aggiunte || []).reduce((a, s) => a + calcolaVoceStanza(s), 0);
  return { pareti, soffitto, sottrazioni, aggiunte, totale: Math.max(0, pareti + soffitto - sottrazioni + aggiunte) };
}

export function unitaPorzione(p) {
  return p.modalita === 'semplice' ? (p.unita || 'm²') : 'm²';
}

/** Formula leggibile di una singola misura */
export function formulaMisura(m, modalita) {
  switch (modalita) {
    case 'bxa':
      return `${fmtMq(m.base)} × ${fmtMq(m.altezza)}`;
    case 'stanza': {
      const d = dettaglioStanza(m);
      const parti = [`pareti ${fmtMq(d.pareti, 1)}`];
      if (d.soffitto > 0) parti.push(`soffitto ${fmtMq(d.soffitto, 1)}`);
      if (d.sottrazioni > 0) parti.push(`− sottrazioni ${fmtMq(d.sottrazioni, 1)}`);
      if (d.aggiunte > 0) parti.push(`+ porzioni ${fmtMq(d.aggiunte, 1)}`);
      return parti.join('  ');
    }
    case 'lxa_sviluppo':
      return `${fmtMq(m.lunghezza)} × ${fmtMq(m.larghezza)} × ${fmtMq(m.sviluppo || SVILUPPO_DEFAULT)}`;
    case 'mq_sviluppo':
      return `${fmtMq(m.mq)} × ${fmtMq(m.sviluppo || SVILUPPO_DEFAULT)}`;
    default:
      return fmtMq(m.quantita);
  }
}

/** Formula leggibile dell'intera porzione (tutte le misure della stessa modalità) */
export function formulaPorzione(p) {
  return misurePorzione(p).map((m) => formulaMisura(m, p.modalita)).join('  +  ');
}

/** Nome della porzione (descrizione oppure nome della stanza) */
export function nomePorzione(p, indice = 0) {
  const nome = (p.descrizione || p.stanza || '').trim();
  return nome || `Porzione ${indice + 1}`;
}

/** Totale di una lavorazione raggruppato per unità di misura */
export function totaliLavorazione(lav) {
  const mappa = {};
  (lav.porzioni || []).forEach((p) => {
    const u = unitaPorzione(p);
    mappa[u] = (mappa[u] || 0) + calcolaPorzione(p);
  });
  return mappa;
}

/** Riepilogo di una lavorazione: righe per porzione + totali per unità */
export function riepilogoLavorazione(lav) {
  const righe = (lav.porzioni || []).map((p, i) => ({
    id: p.id,
    nome: nomePorzione(p, i),
    unita: unitaPorzione(p),
    valore: calcolaPorzione(p),
    misure: misurePorzione(p).length
  }));
  return { righe, totali: totaliLavorazione(lav) };
}

/** Totale complessivo di tutti i rilievi, raggruppato per unità */
export function totaliRilievi(rilievi) {
  const mappa = {};
  (rilievi || []).forEach((lav) => {
    Object.entries(totaliLavorazione(lav)).forEach(([u, v]) => {
      mappa[u] = (mappa[u] || 0) + v;
    });
  });
  return mappa;
}

export function nuovoId() {
  return Math.random().toString(36).slice(2, 9);
}

/** Crea una porzione vuota con la modalità scelta (una sola modalità attiva) */
export function creaPorzione(modalita = 'semplice', altezzaPrecedente = '') {
  return {
    id: nuovoId(),
    modalita,
    descrizione: '',
    stanza: '',
    unita: 'm²',
    misure: [creaMisura(modalita, altezzaPrecedente)]
  };
}

/** Crea una lavorazione vuota con la prima porzione */
export function creaLavorazione(nome, altezzaPrecedente = '') {
  return {
    id: nuovoId(),
    nome,
    porzioni: [creaPorzione('semplice', altezzaPrecedente)],
    note: '',
    foto: [],
    file: []
  };
}

/** Ultima altezza usata in una misura "stanza" (per precompilare le nuove) */
export function ultimaAltezzaStanze(rilievi) {
  let altezza = '';
  (rilievi || []).forEach((lav) => {
    (lav.porzioni || []).forEach((p) => {
      if (p.modalita !== 'stanza') return;
      misurePorzione(p).forEach((m) => {
        if (m.altezza !== '' && m.altezza !== undefined && m.altezza !== null) altezza = m.altezza;
      });
    });
  });
  return altezza;
}