import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Converte metri in km con un decimale
function km(metri) {
  return Math.round((metri / 1000) * 10) / 10;
}

// Calcola la distanza stradale (km) tra coppie di coordinate usando Google Maps.
// Per ogni tratta sceglie il percorso PIÙ CORTO tra le alternative proposte.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const tratte = Array.isArray(body?.tratte) ? body.tratte.slice(0, 25) : [];
    if (!tratte.length) return Response.json({ distanze: [], durate: [] });

    const apiKey = secrets.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'GOOGLE_MAPS_API_KEY non configurata' }, { status: 400 });
    }

    const distanze = [];
    const durate = [];

    for (const tratta of tratte) {
      const from = tratta?.from;
      const to = tratta?.to;
      if (from?.lat == null || to?.lat == null) {
        distanze.push(null);
        durate.push(null);
        continue;
      }

      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}` +
        `&mode=driving&alternatives=true&language=it&region=it&key=${apiKey}`;

      const res = await fetch(url);
      const data = await res.json();
      const routes = Array.isArray(data?.routes) ? data.routes : [];

      let migliore = null;
      for (const route of routes) {
        const leg = route?.legs?.[0];
        const metri = leg?.distance?.value;
        if (typeof metri !== 'number') continue;
        if (!migliore || metri < migliore.metri) {
          migliore = { metri, secondi: leg?.duration?.value ?? null };
        }
      }

      distanze.push(migliore ? km(migliore.metri) : null);
      durate.push(migliore?.secondi ?? null);
    }

    return Response.json({ distanze, durate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}