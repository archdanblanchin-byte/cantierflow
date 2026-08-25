import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Aggrega le ore di TUTTI i rapportini di un cantiere (in ruolo servizio,
// ignorando i permessi RLS individuali) così che le statistiche complessive
// del cantiere siano visibili a qualsiasi utente autenticato, anche se non
// partecipa ai singoli rapportini.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const cantiere_id = body?.cantiere_id;
    if (!cantiere_id) {
      return Response.json({ error: 'cantiere_id obbligatorio' }, { status: 400 });
    }

    const rapportini = await base44.asServiceRole.entities.Rapportino.filter(
      { cantiere_id },
      "-data",
      1000
    );

    let oreTotali = 0;
    let oreExtra = 0;
    let oreNormali = 0;
    let orePiattaforma = 0;
    let oreMezzi = 0;
    let oreAttrezzi = 0;

    for (const r of rapportini) {
      const oreCollab = (r.collaboratori || []).reduce(
        (s, c) => s + (c.ore_lavorate || 0),
        0
      );
      oreTotali += oreCollab || r.ore_totali_squadra || 0;

      if (r.has_lavorazioni_extra) {
        oreExtra += (r.lavorazioni_extra || []).reduce(
          (s, l) => s + (l.ore || 0),
          0
        );
      }
      oreNormali += (r.lavorazioni_normali || []).reduce(
        (s, l) => s + (l.ore_totali || 0),
        0
      );
      orePiattaforma += r.ore_utilizzo_piattaforma || 0;
      oreMezzi += r.ore_noleggio_mezzi || 0;
      oreAttrezzi += r.ore_noleggio_plexi || 0;
    }

    const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

    return Response.json({
      count: rapportini.length,
      oreTotali: round2(oreTotali),
      oreExtra: round2(oreExtra),
      oreNormali: round2(oreNormali),
      orePiattaforma: round2(orePiattaforma),
      oreMezzi: round2(oreMezzi),
      oreAttrezzi: round2(oreAttrezzi),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}