import { format } from "date-fns";
import { it } from "date-fns/locale";
import { arrotondaQuarti } from "@/lib/timbratureUtils";

/**
 * Calcola la giornata di un collaboratore a partire dalle timbrature del giorno.
 * Restituisce:
 *  - cantieri: [{ id, nome, ore, completo, ingresso, uscita }]
 *  - spostamenti: [{ id, destinazione, km, ora, durata }]
 *  - oreCantieri, oreSpostamenti, oreTotali
 */
export function calcolaGiornata(timbratureGiorno) {
  const tims = (timbratureGiorno || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

  const cantieriMap = {};
  const spostamentiRaw = [];
  tims.forEach((t) => {
    if (t.tipo_evento === "spostamento") {
      spostamentiRaw.push(t);
    } else if (t.cantiere_id) {
      if (!cantieriMap[t.cantiere_id]) cantieriMap[t.cantiere_id] = { nome: t.cantiere_nome, timbri: [] };
      cantieriMap[t.cantiere_id].timbri.push(t);
    }
  });

  const cantieri = Object.entries(cantieriMap).map(([id, g]) => {
    const tIng = g.timbri.find((t) => t.tipo_evento === "ingresso");
    const tUsc = g.timbri.find((t) => t.tipo_evento === "uscita");
    let ore = 0;
    if (tIng && tUsc) {
      let totale = new Date(tUsc.data_ora) - new Date(tIng.data_ora);
      const pi = g.timbri.filter((t) => t.tipo_evento === "pausa_inizio").sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
      const pf = g.timbri.filter((t) => t.tipo_evento === "pausa_fine").sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
      const n = Math.min(pi.length, pf.length);
      for (let i = 0; i < n; i++) totale -= new Date(pf[i].data_ora) - new Date(pi[i].data_ora);
      ore = arrotondaQuarti(totale);
    }
    return { id, nome: g.nome, ore, completo: !!tUsc, ingresso: tIng, uscita: tUsc };
  });

  // Durata spostamento: dal timbro di spostamento al timbro successivo
  const spostamenti = spostamentiRaw.map((s) => {
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