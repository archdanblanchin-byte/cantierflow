import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { arrotondaOre, classificaTrasfertaSplit } from "@/lib/timbratureUtils";
import { calcolaSpostamenti, calcolaTrasfertaGiorno } from "@/lib/oreLavoratoriUtils";

// Palette dei cantieri: un colore per cantiere, leggibile anche in dark mode.
export const COLORI_CANTIERE = [
  { cella: "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-100 dark:border-blue-800", pallino: "bg-blue-500" },
  { cella: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-800", pallino: "bg-emerald-500" },
  { cella: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-100 dark:border-amber-800", pallino: "bg-amber-500" },
  { cella: "bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-950/60 dark:text-violet-100 dark:border-violet-800", pallino: "bg-violet-500" },
  { cella: "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-100 dark:border-rose-800", pallino: "bg-rose-500" },
  { cella: "bg-cyan-100 text-cyan-900 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-100 dark:border-cyan-800", pallino: "bg-cyan-500" },
  { cella: "bg-lime-100 text-lime-900 border-lime-200 dark:bg-lime-950/60 dark:text-lime-100 dark:border-lime-800", pallino: "bg-lime-500" },
  { cella: "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/60 dark:text-orange-100 dark:border-orange-800", pallino: "bg-orange-500" },
  { cella: "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950/60 dark:text-teal-100 dark:border-teal-800", pallino: "bg-teal-500" },
  { cella: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-100 dark:border-fuchsia-800", pallino: "bg-fuchsia-500" },
  { cella: "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-100 dark:border-indigo-800", pallino: "bg-indigo-500" },
  { cella: "bg-pink-100 text-pink-900 border-pink-200 dark:bg-pink-950/60 dark:text-pink-100 dark:border-pink-800", pallino: "bg-pink-500" },
];

// Colore stabile per cantiere (ordine alfabetico, così non cambia tra una visita e l'altra)
export function creaMappaColori(nomiCantieri) {
  const mappa = {};
  [...new Set((nomiCantieri || []).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "it"))
    .forEach((nome, i) => {
      mappa[nome] = COLORI_CANTIERE[i % COLORI_CANTIERE.length];
    });
  return mappa;
}

// Ore in forma compatta per le celle del foglio: "8h", "7h45"
export function fmtOreBreve(ore) {
  if (!ore || ore <= 0) return "";
  const h = Math.floor(ore);
  const min = Math.round((ore - h) * 60);
  return min === 0 ? `${h}h` : `${h}h${String(min).padStart(2, "0")}`;
}

const norm = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");

// Stesso abbinamento usato nel calendario: email del collaboratore, nome
// denormalizzato, oppure "sono io" quando il collaboratore non ha email.
function creaMatcher(collab, me) {
  const nomeCollab = norm(collab.nome);
  const email = collab.user_email || null;
  return (record) => {
    if (email && record.user_email === email) return true;
    if (record.user_nome && nomeCollab && norm(record.user_nome) === nomeCollab) return true;
    if (me?.email && record.user_email === me.email && me.full_name && nomeCollab && email !== me.email) {
      const f = norm(me.full_name);
      if (f === nomeCollab || (nomeCollab.length >= 3 && (f.includes(nomeCollab) || nomeCollab.includes(f)))) return true;
    }
    return false;
  };
}

const cellaVuota = () => ({ oreCantieri: 0, oreSpost: 0, cantieri: [], luoghi: [], nota: "" });

/**
 * Foglio riepilogativo del mese: una riga per dipendente, una colonna per giorno.
 * Ogni cella ha ore lavorate, cantiere (con colore), trasferta e spostamenti.
 */
export function buildRiepilogoMensile({
  collaboratori = [],
  rapportini = [],
  timbrature = [],
  trasferte = [],
  cantieri = [],
  config = null,
  me = null,
  mese,
}) {
  const primo = startOfMonth(mese);
  const ultimo = endOfMonth(mese);
  const giorni = eachDayOfInterval({ start: primo, end: ultimo });
  const chiave = (d) => format(d, "yyyy-MM-dd");

  const righe = collaboratori.map((collab) => {
    const match = creaMatcher(collab, me);
    const celle = {};
    const get = (k) => (celle[k] = celle[k] || cellaVuota());

    // 1) ore lavorate dai rapportini del cantiere
    rapportini.forEach((r) => {
      const d = new Date(r.data);
      if (d < primo || d > ultimo) return;
      const k = chiave(d);
      (r.collaboratori || []).forEach((c) => {
        const ok = c.collaboratore_id === collab.id || (c.nome && collab.nome && c.nome === collab.nome);
        if (!ok) return;
        const cella = get(k);
        cella.oreCantieri += c.ore_lavorate || 0;
        if (r.cantiere_nome && !cella.cantieri.includes(r.cantiere_nome)) cella.cantieri.push(r.cantiere_nome);
        if (c.note_imprevisti) cella.nota = c.note_imprevisti;
      });
    });

    // 2) timbrature: spostamenti, luoghi di lavoro e trasferta automatica
    timbrature.filter(match).forEach((t) => {
      const d = new Date(t.data_ora);
      if (d < primo || d > ultimo) return;
      const cella = get(chiave(d));
      (cella.tims = cella.tims || []).push(t);
      if (t.lavoro_altro_luogo && t.luogo_lavoro && !cella.luoghi.includes(t.luogo_lavoro)) {
        cella.luoghi.push(t.luogo_lavoro);
      }
      if (t.tipo_evento === "ingresso" && t.cantiere_nome && !cella.cantieri.includes(t.cantiere_nome)) {
        cella.cantieri.push(t.cantiere_nome);
      }
    });

    // 3) trasferte confermate dall'admin (hanno la precedenza sul calcolo automatico)
    trasferte.forEach((t) => {
      if (!t.data || !match(t)) return;
      const d = new Date(t.data + "T00:00:00");
      if (d < primo || d > ultimo) return;
      const cella = get(chiave(d));
      const split = classificaTrasfertaSplit(t.km_andata, t.km_ritorno, config);
      cella.trasferta = {
        ...split,
        tipo_trasferta: t.tipo_trasferta || split.tipo_trasferta,
        km_totali: t.km_totali ?? split.km_totali,
        confermata: true,
      };
    });

    // 4) sintesi della giornata
    const nomiCantieri = new Set();
    let totOre = 0;
    let totSpost = 0;
    let totKm = 0;
    let nTrasferte = 0;
    let giorniLavorati = 0;

    Object.values(celle).forEach((cella) => {
      const spost = cella.tims ? calcolaSpostamenti(cella.tims) : [];
      cella.oreSpost = arrotondaOre(spost.reduce((s, sp) => s + sp.durata, 0));
      cella.ore = arrotondaOre((cella.oreCantieri || 0) + cella.oreSpost);
      if (!cella.trasferta && cella.tims?.length) {
        cella.trasferta = calcolaTrasfertaGiorno(cella.tims, cantieri, config);
      }
      cella.fascia = cella.trasferta?.tipo_trasferta || null;
      cella.inSede = !!cella.trasferta?.nessuna_trasferta;
      cella.cantiere = cella.cantieri[0] || null;
      cella.cantieri.forEach((n) => nomiCantieri.add(n));

      totOre += cella.ore;
      totSpost += cella.oreSpost;
      if (cella.ore > 0) giorniLavorati++;
      if (cella.trasferta?.km_totali) {
        totKm += cella.trasferta.km_totali;
        nTrasferte++;
      }
      delete cella.tims;
    });

    return {
      collaboratore: collab,
      celle,
      cantieriUsati: [...nomiCantieri].sort((a, b) => a.localeCompare(b, "it")),
      totOre: arrotondaOre(totOre),
      totSpost: arrotondaOre(totSpost),
      totKm: Math.round(totKm * 10) / 10,
      nTrasferte,
      giorniLavorati,
    };
  });

  // Totale di squadra per ogni giorno (riga in fondo al foglio)
  const totaliGiorno = {};
  giorni.forEach((d) => {
    const k = chiave(d);
    totaliGiorno[k] = arrotondaOre(righe.reduce((s, r) => s + (r.celle[k]?.ore || 0), 0));
  });

  const tuttiCantieri = [...new Set(righe.flatMap((r) => r.cantieriUsati))];
  return { giorni, righe, totaliGiorno, colori: creaMappaColori(tuttiCantieri) };
}