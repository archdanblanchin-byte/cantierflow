import { format } from "date-fns";
import { it } from "date-fns/locale";
import { arrotondaQuarti } from "@/lib/timbratureUtils";

export function arrotondaOreQuarti(ore) {
  if (!ore || ore < 0) return 0;
  return Math.round(ore * 4) / 4;
}

/**
 * Spostamenti di una giornata (timbrature di tipo "spostamento").
 * Durata = dal timbro di spostamento al timbro successivo.
 */
export function calcolaSpostamenti(timbratureGiorno) {
  const tims = (timbratureGiorno || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const raw = tims.filter((t) => t.tipo_evento === "spostamento");
  return raw.map((s) => {
    const idx = tims.indexOf(s);
    const next = tims[idx + 1];
    let durata = 0;
    if (next) durata = arrotondaQuarti(new Date(next.data_ora) - new Date(s.data_ora));
    return {
      id: s.id,
      destinazione: s.cantiere_destinazione_nome,
      km: s.km_spostamento || 0,
      ora: new Date(s.data_ora),
      durata,
      mezzo_proprio: s.mezzo_proprio,
    };
  });
}

/**
 * Costruisce il dettaglio di una giornata per un collaboratore.
 *  - vociRapportini: [{ cantiere, ore, stato }] dai rapportini (sempre disponibile)
 *  - timbratureGiorno: timbrature del giorno (per spostamenti; solo se collaboratore con email)
 */
export function buildDettaglioGiorno(vociRapportini, timbratureGiorno) {
  const cantieriMap = {};
  (vociRapportini || []).forEach((v) => {
    const nome = v.cantiere || "—";
    if (!cantieriMap[nome]) cantieriMap[nome] = { nome, ore: 0, stato: null };
    cantieriMap[nome].ore += v.ore || 0;
    if (v.stato) cantieriMap[nome].stato = v.stato;
  });
  const cantieri = Object.values(cantieriMap).map((c) => ({
    ...c,
    ore: arrotondaOreQuarti(c.ore),
  }));

  const spostamenti = timbratureGiorno && timbratureGiorno.length
    ? calcolaSpostamenti(timbratureGiorno)
    : [];

  const oreCantieri = cantieri.reduce((s, c) => s + c.ore, 0);
  const oreSpostamenti = spostamenti.reduce((s, sp) => s + sp.durata, 0);

  return {
    cantieri,
    spostamenti,
    oreCantieri,
    oreSpostamenti,
    oreTotali: oreCantieri + oreSpostamenti,
  };
}

export function formatDataBreve(d) {
  return format(d, "EEE dd MMM yyyy", { locale: it });
}