import { addDays, format, parseISO, isWeekend } from "date-fns";

export const STATI = {
  pianificato: { label: "Pianificato", cls: "bg-slate-100 text-slate-700" },
  in_corso: { label: "In corso", cls: "bg-blue-100 text-blue-700" },
  completato: { label: "Completato", cls: "bg-green-100 text-green-700" },
  sospeso: { label: "Sospeso", cls: "bg-amber-100 text-amber-700" },
};

export const PALETTE = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#9333ea", "#0891b2", "#db2777", "#65a30d", "#ea580c", "#475569"];
export const COLORE_DEFAULT = "#64748b";

export const fmt = (d) => format(d, "yyyy-MM-dd");

export function inPausa(c, key) {
  return (c.pause || []).some((p) => p.inizio && p.fine && key >= p.inizio && key <= p.fine);
}

// giorni lavorativi necessari = ceil(ore totali / (persone x ore giornaliere))
export function giorniNecessari(c) {
  const cap = (Number(c.persone) || 0) * (Number(c.ore_giornaliere) || 0);
  const ore = Number(c.ore_totali) || 0;
  if (cap <= 0 || ore <= 0) return 0;
  return Math.ceil(ore / cap);
}

// Piano del cantiere: giorni lavorati (esclusi weekend e pause), data fine, giorni di pioggia e step.
export function calcolaPiano(c) {
  const vuoto = { necessari: 0, fine: null, giorni: [], pioggia: new Set(), steps: [] };
  if (!c.data_inizio) return vuoto;
  const necessari = giorniNecessari(c);
  const target = necessari + Math.max(0, Number(c.giorni_maltempo) || 0);
  if (target === 0) return { ...vuoto, fine: c.data_inizio };
  let d = parseISO(c.data_inizio);
  const giorni = [];
  const steps = [];
  let guard = 0;
  while (giorni.length < target && guard++ < 3000) {
    const key = fmt(d);
    const last = steps[steps.length - 1];
    if (inPausa(c, key)) {
      if (last && last.tipo === "pausa") last.a = key;
      else steps.push({ tipo: "pausa", da: key, a: key, giorni: 0 });
    } else if (!isWeekend(d)) {
      giorni.push(key);
      if (last && last.tipo === "lavoro") { last.a = key; last.giorni += 1; }
      else steps.push({ tipo: "lavoro", da: key, a: key, giorni: 1 });
    }
    d = addDays(d, 1);
  }
  const pioggia = new Set(giorni.slice(Math.max(0, giorni.length - (Number(c.giorni_pioggia) || 0))));
  return { necessari, fine: giorni[giorni.length - 1] || c.data_inizio, giorni, pioggia, steps };
}

export function conPiano(lista) {
  return lista.map((c) => ({ ...c, piano: calcolaPiano(c) }));
}

// Persone occupate per giorno (cantieri pianificati o in corso)
export function occupazione(conPianoLista) {
  const map = {};
  conPianoLista.forEach((c) => {
    if (c.stato === "completato" || c.stato === "sospeso") return;
    c.piano.giorni.forEach((k) => { map[k] = (map[k] || 0) + (Number(c.persone) || 0); });
  });
  return map;
}