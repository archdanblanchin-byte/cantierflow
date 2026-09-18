import { base44 } from "@/api/base44Client";
import { distanzaKm } from "@/lib/timbratureUtils";

/**
 * Distanze stradali in km calcolate con Google Maps (percorso più corto).
 * Se il servizio non è disponibile ricade sulla distanza in linea d'aria,
 * così la trasferta resta sempre calcolabile.
 *
 * @param {Array<{from:{lat,lon},to:{lat,lon}}>} tratte
 * @returns {Promise<Array<number|null>>} km per ogni tratta (stesso ordine)
 */
export async function distanzeStradali(tratte) {
  const elenco = tratte || [];
  const valide = elenco
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t?.from?.lat != null && t?.to?.lat != null);

  if (!valide.length) return elenco.map(() => null);

  let risultato = [];
  try {
    const res = await base44.functions.invoke("calcola_percorso_maps", {
      tratte: valide.map(({ t }) => t),
    });
    risultato = res?.data?.distanze || [];
  } catch (e) {
    console.error("Calcolo distanze Google Maps non riuscito:", e);
  }

  const out = elenco.map(() => null);
  valide.forEach(({ t, i }, k) => {
    const km = risultato[k];
    out[i] = typeof km === "number" ? km : distanzaKm(t.from.lat, t.from.lon, t.to.lat, t.to.lon);
  });
  return out;
}