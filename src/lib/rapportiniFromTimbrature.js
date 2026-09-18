import { arrotondaMinuti, fmtOre, timbroInSede } from "./timbratureUtils";
import { base44 } from "@/api/base44Client";

const byDataOra = (a, b) => new Date(a.data_ora) - new Date(b.data_ora);
const sortTimbri = (timbrature) => (timbrature || []).slice().sort(byDataOra);
const minutiDa = (ms) => Math.round((ms || 0) / 60000);
const hhmm = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const minutiDelGiorno = (hhmmStr) => {
  const [h, m] = String(hhmmStr).split(":").map(Number);
  return h * 60 + m;
};

// ─── ORE PER CANTIERE + SPOSTAMENTI AUTOMATICI ────────────────────────────────
// Le timbrature sono la fonte unica. Una sessione si apre con "ingresso" e si
// chiude con "uscita" (o con l'ingresso successivo, se la chiusura è stata
// dimenticata). Il tempo che intercorre tra la chiusura di un cantiere e
// l'apertura del successivo è uno SPOSTAMENTO, ricavato automaticamente:
// l'operatore non deve timbrare nulla di aggiuntivo.
export function calcolaOrePerCantiere(timbrature) {
  const tOrd = sortTimbri(timbrature);
  const perCantiere = {};
  const ensure = (id, nome) => {
    if (!perCantiere[id]) {
      perCantiere[id] = {
        cantiere_id: id,
        cantiere_nome: nome,
        ingresso: null,
        ore_ms: 0,
        spostamento_ms: 0,
      };
    }
    return perCantiere[id];
  };

  // Le sessioni sono per persona: ognuno apre e chiude la propria.
  const emailDi = (t) => t.user_email || "anon";
  const aperte = new Map();
  const chiudi = (email, ts) => {
    const open = aperte.get(email);
    if (!open) return;
    const g = ensure(open.cantiere_id, open.cantiere_nome);
    let pausaMs = open.pausaMs;
    if (open.pausaIn) pausaMs += ts - open.pausaIn;
    const ms = ts - open.start - pausaMs;
    if (ms > 0) g.ore_ms += ms;
    aperte.delete(email);
  };

  tOrd.forEach((t) => {
    const email = emailDi(t);
    const c = t.cantiere_id ? ensure(t.cantiere_id, t.cantiere_nome) : null;
    if (t.tipo_evento === "ingresso") {
      // se manca la chiusura della sessione precedente, si chiude qui
      chiudi(email, new Date(t.data_ora));
      aperte.set(email, {
        cantiere_id: t.cantiere_id,
        cantiere_nome: t.cantiere_nome,
        start: new Date(t.data_ora),
        pausaMs: 0,
        pausaIn: null,
      });
      if (c && !c.ingresso) c.ingresso = t;
    } else if (t.tipo_evento === "pausa_inizio") {
      const open = aperte.get(email);
      if (open) open.pausaIn = new Date(t.data_ora);
    } else if (t.tipo_evento === "pausa_fine") {
      const open = aperte.get(email);
      if (open && open.pausaIn) {
        open.pausaMs += new Date(t.data_ora) - open.pausaIn;
        open.pausaIn = null;
      }
    } else if (t.tipo_evento === "uscita" || t.tipo_evento === "spostamento") {
      chiudi(email, new Date(t.data_ora));
    }
  });
  const adesso = new Date();
  [...aperte.keys()].forEach((email) => chiudi(email, adesso)); // sessioni in corso

  // Spostamenti: intervallo tra la chiusura di un cantiere e l'apertura
  // successiva della stessa persona. La durata viene divisa a metà tra cantiere
  // di partenza e di arrivo (con catena A→B→C il cantiere centrale accumula
  // metà di entrambi).
  tOrd.forEach((t, idx) => {
    if (t.tipo_evento !== "uscita" && t.tipo_evento !== "spostamento") return;
    if (!t.cantiere_id) return;
    const next = tOrd
      .slice(idx + 1)
      .find((x) => emailDi(x) === emailDi(t) && (x.tipo_evento === "ingresso" || x.tipo_evento === "uscita"));
    if (!next || next.tipo_evento !== "ingresso" || !next.cantiere_id) return;
    const ms = new Date(next.data_ora) - new Date(t.data_ora);
    if (ms <= 0) return;
    const meta = ms / 2;
    if (perCantiere[t.cantiere_id]) perCantiere[t.cantiere_id].spostamento_ms += meta;
    if (perCantiere[next.cantiere_id]) perCantiere[next.cantiere_id].spostamento_ms += meta;
  });

  return Object.values(perCantiere).map((g) => ({
    cantiere_id: g.cantiere_id,
    cantiere_nome: g.cantiere_nome,
    ingresso: g.ingresso,
    ore: arrotondaMinuti(g.ore_ms),
    ore_spostamento: arrotondaMinuti(g.spostamento_ms),
  }));
}

