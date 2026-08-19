import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { data, furgone_id, furgone_nome, collaboratore_id, collaboratore_nome,
      tipo_orario, ora_inizio, ora_fine, nota } = body;

    if (!data || !furgone_id || (!collaboratore_id && !collaboratore_nome)) {
      return Response.json({ error: 'Dati mancanti: data, furgone e conducente sono obbligatori' }, { status: 400 });
    }

    const orarioText = tipo_orario === 'fascia'
      ? `${ora_inizio || '—'} - ${ora_fine || '—'}`
      : 'Tutta la giornata';

    // 1. Crea il record di utilizzo
    const record = await base44.entities.UsoFurgone.create({
      data, furgone_id, furgone_nome,
      collaboratore_id, collaboratore_nome,
      tipo_orario: tipo_orario || 'tutta_giornata',
      ora_inizio, ora_fine, nota,
      user_email: user.email
    });

    // 2. Registra una nota sul furgone (visibile a tutti nel registro)
    const testoNota = `Uso registrato da ${collaboratore_nome || user.full_name || '—'} il ${data} (${orarioText})${nota ? `. Segnalazione: ${nota}` : ''}`;
    await base44.entities.NotaFurgone.create({
      furgone_id, furgone_nome,
      testo: testoNota,
      tipo: nota ? 'problema' : 'nota',
      autore_nome: user.full_name || collaboratore_nome || '—',
      autore_email: user.email || ''
    });

    // 3. Notifica email agli amministratori (non bloccante)
    waitUntil((async () => {
      try {
        const users = await base44.asServiceRole.entities.User.list();
        const adminEmails = users.filter(u => u.role === 'admin').map(u => u.email).filter(Boolean);
        const subject = `Nuovo uso furgone: ${furgone_nome || 'furgone'}`;
        const bodyText = `Il collaboratore ${collaboratore_nome || user.full_name || '—'} ha registrato l'uso del furgone "${furgone_nome || '—'}" in data ${data}.\n\nOrario: ${orarioText}\n\nNote/segnalazioni:\n${nota || 'Nessuna'}\n\nRegistrazione a sistema automatica sul registro del furgone.`;
        for (const email of adminEmails) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: email,
            subject,
            body: bodyText
          });
        }
      } catch (e) {
        // notifica non bloccante: ignora errori
      }
    })());

    return Response.json({ ok: true, record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}