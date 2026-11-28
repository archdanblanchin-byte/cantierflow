import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const day = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit'});
const campi = ['data','cantiere_id','cantiere_nome','partecipanti_email','foto','foto_annotate','note_generali','ore_utilizzo_piattaforma','piattaforma','macchinari','attrezzi','descrizione_noleggio_mezzi','ore_noleggio_mezzi','descrizione_noleggio_plexi','ore_noleggio_plexi','ore_totali_squadra','collaboratori','has_lavorazioni_extra','lavorazioni_extra','lavorazioni_normali','materiali'];
const risposta = (error, status) => Response.json({ error }, { status });
const somma = (rows, key) => (Array.isArray(rows) ? rows : []).reduce((acc, row) => acc + (Number(row?.[key]) || 0), 0);

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return risposta('Accedi per salvare il rapportino.', 401);
    const { id, dati, aggiorna = false } = (await req.json().catch(() => null)) || {};
    if (!dati || typeof dati !== 'object' || Array.isArray(dati) || (id != null && (typeof id !== 'string' || !id || id.length > 80)) || (aggiorna && !id)) return risposta('Dati del rapportino non validi.', 400);
    const patch = Object.fromEntries(campi.filter(key => Object.hasOwn(dati, key)).map(key => [key, dati[key]]));
    const record = id ? await base44.entities.Rapportino.get(id).catch(e => [403,404].includes(e.status) ? null : Promise.reject(e)) : null;
    if (id && !record) return risposta('Rapportino non trovato.', 404);
    const admin = user.role === 'admin';
    const now = new Date();
    const oggi = day.format(now);
    const stessoGiorno = (value) => !!value && Number.isFinite(Date.parse(value)) && day.format(new Date(value)) === oggi;
    const sent = record?.stato === 'inviato';
    if (record && !!aggiorna !== sent) return risposta('Lo stato del rapportino è cambiato. Riaprilo prima di salvare.', 409);
    if (record && !admin) {
      const owner = record.autore_invio_id ? record.autore_invio_id === user.id : record.created_by_id ? record.created_by_id === user.id : record.created_by === user.email;
      const partecipante = (record.partecipanti_email || []).some(email => email?.toLowerCase() === user.email?.toLowerCase());
      if (sent && !owner) return risposta('Solo chi ha compilato il rapportino può modificarlo dopo l’invio.', 403);
      if (sent && !stessoGiorno(record.inviato_il || record.data)) return risposta('La finestra di modifica si è chiusa a mezzanotte (ora italiana).', 403);
      if (!sent && (!stessoGiorno(record.data) || (!owner && !partecipante))) return risposta('Non puoi inviare questa bozza.', 403);
      patch.data = record.data;
      patch.cantiere_id = record.cantiere_id;
      patch.cantiere_nome = record.cantiere_nome;
    }
    if (!record) {
      const permesso = await base44.entities.PermessoRapportino.filter({user_email:user.email, data:oggi}, '-created_date', 1);
      if (!permesso.length) return risposta('Non hai il permesso di creare un rapportino manuale oggi.', 403);
      if (!admin && !stessoGiorno(patch.data)) return risposta('Puoi inviare solo il rapportino di oggi.', 400);
    }
    const datiFinali = { ...record, ...patch };
    if (typeof datiFinali.cantiere_id !== 'string' || !datiFinali.cantiere_id || !Number.isFinite(Date.parse(datiFinali.data)) || !Number.isFinite(datiFinali.ore_totali_squadra)) return risposta('Cantiere, data o ore non validi.', 400);
    const totale = somma(datiFinali.collaboratori, 'ore_lavorate') || datiFinali.ore_totali_squadra;
    const assegnate = somma(datiFinali.lavorazioni_normali, 'ore_totali') + (datiFinali.has_lavorazioni_extra ? somma(datiFinali.lavorazioni_extra, 'ore') : 0);
    if (Math.abs(totale - assegnate) >= 0.01) return risposta('Assegna tutte le ore alle lavorazioni prima di salvare.', 400);
    const autore = sent ? record.autore_invio_id : user.id;
    const emailCompilatore = sent ? record.user_email : user.email;
    const partecipanti = Array.isArray(datiFinali.partecipanti_email) ? datiFinali.partecipanti_email.filter(email => typeof email === 'string') : [];
    const payload = { ...patch, stato:'inviato', user_email:emailCompilatore, partecipanti_email:[...new Set([...partecipanti, emailCompilatore, ...(sent && !admin ? [user.email] : [])].filter(Boolean))] };
    if (!sent) Object.assign(payload, { inviato_il:now.toISOString(), autore_invio_id:autore });
    const rapportini = base44.asServiceRole.entities.Rapportino;
    const salvato = record ? await rapportini.update(id, payload) : await rapportini.create(payload);
    return Response.json({ id:salvato.id });
  } catch (error) {
    console.error('Salvataggio rapportino', error.message);
    return risposta('Non è stato possibile salvare il rapportino.', 500);
  }
}