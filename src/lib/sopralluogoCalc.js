// Calcolo delle misure del modulo Sopralluogo.
// Tutte le formule sono qui, in un solo punto, e vengono mostrate all'utente.

export const num = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const fmt = (n, dec = 2) =>
  new Intl.NumberFormat("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(num(n));

const somma = (righe) => (righe || []).reduce((s, r) => s + num(r.quantita === undefined || r.quantita === "" ? 1 : r.quantita) * num(r.valore), 0);

export const MODALITA = [
  { key: "semplice", label: "Misura semplice" },
  { key: "base_altezza", label: "Base × altezza" },
  { key: "stanza", label: "Stanza" },
  { key: "lls", label: "Lunghezza × larghezza × sviluppo" },
  { key: "mq_sviluppo", label: "m² × sviluppo" },
];

export const conSottrazioni = (modalita) => modalita !== "semplice" && modalita !== "lls";

// Restituisce { valore, formula, travi, sigillature } per una singola misura.
export function calcolaMisura(modalita, m = {}) {
  const travi = num(m.travi_ml);
  const sigillature = num(m.sigillature_ml);
  const sott = somma(m.sottrazioni);
  const agg = somma(m.aggiunte);
  const rettifica = (lordo, f) => {
    const valore = Math.max(0, lordo - sott + agg);
    const extra = sott || agg ? ` − ${fmt(sott)} + ${fmt(agg)}` : "";
    return { valore, formula: `${f}${extra} = ${fmt(valore)}`, travi, sigillature };
  };

  if (modalita === "base_altezza") {
    return rettifica(num(m.base) * num(m.altezza), `${fmt(m.base)} × ${fmt(m.altezza)}`);
  }
  if (modalita === "stanza") {
    const L = num(m.lunghezza);
    const W = num(m.larghezza);
    const H = num(m.altezza);
    const pareti = 2 * (L + W) * H;
    const soffitto = m.soffitto ? L * W : 0;
    const f = `pareti 2 × (${fmt(L)} + ${fmt(W)}) × ${fmt(H)} = ${fmt(pareti)}${m.soffitto ? ` + soffitto ${fmt(L)} × ${fmt(W)} = ${fmt(soffitto)}` : ""}`;
    return rettifica(pareti + soffitto, f);
  }
  if (modalita === "lls") {
    const valore = num(m.lunghezza) * num(m.larghezza) * num(m.sviluppo);
    return { valore, formula: `${fmt(m.lunghezza)} × ${fmt(m.larghezza)} × ${fmt(m.sviluppo)} = ${fmt(valore)}`, travi, sigillature };
  }
  if (modalita === "mq_sviluppo") {
    return rettifica(num(m.mq) * num(m.sviluppo), `${fmt(m.mq)} × ${fmt(m.sviluppo)}`);
  }
  const valore = num(m.valore);
  return { valore, formula: `${fmt(valore)}`, travi, sigillature };
}

export function totalePorzione(porzione) {
  let totale = 0;
  let riferimento = 0;
  let travi = 0;
  let sigillature = 0;
  (porzione.misure || []).forEach((m) => {
    const r = calcolaMisura(porzione.modalita, m);
    if (m.riferimento) {
      riferimento += r.valore;
    } else {
      totale += r.valore;
      travi += r.travi;
      sigillature += r.sigillature;
    }
  });
  return { totale, riferimento, travi, sigillature };
}

const aggiungi = (obj, chiave, v) => {
  if (!v) return;
  obj[chiave] = (obj[chiave] || 0) + v;
};

// Totali per lavorazione, ambito, unità e complessivo. Le misure di riferimento restano fuori.
export function totaliRilievi(rilievi = []) {
  const complessivo = {};
  const riferimento = {};
  const perAmbito = { interno: {}, esterno: {} };
  let travi = 0;
  let sigillature = 0;
  const lavorazioni = rilievi.map((r) => {
    const totali = {};
    const porzioni = (r.porzioni || []).map((p) => {
      const t = totalePorzione(p);
      const unita = p.unita || "m²";
      aggiungi(totali, unita, t.totale);
      aggiungi(complessivo, unita, t.totale);
      aggiungi(riferimento, unita, t.riferimento);
      aggiungi(perAmbito[r.ambito === "esterno" ? "esterno" : "interno"], unita, t.totale);
      travi += t.travi;
      sigillature += t.sigillature;
      return { id: p.id, nome: p.nome, unita, ...t };
    });
    return { id: r.id, nome: r.lavorazione, ambito: r.ambito, totali, porzioni };
  });
  return { lavorazioni, complessivo, riferimento, perAmbito, travi, sigillature };
}

export const fmtTotali = (obj) => {
  const voci = Object.entries(obj || {}).filter(([, v]) => v);
  return voci.length ? voci.map(([u, v]) => `${fmt(v)} ${u}`).join(" · ") : "—";
};