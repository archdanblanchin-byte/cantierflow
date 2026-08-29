import { arrotondaMinuti } from "./timbratureUtils";
import { base44 } from "@/api/base44Client";

// Calcola le ore lavorate per ogni cantiere a partire dalle timbrature di una giornata.
// Una sessione = ingresso -> (uscita | spostamento); le pause vengono sottratte.
export function calcolaOrePerCantiere(timbrature) {
  const tOrd = (timbrature || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

  const perCantiere = {};
  tOrd.forEach((t) => {
    if (!t.cantiere_id) return;
    if (!perCantiere[t.cantiere_id]) {
      perCantiere[t.cantiere_id] = {
        cantiere_id: t.cantiere_id,
        cantiere_nome: t.cantiere_nome,
        ingresso: null,
        timbri: [],
        ore_spostamento_ms: 0,
      };
    }
    perCantiere[t.cantiere_id].timbri.push(t);
    if (t.tipo_evento === "ingresso" && !perCantiere[t.cantiere_id].ingresso) {
      perCantiere[t.cantiere_id].ingresso = t;
    }
  });

  // Spostamenti: per ogni spostamento trova il prossimo ingresso (cantiere di arrivo)
  // e divide la durata a metà tra cantiere di partenza e cantiere di arrivo.
  // Con catena A→B→C il cantiere centrale accumula metà di entrambi gli spostamenti.
  tOrd.forEach((t, idx) => {
    if (t.tipo_evento !== "spostamento" || !t.cantiere_id) return;
    const nextIng = tOrd.slice(idx + 1).find(
      (x) => x.tipo_evento === "ingresso" && x.cantiere_id && x.cantiere_id !== t.cantiere_id
    );
    if (!nextIng) return;
    const durataMs = new Date(nextIng.data_ora) - new Date(t.data_ora);
    if (durataMs <= 0) return;
    const metaMs = durataMs / 2;
    if (perCantiere[t.cantiere_id]) perCantiere[t.cantiere_id].ore_spostamento_ms += metaMs;
    if (perCantiere[nextIng.cantiere_id]) perCantiere[nextIng.cantiere_id].ore_spostamento_ms += metaMs;
  });

  return Object.values(perCantiere).map((g) => {
    let oreMs = 0;
    const timbri = g.timbri;
    let i = 0;
    while (i < timbri.length) {
      if (timbri[i].tipo_evento === "ingresso") {
        const start = new Date(timbri[i].data_ora);
        let endIdx = -1;
        for (let j = i + 1; j < timbri.length; j++) {
          if (timbri[j].tipo_evento === "uscita" || timbri[j].tipo_evento === "spostamento") {
            endIdx = j;
            break;
          }
        }
        const end = endIdx >= 0 ? new Date(timbri[endIdx].data_ora) : new Date();
        let sessione = end - start;
        let pIn = null;
        const limit = endIdx >= 0 ? endIdx : timbri.length;
        for (let k = i + 1; k < limit; k++) {
          if (timbri[k].tipo_evento === "pausa_inizio") pIn = new Date(timbri[k].data_ora);
          else if (timbri[k].tipo_evento === "pausa_fine" && pIn) {
            sessione -= new Date(timbri[k].data_ora) - pIn;
            pIn = null;
          }
        }
        oreMs += sessione;
        i = endIdx >= 0 ? endIdx + 1 : timbri.length;
      } else {
        i++;
      }
    }
    return {
      cantiere_id: g.cantiere_id,
      cantiere_nome: g.cantiere_nome,
      ingresso: g.ingresso,
      ore: arrotondaMinuti(oreMs),
      ore_spostamento: arrotondaMinuti(g.ore_spostamento_ms || 0),
    };
  });
}

function stessaGiornata(iso, giorno) {
  if (!iso) return false;
  return new Date(iso).toDateString() === giorno.toDateString();
}

// Genera una bozza di rapportino per ogni cantiere della giornata con ore > 0.
// Salta i cantieri per cui esiste già un rapportino dello stesso utente nella stessa giornata.
export async function generaRapportiniDaGiornata({ user, giorno, timbrature, rapportiniEsistenti }) {
  const orePerCantiere = calcolaOrePerCantiere(timbrature).filter((c) => c.ore > 0);
  const creati = [];
  for (const c of orePerCantiere) {
    const esiste = (rapportiniEsistenti || []).some(
      (r) =>
        r.cantiere_id === c.cantiere_id &&
        r.user_email === user.email &&
        stessaGiornata(r.data, giorno)
    );
    if (esiste) continue;
    const draft = await base44.entities.Rapportino.create({
      data: c.ingresso?.data_ora || new Date().toISOString(),
      cantiere_id: c.cantiere_id,
      cantiere_nome: c.cantiere_nome,
      user_email: user.email,
      foto: [],
      foto_annotate: [],
      note_generali: "",
      ore_totali_squadra: c.ore,
      ore_spostamento: c.ore_spostamento || 0,
      collaboratori: [],
      has_lavorazioni_extra: false,
      lavorazioni_extra: [],
      lavorazioni_normali: [],
      materiali: [],
      stato: "bozza",
    });
    creati.push(draft);
  }
  return creati;
}

// Sincronizza l'ore_totali_squadra del rapportino di un cantiere/giorno/utente
// con le ore reali calcolate dalle timbrature. Se non esiste rapportino, non fa nulla.
export async function syncRapportinoOreDaTimbratura({ user_email, cantiere_id, giorno }) {
  if (!user_email || !cantiere_id || !giorno) return null;
  const g = new Date(giorno);
  if (isNaN(g.getTime())) return null;
  const inizio = new Date(g); inizio.setHours(0, 0, 0, 0);
  const fine = new Date(g); fine.setHours(23, 59, 59, 999);

  const timb = await base44.entities.Timbratura.filter({
    user_email,
    cantiere_id,
    data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
  });
  const calc = calcolaOrePerCantiere(timb).find((c) => c.cantiere_id === cantiere_id);
  const ore = calc?.ore ?? 0;
  const ore_spostamento = calc?.ore_spostamento ?? 0;

  const rapportini = await base44.entities.Rapportino.filter({ user_email, cantiere_id });
  const r = rapportini.find((rr) => rr.data && new Date(rr.data).toDateString() === g.toDateString());
  if (!r) return null;
  const oreChanged = Math.abs((r.ore_totali_squadra ?? 0) - ore) >= 0.001;
  const spoChanged = Math.abs((r.ore_spostamento ?? 0) - ore_spostamento) >= 0.001;
  if (!oreChanged && !spoChanged) return r;
  await base44.entities.Rapportino.update(r.id, { ore_totali_squadra: ore, ore_spostamento });
  return { ...r, ore_totali_squadra: ore, ore_spostamento };
}