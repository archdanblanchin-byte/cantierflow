import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { calcolaSquadra, calcolaOrePerCantiere } from '../../shared/rapportiniCalcolo.ts';

// Crea o riallinea i rapportini di una giornata a partire dalle timbrature.
// Gira con i permessi di servizio: così chi timbra vede sempre il rapportino
// già esistente e non ne nascono doppioni per lo stesso cantiere e giornata.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const inizio = body?.inizio;
    const fine = body?.fine;
    if (!inizio || !fine) {
      return Response.json({ error: 'Parametri inizio e fine obbligatori' }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    const [timbrature, rapportini, collaboratoriList, configList] = await Promise.all([
      sr.entities.Timbratura.filter({ data_ora: { $gte: inizio, $lt: fine } }, 'data_ora', 5000),
      sr.entities.Rapportino.filter({ data: { $gte: inizio, $lt: fine } }, 'created_date', 2000),
      sr.entities.Collaboratore.list(),
      sr.entities.ConfigurazioneTrasferta.list(),
    ]);

    const cfg = (configList || [])[0];
    const capannone = cfg && cfg.sede_latitudine != null && cfg.sede_longitudine != null
      ? { lat: cfg.sede_latitudine, lon: cfg.sede_longitudine }
      : null;

    // Timbrature e rapportini raggruppati per cantiere
    const perCantiere = new Map();
    (timbrature || []).forEach((t) => {
      if (!t.cantiere_id) return;
      if (!perCantiere.has(t.cantiere_id)) perCantiere.set(t.cantiere_id, []);
      perCantiere.get(t.cantiere_id).push(t);
    });

    const rapPerCantiere = new Map();
    (rapportini || []).forEach((r) => {
      if (!r.cantiere_id) return;
      if (!rapPerCantiere.has(r.cantiere_id)) rapPerCantiere.set(r.cantiere_id, []);
      rapPerCantiere.get(r.cantiere_id).push(r);
    });

    const risultati = [];

    for (const [cantiereId, timb] of perCantiere) {
      const esistenti = (rapPerCantiere.get(cantiereId) || [])
        .slice()
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      // Un solo rapportino per cantiere e giornata: resta il primo creato.
      const keeper = esistenti[0] || null;

      const squadra = calcolaSquadra(timb, collaboratoriList, capannone);
      const notePrec = new Map(
        ((keeper && keeper.collaboratori) || []).map((c) => [
          c.user_email || c.collaboratore_id,
          c.note_imprevisti || '',
        ])
      );
      const collaboratori = squadra.map((s) => ({
        ...s,
        note_imprevisti: notePrec.get(s.user_email || s.collaboratore_id) || '',
      }));
      const oreTotali = collaboratori.reduce((s, c) => s + (c.ore_lavorate || 0), 0);
      const calc = calcolaOrePerCantiere(timb).find((c) => c.cantiere_id === cantiereId);
      const oreSpostamento = calc ? calc.ore_spostamento : 0;

      if (!keeper) {
        await sr.entities.Rapportino.create({
          data: timb[0]?.data_ora || new Date().toISOString(),
          cantiere_id: cantiereId,
          cantiere_nome: timb[0]?.cantiere_nome || '',
          user_email: user.email,
          partecipanti_email: [
            ...new Set([user.email, ...collaboratori.map((c) => c.user_email).filter(Boolean)]),
          ],
          foto: [],
          foto_annotate: [],
          note_generali: '',
          ore_totali_squadra: oreTotali,
          ore_spostamento: oreSpostamento,
          collaboratori,
          has_lavorazioni_extra: false,
          lavorazioni_extra: [],
          lavorazioni_normali: [],
          materiali: [],
          stato: 'bozza',
        });
        risultati.push({ cantiere_id: cantiereId, azione: 'creato', ore: oreTotali });
        continue;
      }

      const partecipanti = [
        ...new Set([
          ...(keeper.partecipanti_email || []),
          ...collaboratori.map((c) => c.user_email).filter(Boolean),
        ]),
      ];

      await sr.entities.Rapportino.update(keeper.id, {
        ore_totali_squadra: oreTotali,
        ore_spostamento: oreSpostamento,
        collaboratori,
        partecipanti_email: partecipanti,
      });

      // Rimuove i doppioni creati in passato, solo se ancora vuoti di contenuti
      // (lavorazioni, materiali, foto) e non ancora inviati.
      const duplicati = esistenti.slice(1).filter((d) =>
        (d.stato || 'bozza') === 'bozza' &&
        !(d.foto || []).length &&
        !(d.foto_annotate || []).length &&
        !(d.lavorazioni_normali || []).length &&
        !(d.lavorazioni_extra || []).length &&
        !(d.materiali || []).length
      );
      for (const d of duplicati) await sr.entities.Rapportino.delete(d.id);

      risultati.push({
        cantiere_id: cantiereId,
        azione: 'aggiornato',
        ore: oreTotali,
        duplicati_rimossi: duplicati.length,
      });
    }

    return Response.json({ ok: true, cantieri: risultati.length, risultati });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}