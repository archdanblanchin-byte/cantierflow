import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import { arrotondaOre, classificaTrasfertaSplit } from "@/lib/timbratureUtils";
import { calcolaSpostamenti, calcolaTrasfertaGiorno } from "@/lib/oreLavoratoriUtils";

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

const cellaVuota = () => ({ oreCantieri: 0, oreSpost: 0, cantieri: [], perCantiere: {}, luoghi: [], nota: "", permesso: null });

/**
 * Foglio riepilogativo del mese: una riga per dipendente, una colonna per giorno.
 * Ogni cella ha ore lavorate, cantiere, trasferta, spostamenti e il dettaglio
 * delle ore per singolo cantiere (usato per i riepiloghi di cantiere).
 */
export function buildRiepilogoMensile({
  collaboratori = [],
  rapportini = [],
  timbrature = [],
  trasferte = [],
  cantieri = [],
  config = null,
  me = null,
  permessi = {},
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
        const ore = c.ore_lavorate || 0;
        cella.oreCantieri += ore;
        if (r.cantiere_nome) {
          if (!cella.cantieri.includes(r.cantiere_nome)) cella.cantieri.push(r.cantiere_nome);
          cella.perCantiere[r.cantiere_nome] = (cella.perCantiere[r.cantiere_nome] || 0) + ore;
        }
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

    // 4) permessi e ferie letti in automatico dal calendario Google collegato
    const nomeCollabNorm = norm(collab.nome);
    const primoNome = nomeCollabNorm.split(" ")[0];
    giorni.forEach((d) => {
      const k = chiave(d);
      const lista = permessi[k];
      if (!lista || !lista.length) return;
      const trovato = lista.find((p) => {
        if (p.tipo !== "ferie" && p.tipo !== "permesso") return false;
        const pn = norm(p.nome);
        if (!pn) return false;
        return pn === primoNome || pn === nomeCollabNorm || nomeCollabNorm.startsWith(pn + " ");
      });
      if (trovato) get(k).permesso = trovato.tipo;
    });

    // 5) sintesi della giornata
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

  return { giorni, righe, totaliGiorno };
}

// Elenco dei cantieri su cui nel mese sono state registrate ore lavorate
export function cantieriDelMese(riepilogo) {
  const set = new Set();
  riepilogo.righe.forEach((r) =>
    Object.values(r.celle).forEach((c) =>
      Object.entries(c.perCantiere || {}).forEach(([nome, ore]) => {
        if (ore > 0) set.add(nome);
      })
    )
  );
  return [...set].sort((a, b) => a.localeCompare(b, "it"));
}

/**
 * Riepilogo di un singolo cantiere: le persone che ci hanno lavorato nel mese,
 * le ore di ognuna giorno per giorno e il totale per persona.
 */
export function estraiRiepilogoCantiere(riepilogo, nomeCantiere) {
  const righe = riepilogo.righe
    .map((r) => {
      const celle = {};
      let totOre = 0;
      let giorniLavorati = 0;
      Object.entries(r.celle).forEach(([k, c]) => {
        const ore = c.perCantiere?.[nomeCantiere] || 0;
        if (ore > 0) {
          celle[k] = { ore: arrotondaOre(ore) };
          totOre += ore;
          giorniLavorati++;
        }
      });
      return {
        collaboratore: r.collaboratore,
        celle,
        totOre: arrotondaOre(totOre),
        giorniLavorati,
      };
    })
    .filter((r) => r.totOre > 0);

  const totaliGiorno = {};
  riepilogo.giorni.forEach((d) => {
    const k = format(d, "yyyy-MM-dd");
    totaliGiorno[k] = arrotondaOre(righe.reduce((s, r) => s + (r.celle[k]?.ore || 0), 0));
  });

  return {
    cantiereNome: nomeCantiere,
    giorni: riepilogo.giorni,
    righe,
    totaliGiorno,
    totale: arrotondaOre(righe.reduce((s, r) => s + r.totOre, 0)),
  };
}