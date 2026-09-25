// ─── Calcolo delle ore di squadra a partire dalle timbrature ──────────────────
// Fonte unica usata dalla funzione sync_rapportini_giornata: le timbrature
// determinano presenze, pause, spostamenti e ore di ogni operatore.

const ARROTONDAMENTO_MIN = 5;
const CAPANNONE = { lat: 45.8533, lon: 12.9997 };
const RAGGIO_CAPANNONE_M = 250;

const toMs = (iso) => new Date(iso).getTime();
const sortTimbri = (timbrature) =>
  (timbrature || []).slice().sort((a, b) => toMs(a.data_ora) - toMs(b.data_ora));
const minutiDa = (ms) => Math.round((ms || 0) / 60000);

const arrotondaMinuti = (ms, stepMin = ARROTONDAMENTO_MIN) => {
  if (!ms || ms < 0) return 0;
  const roundedMin = Math.round(ms / 60000 / stepMin) * stepMin;
  return Math.round((roundedMin / 60) * 1000) / 1000;
};

export function fmtOre(ore) {
  if (!ore || ore <= 0) return "0h";
  const h = Math.floor(ore);
  const min = Math.round((ore - h) * 60);
  return min === 0 ? `${h}h` : `${h}h ${min}min`;
}

// Ora locale italiana: il server gira in UTC, le ore vanno mostrate a Roma.
const oraRome = (iso) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

const distanzaM = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Un timbro è "in sede" se l'operatore ha confermato il capannone o se il GPS
// cade dentro il raggio della sede: in sede non si genera trasferta.
const timbroInSede = (t, capannone) => {
  if (!t) return false;
  if (t.confermato_capannone) return true;
  const c = capannone || CAPANNONE;
  if (t.latitudine == null || t.longitudine == null) return false;
  return distanzaM(t.latitudine, t.longitudine, c.lat, c.lon) <= RAGGIO_CAPANNONE_M;
};

const minutiDelGiorno = (hhmmStr) => {
  const [h, m] = String(hhmmStr).split(":").map(Number);
  return h * 60 + m;
};

// Scarto tra l'ora italiana e l'UTC (in ms) per una data.
const scartoRomaMs = (date) => {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = dtf.formatToParts(date).reduce((a, x) => ((a[x.type] = x.value), a), {});
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUTC - date.getTime();
};

// Fine della giornata italiana in cui è iniziata la sessione. Un turno senza
// uscita timbrata non può superare la mezzanotte: altrimenti le ore continuano
// a crescere fino a oggi (un timbro dimenticato arrivava a 27 ore).
const fineGiornata = (startMs) => {
  const giorno = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(startMs));
  const [y, m, d] = giorno.split("-").map(Number);
  const mezzanotte = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  return mezzanotte.getTime() - scartoRomaMs(mezzanotte);
};

