import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const RUOLI_GESTORI = ['admin', 'responsabile_tecnico'];

// Oltre ai ruoli, gestisce il magazzino anche chi ha il permesso extra "inventario"
// (assegnato dall'amministratore dalla pagina Utenti).
const puoGestireInventario = (user) =>
  RUOLI_GESTORI.includes(user?.role) || user?.permessi_extra === 'inventario';
const TIPI_MANUALI = ['carico', 'scarico', 'rettifica'];

function numero(valore) {
  const n = Number(valore);
  return Number.isFinite(n) ? n : 0;
}

function sottoSoglia(materiale) {
  const soglia = numero(materiale?.soglia_minima);
  return soglia > 0 && numero(materiale?.giacenza) <= soglia;
}

// Invia l'avviso di scorta bassa ai destinatari configurati.
// Non blocca mai il movimento: se l'email non parte, il magazzino resta aggiornato.
async function avvisaScortaBassa(sr, materiale) {
  try {
    const destinatari = await sr.entities.DestinatarioScorta.filter({ attivo: true });
    const elenco = (destinatari || []).filter((d) => d?.email);
    if (elenco.length === 0) return 0;
    const esiti = await Promise.allSettled(
      elenco.map((d) =>
        sr.integrations.Core.SendEmail({
          to: d.email,
          template_name: 'ScortaBassa',
          variables: {
            nome_destinatario: d.nome || 'buongiorno',
            materiale: materiale.nome || 'Materiale',
            giacenza: String(numero(materiale.giacenza)),
            unita_misura: materiale.unita_misura || '',
            soglia: String(numero(materiale.soglia_minima)),
          },
        })
      )
    );
    return esiti.filter((e) => e.status === 'fulfilled').length;
  } catch (error) {
    console.log('Avviso scorta non inviato: ' + (error?.message || error));
    return 0;
  }
}

async function applicaMovimento(sr, materiale, tipo, quantita, extra) {
  const giacenzaPrima = numero(materiale.giacenza);
  // carico/scarico: quantità in ingresso o in uscita.
  // scarico_rapportino: quantità positiva = prelievo, negativa = prelievo ridotto (si ripristina la scorta).
  // rettifica: la quantità È la nuova giacenza.
  const nuovaGiacenza =
    tipo === 'carico'
      ? giacenzaPrima + quantita
      : tipo === 'scarico' || tipo === 'scarico_rapportino'
        ? giacenzaPrima - quantita
        : quantita;

  await sr.entities.MaterialeBase.update(materiale.id, { giacenza: nuovaGiacenza });
  await sr.entities.MovimentoMateriale.create({
    materiale_id: materiale.id,
    materiale_nome: materiale.nome || '',
    unita_misura: materiale.unita_misura || '',
    tipo,
    quantita,
    giacenza_dopo: nuovaGiacenza,
    data: new Date().toISOString(),
    ...extra,
  });

  const avvisi =
    numero(materiale.soglia_minima) > 0 && giacenzaPrima > numero(materiale.soglia_minima) && nuovaGiacenza <= numero(materiale.soglia_minima)
      ? await avvisaScortaBassa(sr, { ...materiale, giacenza: nuovaGiacenza })
      : 0;

  return { materiale_id: materiale.id, materiale_nome: materiale.nome || '', giacenza: nuovaGiacenza, avvisi };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const azione = body?.azione;
    const sr = base44.asServiceRole;

    // Movimento manuale del magazziniere (carico, scarico, rettifica)
    if (azione === 'movimento') {
      if (!puoGestireInventario(user)) {
        return Response.json({ error: 'Non autorizzato' }, { status: 403 });
      }
      if (!body.materiale_id || !TIPI_MANUALI.includes(body.tipo)) {
        return Response.json({ error: 'Dati movimento non validi' }, { status: 400 });
      }
      const quantita = numero(body.quantita);
      if (quantita < 0) return Response.json({ error: 'Quantità non valida' }, { status: 400 });

      let materiale = null;
      try {
        materiale = await sr.entities.MaterialeBase.get(body.materiale_id);
      } catch (error) {
        materiale = null;
      }
      if (!materiale) return Response.json({ error: 'Materiale non trovato' }, { status: 404 });

      const esito = await applicaMovimento(sr, materiale, body.tipo, quantita, {
        user_email: user.email,
        user_nome: user.full_name || user.email,
        nota: body.nota || '',
      });
      return Response.json(esito);
    }

    // Scarico automatico: riconcilia l'inventario con i materiali dichiarati sul rapportino.
    // Idempotente: confronta quanto già scaricato per quel rapportino con quanto risulta adesso.
    if (azione === 'scarico_rapportino') {
      const r = body.rapportino || {};
      if (!r.id) return Response.json({ error: 'Rapportino non valido' }, { status: 400 });

      const righe = (Array.isArray(r.materiali) ? r.materiali : []).filter((m) => m && m.materiale_id && m.da_capannone);
      const attuali = new Map();
      righe.forEach((m) => {
        attuali.set(m.materiale_id, (attuali.get(m.materiale_id) || 0) + numero(m.quantita));
      });

      const precedenti = await sr.entities.MovimentoMateriale.filter({ rapportino_id: r.id, tipo: 'scarico_rapportino' });
      const gia = new Map();
      (precedenti || []).forEach((m) => {
        gia.set(m.materiale_id, (gia.get(m.materiale_id) || 0) + numero(m.quantita));
      });

      const ids = [...new Set([...attuali.keys(), ...gia.keys()])];
      const aggiornati = [];
      for (const id of ids) {
        const delta = (attuali.get(id) || 0) - (gia.get(id) || 0);
        if (!delta) continue;
        let materiale = null;
        try {
          materiale = await sr.entities.MaterialeBase.get(id);
        } catch (error) {
          materiale = null;
        }
        if (!materiale) continue;
        const esito = await applicaMovimento(sr, materiale, 'scarico_rapportino', delta, {
          user_email: r.user_email || user.email,
          user_nome: r.user_nome || user.full_name || user.email,
          rapportino_id: r.id,
          cantiere_nome: r.cantiere_nome || '',
          nota: delta > 0 ? 'Prelievo dichiarato sul rapportino' : 'Rettifica del prelievo sul rapportino',
        });
        aggiornati.push(esito);
      }
      return Response.json({ aggiornati });
    }

    return Response.json({ error: 'Azione non valida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}