// Regola delle 8 ore: classifica gli spostamenti della giornata come
// 'lavorative' (se il totale lavorato esclusi gli spostamenti è < 8h)
// o 'trasferta' (se il totale lavorato raggiunge o supera le 8h).
export function classificaSpostamentiGiornata(timbrature) {
  const perCantiere = calcolaOrePerCantiere(timbrature);
  const totLavorazione = perCantiere.reduce((s, c) => s + (c.ore || 0), 0);
  const totSpostamento = perCantiere.reduce((s, c) => s + (c.ore_spostamento || 0), 0);
  const spostamentoTipo = totSpostamento > 0 && totLavorazione >= 8 ? "trasferta" : "lavorative";
  return {
    totLavorazione,
    totSpostamento,
    spostamentoTipo,
    totGiornaliero: totLavorazione + totSpostamento,
  };
}

// ─── SQUADRA DELLA GIORNATA (da timbrature a righe rapportino) ────────────────
// Una persona timbra per sé; il sistema ricostruisce per ognuna ingresso,
// uscita, pausa, spostamenti, ore lavorate ed eventuali anomalie da verificare.
export function buildSquadraDaTimbrature(timbrature, collaboratoriList = []) {
  const tOrd = sortTimbri(timbrature);
  const perUser = new Map();
  const getU = (email, nome) => {
    if (!perUser.has(email)) {
      perUser.set(email, {
        user_email: email,
        nome: nome || "",
        cantieri: [],
        sessions: [],
        pausaMs: 0,
        spostamentoMs: 0,
        primo: null,
        ultimo: null,
        note: [],
      });
    }
    const u = perUser.get(email);
    if (!u.nome && nome) u.nome = nome;
    return u;
  };

  tOrd.forEach((t, idx) => {
    if (!t.user_email) return;
    const u = getU(t.user_email, t.user_nome);
    if (t.nota) u.note.push(t.nota);
    if (t.tipo_evento === "ingresso") {
      if (!u.primo) u.primo = t;
      u.ultimo = t;
      u.sessions.push({
        cantiere_id: t.cantiere_id,
        start: new Date(t.data_ora),
        end: null,
        pausaMs: 0,
        pausaIn: null,
      });
      if (t.cantiere_id && !u.cantieri.includes(t.cantiere_id)) u.cantieri.push(t.cantiere_id);
    } else if (t.tipo_evento === "pausa_inizio") {
      const s = u.sessions[u.sessions.length - 1];
      if (s) s.pausaIn = new Date(t.data_ora);
    } else if (t.tipo_evento === "pausa_fine") {
      const s = u.sessions[u.sessions.length - 1];
      if (s && s.pausaIn) {
        const d = new Date(t.data_ora) - s.pausaIn;
        s.pausaMs += d;
        u.pausaMs += d;
        s.pausaIn = null;
      }
    } else if (t.tipo_evento === "uscita" || t.tipo_evento === "spostamento") {
      const s = u.sessions[u.sessions.length - 1];
      if (s && !s.end) {
        s.end = new Date(t.data_ora);
        if (s.pausaIn) {
          const d = s.end - s.pausaIn;
          s.pausaMs += d;
          u.pausaMs += d;
          s.pausaIn = null;
        }
      }
      u.ultimo = t;
      // spostamento verso l'ingresso successivo della stessa persona
      const next = tOrd.slice(idx + 1).find((x) => x.user_email === t.user_email);
      if (next && next.tipo_evento === "ingresso") {
        const ms = new Date(next.data_ora) - new Date(t.data_ora);
        if (ms > 0) u.spostamentoMs += ms;
      }
    }
  });

  const rows = [...perUser.values()].map((u) => {
    const oreMs = u.sessions.reduce(
      (s, x) => s + Math.max(0, (x.end || new Date()) - x.start - (x.pausaMs || 0)),
      0
    );
    const coll = collaboratoriList.find(
      (c) => c.user_email && c.user_email.toLowerCase() === u.user_email.toLowerCase()
    );
    const inCorso = u.sessions.some((s) => !s.end);
    return {
      collaboratore_id: coll?.id || "",
      user_email: u.user_email,
      nome: coll?.nome || u.nome || u.user_email,
      ora_ingresso: u.primo ? hhmm(u.primo.data_ora) : "",
      ora_uscita: !inCorso && u.ultimo ? hhmm(u.ultimo.data_ora) : "",
      pausa_minuti: minutiDa(u.pausaMs),
      spostamento_minuti: minutiDa(u.spostamentoMs),
      ore_lavorate: arrotondaMinuti(oreMs),
      cantieri: u.cantieri,
      note_timbrature: [...new Set(u.note)].join(" · "),
      // Ha timbrato dalla sede (capannone di Rivignano): nessuna trasferta,
      // anche se il cantiere registrato è lontano.
      in_sede: !!(u.primo && timbroInSede(u.primo) && timbroInSede(u.ultimo)),
      anomalia: "",
    };
  });

  // Anomalie: differenze da verificare rispetto alla squadra del cantiere.
  const media = rows.length ? rows.reduce((s, r) => s + (r.ore_lavorate || 0), 0) / rows.length : 0;
  const primi = rows.map((r) => r.ora_ingresso).filter(Boolean).sort();
  const ultimi = rows.map((r) => r.ora_uscita).filter(Boolean).sort();
  const primoIngresso = primi[0];
  const ultimaUscita = ultimi[ultimi.length - 1];

  rows.forEach((r) => {
    const note = [];
    if (rows.length > 1 && Math.abs((r.ore_lavorate || 0) - media) >= 1) {
      note.push(`Ore diverse dalla media squadra (${fmtOre(r.ore_lavorate)} contro ${fmtOre(media)})`);
    }
    if (primoIngresso && r.ora_ingresso && minutiDelGiorno(r.ora_ingresso) - minutiDelGiorno(primoIngresso) >= 30) {
      note.push(`Ingresso posticipato di ${minutiDelGiorno(r.ora_ingresso) - minutiDelGiorno(primoIngresso)} min`);
    }
    if (ultimaUscita && r.ora_uscita && minutiDelGiorno(ultimaUscita) - minutiDelGiorno(r.ora_uscita) >= 30) {
      note.push(`Uscita anticipata di ${minutiDelGiorno(ultimaUscita) - minutiDelGiorno(r.ora_uscita)} min`);
    }
    if (r.cantieri.length > 1) note.push("Ha lavorato in più cantieri nella giornata");
    if (r.spostamento_minuti > 0) note.push(`Spostamento rilevato (${r.spostamento_minuti} min)`);
    if (rows.length > 1 && r.pausa_minuti === 0) note.push("Nessuna pausa pranzo registrata");
    r.anomalia = note.join(" · ");
  });

  return rows.sort(
    (a, b) => (a.ora_ingresso || "99").localeCompare(b.ora_ingresso || "99") || a.nome.localeCompare(b.nome, "it")
  );
}

