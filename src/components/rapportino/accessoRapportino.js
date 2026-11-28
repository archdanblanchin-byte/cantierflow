const giornoRoma = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });

export function stessoGiornoRoma(value, now = Date.now()) {
  const date = new Date(value);
  return !!value && Number.isFinite(+date) && giornoRoma.format(date) === giornoRoma.format(now);
}

export function autoreRapportino(report, user) {
  return !!user?.id && !!report && (report.autore_invio_id ? report.autore_invio_id === user.id : report.created_by_id ? report.created_by_id === user.id : !!user.email && report.created_by === user.email);
}

export function modificaRapportino(report, user, now) {
  if (!report || !user) return false;
  if (user.role === 'admin') return true;
  if (report.stato === 'inviato') return autoreRapportino(report, user) && stessoGiornoRoma(report.inviato_il || report.data, now);
  return stessoGiornoRoma(report.data, now) && !!user.email && (report.user_email === user.email || (report.partecipanti_email || []).some((email) => email?.toLowerCase() === user.email.toLowerCase()));
}