import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Calendario PERMESSI/FERIE pubblico (group calendar)
const CALENDAR_ID =
  "31cd35a0b050ccef3dc636f01d485ed06d5ca5855370e35862881d848bad18bb@group.calendar.google.com";
const ICAL_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(
  CALENDAR_ID
)}/public/basic.ics`;

// Copia in memoria del calendario: evita di scaricare l'ICS a ogni chiamata
// (Google limita le richieste ripetute) e rende le risposte immediate.
const CACHE_TTL_MS = 15 * 60 * 1000;
let cacheIcs = { testo: null, istante: 0 };

async function leggiCalendario() {
  if (cacheIcs.testo && Date.now() - cacheIcs.istante < CACHE_TTL_MS) {
    return cacheIcs.testo;
  }
  const res = await fetch(ICAL_URL, { method: "GET" });
  if (!res.ok) {
    // Se Google non risponde uso l'ultima copia valida, se esiste
    if (cacheIcs.testo) return cacheIcs.testo;
    throw new Error(`Impossibile leggere il calendario (status ${res.status})`);
  }
  const testo = await res.text();
  cacheIcs = { testo, istante: Date.now() };
  return testo;
}

// Converte una propertyline ICS (es. "DTSTART;VALUE=DATE:20260729") in { date, isAllDay }
function parseDateValue(fullKey, val) {
  const isDate = fullKey.includes("VALUE=DATE");
  if (isDate) {
    return {
      date: `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`,
      isAllDay: true,
    };
  }
  const isUtc = val.endsWith("Z");
  if (isUtc) {
    const y = +val.slice(0, 4);
    const mo = +val.slice(4, 6) - 1;
    const d = +val.slice(6, 8);
    const h = +val.slice(9, 11);
    const mi = +val.slice(11, 13);
    const dt = new Date(Date.UTC(y, mo, d, h, mi));
    const str = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Rome",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dt);
    return { date: str, isAllDay: false };
  }
  // datetime locale (TZID presente) -> prendo la parte data
  return {
    date: `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`,
    isAllDay: false,
  };
}

function addOneDay(yyyy_mm_dd) {
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function parseIcal(ics) {
  // unfold (line folding con spazio iniziale)
  const lines = ics.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") {
      if (cur) events.push(cur);
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const keypart = line.slice(0, idx);
      const val = line.slice(idx + 1);
      const key = keypart.split(";")[0];
      if (key === "SUMMARY") cur.summary = val;
      else if (key === "DTSTART") {
        cur.dtstart = val;
        cur.dtstartFull = keypart;
      } else if (key === "DTEND") {
        cur.dtend = val;
        cur.dtendFull = keypart;
      }
    }
  }
  return events;
}

function covers(event, target) {
  if (!event.dtstart) return false;
  const s = parseDateValue(event.dtstartFull || "DTSTART", event.dtstart);
  let ev = event.dtend
    ? parseDateValue(event.dtendFull || "DTEND", event.dtend)
    : null;
  if (!ev) {
    ev = s.isAllDay
      ? { date: addOneDay(s.date), isAllDay: true }
      : { date: s.date, isAllDay: false };
  }
  if (s.isAllDay) {
    return s.date <= target && target < ev.date;
  }
  return s.date <= target && target <= ev.date;
}

// Orario di riferimento della giornata: serve per ricavare le ore quando nel
// titolo c'è solo un orario (es. «dalle 14.00» -> fino alle 18 -> 4 ore).
const ORE_INIZIO_GIORNATA = 8;
const ORE_FINE_GIORNATA = 18;
const MEZZA_GIORNATA = 4;

const toOre = (h, m) => h + (m ? m / 60 : 0);

// Riconosce il tipo di assenza anche nelle forme abbreviate
// ("ferie", "permesso", "perm.", "perm").
function tipoDalTitolo(t) {
  if (/\bferie\b/.test(t)) return "ferie";
  if (/\bpermessi\b|\bpermesso\b|\bperm\b/.test(t)) return "permesso";
  return "altro";
}

// Ricava le ore di permesso dal titolo:
// «3 ore» -> 3 · «16-18» -> 2 · «dalle 14.00» -> 4 · «fino alle 8.30» -> 0,5
// «pomeriggio» / «prima mattina» -> mezza giornata. Se non si ricava nulla -> null.
function oreDalTitolo(t) {
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:ore|ora|h)\b/);
  if (m) return Math.min(8, parseFloat(m[1].replace(",", ".")));

  m = t.match(/(\d{1,2})(?:[.,:](\d{2}))?\s*[-–]\s*(\d{1,2})(?:[.,:](\d{2}))?/);
  if (m) {
    const inizio = toOre(+m[1], m[2] ? +m[2] : 0);
    const fine = toOre(+m[3], m[4] ? +m[4] : 0);
    if (fine > inizio) return Math.min(8, fine - inizio);
  }

  m = t.match(/(?:dal|dalle|dalla)\s*(?:ore\s*)?(\d{1,2})(?:[.,:](\d{2}))?/);
  if (m) {
    const inizio = toOre(+m[1], m[2] ? +m[2] : 0);
    if (inizio >= ORE_INIZIO_GIORNATA && inizio < ORE_FINE_GIORNATA) {
      return ORE_FINE_GIORNATA - inizio;
    }
  }

  m = t.match(/(?:fino|fin)\s*(?:a\s*)?(?:alle|alla|all'|le|la)?\s*(?:ore\s*)?(\d{1,2})(?:[.,:](\d{2}))?/);
  if (m) {
    const fine = toOre(+m[1], m[2] ? +m[2] : 0);
    if (fine > ORE_INIZIO_GIORNATA && fine <= ORE_FINE_GIORNATA) {
      return fine - ORE_INIZIO_GIORNATA;
    }
  }

  if (/mezzogiorno|pomeriggio|mattina/.test(t)) return MEZZA_GIORNATA;
  return null;
}

// Ripulisce il titolo per isolare il nome: toglie la parola dell'assenza,
// gli orari e le indicazioni di tempo.
// "Permesso 3 ore Alessio" -> "Alessio" · "perm. Aleksandro dalle 16.00" -> "Aleksandro"
function nomeDalTitolo(t) {
  return t
    .replace(/\b(permessi|permesso|perm\.|perm|ferie)\b/gi, " ")
    .replace(/\d{1,2}(?:[.,:]\d{2})?\s*[-–]\s*\d{1,2}(?:[.,:]\d{2})?/g, " ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ore|ora|h)\b/gi, " ")
    .replace(/\b(?:dal|dalle|dalla|fino|alle|alla|ore)\b/gi, " ")
    .replace(/\b(?:mezzogiorno|pomeriggio|mattina|sera|prima)\b/gi, " ")
    .replace(/\d+/g, " ")
    .replace(/[.,;:()\-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "Ferie Erica" -> { tipo: "ferie", nome: "Erica", ore: null }
// "Permesso 3 ore Alessio" -> { tipo: "permesso", nome: "Alessio", ore: 3 }
function parseSummary(summary) {
  if (!summary) return null;
  const s = summary.trim();
  const lower = s.toLowerCase();
  const tipo = tipoDalTitolo(lower);
  return {
    tipo,
    nome: nomeDalTitolo(s),
    ore: tipo === "altro" ? null : oreDalTitolo(lower),
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body = {};
    try {
      body = await req.json();
    } catch (_e) {
      // payload vuoto
    }
    const data = body.data;
    const da = body.da;
    const a = body.a;
    const isSingle = !!data && /^\d{4}-\d{2}-\d{2}$/.test(data);
    const isRange =
      !!da && !!a && /^\d{4}-\d{2}-\d{2}$/.test(da) && /^\d{4}-\d{2}-\d{2}$/.test(a);
    if (!isSingle && !isRange) {
      return Response.json(
        { error: "Parametri non validi: usa 'data' oppure 'da' e 'a' (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const ics = await leggiCalendario();
    const events = parseIcal(ics);

    const permessiDelGiorno = (giorno) => {
      const result = [];
      const seen = new Set();
      for (const ev of events) {
        if (!covers(ev, giorno)) continue;
        const parsed = parseSummary(ev.summary);
        if (!parsed || !parsed.nome) continue;
        const key = `${parsed.tipo}:${parsed.nome.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ nome: parsed.nome, tipo: parsed.tipo, ore: parsed.ore ?? null });
      }
      return result;
    };

    if (isSingle) {
      return Response.json({ data, permessi: permessiDelGiorno(data) });
    }

    // Intervallo di giorni (es. un mese): un elenco di permessi per ogni giorno
    const permessiPerGiorno = {};
    let giorno = da;
    let guardia = 0;
    while (giorno <= a && guardia < 62) {
      const lista = permessiDelGiorno(giorno);
      if (lista.length) permessiPerGiorno[giorno] = lista;
      giorno = addOneDay(giorno);
      guardia++;
    }

    return Response.json({ da, a, permessi_per_giorno: permessiPerGiorno });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}