function stessaGiornata(iso, giorno) {
  if (!iso) return false;
  return new Date(iso).toDateString() === giorno.toDateString();
}

// ─── UN SOLO RAPPORTINO PER CANTIERE E GIORNATA ───────────────────────────────
// Il rapportino è del cantiere, non della persona: chiunque abbia lavorato può
// generarlo, ma il primo che lo crea lo rende unico per quella giornata.
export async function getRapportinoCantiereGiorno(cantiere_id, giorno) {
  if (!cantiere_id || !giorno) return null;
  const g = new Date(giorno);
  if (isNaN(g.getTime())) return null;
  const list = await base44.entities.Rapportino.filter({ cantiere_id });
  return list.find((r) => r.data && stessaGiornata(r.data, g)) || null;
}

// Genera la bozza di rapportino per ogni cantiere in cui qualcuno ha lavorato
// nella giornata, riempiendo da solo la squadra con le ore di ciascuno.
// Salta i cantieri che hanno già un rapportino in quella data (di chiunque).
export async function generaRapportiniDaGiornata({
  user,
  giorno,
  timbrature,
  rapportiniEsistenti,
  collaboratoriList = [],
}) {
  const tOrd = sortTimbri(timbrature);
  const oreCantieri = calcolaOrePerCantiere(tOrd);
  const perCantiere = {};
  tOrd.forEach((t) => {
    if (!t.cantiere_id) return;
    if (!perCantiere[t.cantiere_id]) perCantiere[t.cantiere_id] = [];
    perCantiere[t.cantiere_id].push(t);
  });

  const creati = [];
  for (const [cid, timb] of Object.entries(perCantiere)) {
    // Il rapportino nasce al primo ingresso nel cantiere, anche con ore ancora a 0:
    // poi si aggiorna da solo a ogni timbratura della squadra.
    const calc = oreCantieri.find((c) => c.cantiere_id === cid);
    if (!calc) continue;
    const esiste = (rapportiniEsistenti || []).some(
      (r) => r.cantiere_id === cid && stessaGiornata(r.data, giorno)
    );
    if (esiste) continue;

    const squadra = buildSquadraDaTimbrature(timb, collaboratoriList);
    const draft = await base44.entities.Rapportino.create({
      data: calc.ingresso?.data_ora || new Date().toISOString(),
      cantiere_id: cid,
      cantiere_nome: calc.cantiere_nome,
      user_email: user.email,
      partecipanti_email: [...new Set([user.email, ...squadra.map((s) => s.user_email).filter(Boolean)])],
      foto: [],
      foto_annotate: [],
      note_generali: "",
      ore_totali_squadra: squadra.reduce((s, r) => s + (r.ore_lavorate || 0), 0),
      ore_spostamento: calc.ore_spostamento || 0,
      collaboratori: squadra,
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

// Sincronizza ore e squadra del rapportino di un cantiere/giorno con le
// timbrature reali (di tutti gli operatori del cantiere). Le note inserite dal
// capo cantiere su ogni persona vengono conservate.
export async function syncRapportinoOreDaTimbratura({ cantiere_id, giorno }) {
  if (!cantiere_id || !giorno) return null;
  const g = new Date(giorno);
  if (isNaN(g.getTime())) return null;
  const inizio = new Date(g); inizio.setHours(0, 0, 0, 0);
  const fine = new Date(g); fine.setHours(23, 59, 59, 999);

  const timb = await base44.entities.Timbratura.filter({
    cantiere_id,
    data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
  });
  const calc = calcolaOrePerCantiere(timb).find((c) => c.cantiere_id === cantiere_id);
  const squadra = buildSquadraDaTimbrature(timb, []);

  const rapportini = await base44.entities.Rapportino.filter({ cantiere_id });
  const r = rapportini.find((rr) => rr.data && stessaGiornata(rr.data, g));
  if (!r) return null;

  const notePrec = new Map(
    (r.collaboratori || []).map((c) => [c.user_email || c.collaboratore_id, c.note_imprevisti || ""])
  );
  const collaboratori = squadra.map((s) => ({
    ...s,
    note_imprevisti: notePrec.get(s.user_email || s.collaboratore_id) || "",
  }));
  const ore = collaboratori.reduce((s, c) => s + (c.ore_lavorate || 0), 0);
  const ore_spostamento = calc?.ore_spostamento ?? 0;

  await base44.entities.Rapportino.update(r.id, { ore_totali_squadra: ore, ore_spostamento, collaboratori });
  return { ...r, ore_totali_squadra: ore, ore_spostamento, collaboratori };
}

// Minuti della giornata non coperti né da lavoro né da pausa registrata:
// è il tempo che l'operatore deve spiegare alla chiusura del cantiere
// (spostamenti tra cantieri, fermate, commissioni).
export function minutiScopertiGiornata(timbrature) {
  const tOrd = sortTimbri(timbrature);
  const ingressi = tOrd.filter((t) => t.tipo_evento === "ingresso");
  const uscite = tOrd.filter((t) => t.tipo_evento === "uscita");
  if (!ingressi.length || !uscite.length) return 0;

  const intervallo = new Date(uscite[uscite.length - 1].data_ora) - new Date(ingressi[0].data_ora);
  const aperte = new Map();
  let lavorato = 0;
  let pausa = 0;

  tOrd.forEach((t) => {
    const e = t.user_email || "anon";
    if (t.tipo_evento === "ingresso") {
      aperte.set(e, { start: new Date(t.data_ora), pausaMs: 0, pausaIn: null });
    } else if (t.tipo_evento === "pausa_inizio") {
      const s = aperte.get(e);
      if (s) s.pausaIn = new Date(t.data_ora);
    } else if (t.tipo_evento === "pausa_fine") {
      const s = aperte.get(e);
      if (s && s.pausaIn) { s.pausaMs += new Date(t.data_ora) - s.pausaIn; s.pausaIn = null; }
    } else if (t.tipo_evento === "uscita" || t.tipo_evento === "spostamento") {
      const s = aperte.get(e);
      if (s) {
        if (s.pausaIn) { s.pausaMs += new Date(t.data_ora) - s.pausaIn; s.pausaIn = null; }
        lavorato += Math.max(0, new Date(t.data_ora) - s.start - s.pausaMs);
        pausa += s.pausaMs;
        aperte.delete(e);
      }
    }
  });

  return Math.max(0, Math.round((intervallo - lavorato - pausa) / 60000));
}