// ─── Ore per cantiere + spostamenti automatici ────────────────────────────────
// Una sessione si apre con "ingresso" e si chiude con "uscita" (o con l'ingresso
// successivo, se la chiusura è stata dimenticata). Il tempo tra la chiusura di un
// cantiere e l'apertura del successivo è uno spostamento.
export function calcolaOrePerCantiere(timbrature) {
  const tOrd = sortTimbri(timbrature);
  const perCantiere = {};
  const ensure = (id, nome) => {
    if (!perCantiere[id]) {
      perCantiere[id] = { cantiere_id: id, cantiere_nome: nome, ingresso: null, ore_ms: 0, spostamento_ms: 0 };
    }
    return perCantiere[id];
  };

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
      chiudi(email, toMs(t.data_ora));
      aperte.set(email, {
        cantiere_id: t.cantiere_id,
        cantiere_nome: t.cantiere_nome,
        start: toMs(t.data_ora),
        pausaMs: 0,
        pausaIn: null,
      });
      if (c && !c.ingresso) c.ingresso = t;
    } else if (t.tipo_evento === "pausa_inizio") {
      const open = aperte.get(email);
      if (open) open.pausaIn = toMs(t.data_ora);
    } else if (t.tipo_evento === "pausa_fine") {
      const open = aperte.get(email);
      if (open && open.pausaIn) {
        open.pausaMs += toMs(t.data_ora) - open.pausaIn;
        open.pausaIn = null;
      }
    } else if (t.tipo_evento === "uscita" || t.tipo_evento === "spostamento") {
      chiudi(email, toMs(t.data_ora));
    }
  });
  const adesso = Date.now();
  [...aperte.keys()].forEach((email) => chiudi(email, adesso));

  // Spostamenti divisi a metà tra cantiere di partenza e di arrivo.
  tOrd.forEach((t, idx) => {
    if (t.tipo_evento !== "uscita" && t.tipo_evento !== "spostamento") return;
    if (!t.cantiere_id) return;
    const next = tOrd
      .slice(idx + 1)
      .find((x) => emailDi(x) === emailDi(t) && (x.tipo_evento === "ingresso" || x.tipo_evento === "uscita"));
    if (!next || next.tipo_evento !== "ingresso" || !next.cantiere_id) return;
    const ms = toMs(next.data_ora) - toMs(t.data_ora);
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

// ─── Squadra della giornata (righe del rapportino) ────────────────────────────
// Una persona timbra per sé; il sistema ricostruisce per ognuna ingresso,
// uscita, pausa, spostamenti, ore lavorate ed eventuali anomalie da verificare.
export function calcolaSquadra(timbrature, collaboratori = [], capannone = null) {
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
      u.sessions.push({ cantiere_id: t.cantiere_id, start: toMs(t.data_ora), end: null, pausaMs: 0, pausaIn: null });
      if (t.cantiere_id && !u.cantieri.includes(t.cantiere_id)) u.cantieri.push(t.cantiere_id);
    } else if (t.tipo_evento === "pausa_inizio") {
      const s = u.sessions[u.sessions.length - 1];
      if (s) s.pausaIn = toMs(t.data_ora);
    } else if (t.tipo_evento === "pausa_fine") {
      const s = u.sessions[u.sessions.length - 1];
      if (s && s.pausaIn) {
        const d = toMs(t.data_ora) - s.pausaIn;
        s.pausaMs += d;
        u.pausaMs += d;
        s.pausaIn = null;
      }
    } else if (t.tipo_evento === "uscita" || t.tipo_evento === "spostamento") {
      const s = u.sessions[u.sessions.length - 1];
      if (s && !s.end) {
        s.end = toMs(t.data_ora);
        if (s.pausaIn) {
          const d = s.end - s.pausaIn;
          s.pausaMs += d;
          u.pausaMs += d;
          s.pausaIn = null;
        }
      }
      u.ultimo = t;
      const next = tOrd.slice(idx + 1).find((x) => x.user_email === t.user_email);
      if (next && next.tipo_evento === "ingresso") {
        const ms = toMs(next.data_ora) - toMs(t.data_ora);
        if (ms > 0) u.spostamentoMs += ms;
      }
    }
  });

  const rows = [...perUser.values()].map((u) => {
    const oreMs = u.sessions.reduce(
      (s, x) =>
        s +
        Math.max(
          0,
          Math.min(x.end || Date.now(), fineGiornata(x.start)) - x.start - (x.pausaMs || 0)
        ),
      0
    );
    const coll = collaboratori.find(
      (c) => c.user_email && c.user_email.toLowerCase() === u.user_email.toLowerCase()
    );
    const inCorso = u.sessions.some((s) => !s.end);
    return {
      collaboratore_id: coll ? coll.id : "",
      user_email: u.user_email,
      nome: (coll && coll.nome) || u.nome || u.user_email,
      ora_ingresso: u.primo ? oraRome(u.primo.data_ora) : "",
      ora_uscita: !inCorso && u.ultimo ? oraRome(u.ultimo.data_ora) : "",
      pausa_minuti: minutiDa(u.pausaMs),
      spostamento_minuti: minutiDa(u.spostamentoMs),
      ore_lavorate: arrotondaMinuti(oreMs),
      cantieri: u.cantieri,
      note_timbrature: [...new Set(u.note)].join(" · "),
      in_sede: !!(u.primo && timbroInSede(u.primo, capannone) && timbroInSede(u.ultimo, capannone)),
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