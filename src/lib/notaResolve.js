// Helper per risolvere una nota "parsed" (dall'IA o manuale) in campi editabili
// e per costruire il payload finale da salvare.

export const TIPI = [
  { value: "personale", label: "Personale" },
  { value: "promemoria", label: "Promemoria / Sveglia" },
  { value: "lista", label: "Lista (materiale/attrezzi)" },
  { value: "messaggio", label: "Messaggio a collega" },
];

export const PRIORITA = [
  { value: "bassa", label: "Bassa" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

export const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

// Costruisce la lista destinatari disponibili: utenti app + collaboratori con email
export function buildDestOptions(users = [], collaboratori = []) {
  const opts = [];
  const seen = new Set();
  users.forEach((u) => {
    if (u.email && !seen.has(u.email)) { seen.add(u.email); opts.push({ email: u.email, nome: u.full_name || u.email }); }
  });
  collaboratori.forEach((c) => {
    if (c.user_email && !seen.has(c.user_email)) { seen.add(c.user_email); opts.push({ email: c.user_email, nome: c.nome }); }
  });
  return opts;
}

// Risolve i nomi (cantiere/furgone/destinatari) dell'IA negli ID/email
export function resolveNota(parsed = {}, { cantieri = [], furgoni = [], destOptions = [] } = {}) {
  let cId = parsed.cantiere_id || "";
  if (!cId && parsed.cantiere_nome) {
    const low = parsed.cantiere_nome.toLowerCase();
    const m = cantieri.find((c) => c.nome?.toLowerCase() === low || c.nome?.toLowerCase().includes(low));
    if (m) cId = m.id;
  }
  let fId = parsed.furgone_id || "";
  if (!fId && parsed.furgone_nome) {
    const low = parsed.furgone_nome.toLowerCase();
    const m = furgoni.find((f) => f.nome?.toLowerCase() === low || f.nome?.toLowerCase().includes(low));
    if (m) fId = m.id;
  }
  let destEmails = [];
  if (Array.isArray(parsed.destinatari_email)) destEmails = parsed.destinatari_email;
  else if (Array.isArray(parsed.destinatari_nomi)) {
    parsed.destinatari_nomi.forEach((n) => {
      const low = (n || "").toLowerCase();
      const m = destOptions.find((o) => o.nome?.toLowerCase().includes(low) || low.includes(o.nome?.toLowerCase()));
      if (m) destEmails.push(m.email);
    });
  }
  return {
    tipo: parsed.tipo || "personale",
    testo: parsed.testo || "",
    items: (parsed.items || []).map((i) => ({ text: i.text || (typeof i === "string" ? i : ""), done: !!i.done })),
    privata: parsed.privata !== undefined ? !!parsed.privata : true,
    cantiere_id: cId,
    furgone_id: fId,
    destinatari_email: destEmails,
    data_promemoria: toLocalInput(parsed.data_promemoria),
    priorita: parsed.priorita || "media",
    origine: parsed._vocale ? "vocale" : "manuale",
  };
}

// Costruisce il payload per la creazione a partire dallo stato editabile
export function buildNotaPayload(n, { cantieri = [], furgoni = [], destOptions = [] } = {}) {
  return {
    testo: n.testo.trim(),
    tipo: n.tipo,
    items: n.tipo === "lista" ? (n.items || []).filter((i) => i.text.trim()).map((i) => ({ text: i.text.trim(), done: !!i.done })) : [],
    privata: n.privata !== undefined ? !!n.privata : true,
    cantiere_id: n.cantiere_id || null,
    cantiere_nome: n.cantiere_id ? cantieri.find((c) => c.id === n.cantiere_id)?.nome || null : null,
    furgone_id: n.furgone_id || null,
    furgone_nome: n.furgone_id ? furgoni.find((f) => f.id === n.furgone_id)?.nome || null : null,
    destinatari_email: n.destinatari_email || [],
    destinatari_nomi: (n.destinatari_email || []).map((e) => destOptions.find((o) => o.email === e)?.nome || e),
    data_promemoria: n.data_promemoria ? new Date(n.data_promemoria).toISOString() : null,
    priorita: n.priorita || "media",
    origine: n.origine || "manuale",
  };
}