import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import {
  leggiCalendario,
  parseIcal,
  permessiDelGiorno,
  permessiDelPeriodo,
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

    const ics = await leggiCalendario(body.forza === true);
    const events = parseIcal(ics);

    if (isSingle) {
      return Response.json({ data, permessi: permessiDelGiorno(events, data) });
    }

    return Response.json({ da, a, permessi_per_giorno: permessiDelPeriodo(events, da, a) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}