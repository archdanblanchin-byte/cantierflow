import { arrotondaQuarti } from "./timbratureUtils";
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
      };
    }
    perCantiere[t.cantiere_id].timbri.push(t);
    if (t.tipo_evento === "ingresso" && !perCantiere[t.cantiere_id].ingresso) {
      perCantiere[t.cantiere_id].ingresso = t;
    }
  });

  return Object.values(perCantiere).map((g) => {
    let ore = 0;
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
        ore += arrotondaQuarti(sessione);
        i = endIdx >= 0 ? endIdx + 1 : timbri.length;
      } else {
        i++;
      }
    }
    return {
      cantiere_id: g.cantiere_id,
      cantiere_nome: g.cantiere_nome,
      ingresso: g.ingresso,
      ore,
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