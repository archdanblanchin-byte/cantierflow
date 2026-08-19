import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Calendario PERMESSI/FERIE pubblico (group calendar)
const CALENDAR_ID =
  "31cd35a0b050ccef3dc636f01d485ed06d5ca5855370e35862881d848bad18bb@group.calendar.google.com";
const ICAL_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(
  CALENDAR_ID
)}/public/basic.ics`;

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

// "Ferie Erica" -> { tipo: "ferie", nome: "Erica" }
// "Permesso Alessio" -> { tipo: "permesso", nome: "Alessio" }
function parseSummary(summary) {
  if (!summary) return null;
  const s = summary.trim();
  const lower = s.toLowerCase();
  if (lower.startsWith("ferie")) {
    return { tipo: "ferie", nome: s.slice(5).trim() };
  }
  if (lower.startsWith("permesso")) {
    return { tipo: "permesso", nome: s.slice(8).trim() };
  }
  return { tipo: "altro", nome: s };
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
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return Response.json(
        { error: "Parametro 'data' non valido (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const res = await fetch(ICAL_URL, { method: "GET" });
    if (!res.ok) {
      return Response.json(
        { error: `Impossibile leggere il calendario (status ${res.status})` },
        { status: 502 }
      );
    }
    const ics = await res.text();
    const events = parseIcal(ics);

    const result = [];
    const seen = new Set();
    for (const ev of events) {
      if (!covers(ev, data)) continue;
      const parsed = parseSummary(ev.summary);
      if (!parsed || !parsed.nome) continue;
      const key = `${parsed.tipo}:${parsed.nome.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ nome: parsed.nome, tipo: parsed.tipo });
    }

    return Response.json({ data, permessi: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}