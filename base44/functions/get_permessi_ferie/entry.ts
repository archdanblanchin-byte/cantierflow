import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  leggiCalendario,
  leggiCalendarioCorsi,
  parseIcal,
  permessiDelGiornoConCorsi,
  permessiDelPeriodoConCorsi,
} from "../../shared/permessiCalendario.ts";

/**
 * Lettura diretta del calendario Google di permessi e ferie.
 * I dati vengono poi salvati in modo permanente da sync_permessi_ferie.
 */
export default async function (req) {
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

    const [ics, icsCorsi] = await Promise.all([
      leggiCalendario(body.forza === true),
      leggiCalendarioCorsi(body.forza === true).catch(() => ""),
    ]);
    const events = parseIcal(ics);
    const eventsCorsi = icsCorsi ? parseIcal(icsCorsi) : [];

    if (isSingle) {
      return Response.json({
        data,
        permessi: permessiDelGiornoConCorsi(events, eventsCorsi, data),
      });
    }

    return Response.json({
      da,
      a,
      permessi_per_giorno: permessiDelPeriodoConCorsi(events, eventsCorsi, da, a),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}