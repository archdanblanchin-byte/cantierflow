import { useEffect, useState } from "react";
import { distanzeStradali } from "@/lib/percorsiMaps";

/**
 * Distanze stradali (km, Google Maps - percorso più corto) per una lista di
 * tratte { from:{lat,lon}, to:{lat,lon} }. Restituisce null finché il calcolo
 * non è disponibile.
 */
export function useDistanzeStradali(tratte) {
  const [distanze, setDistanze] = useState(null);
  const chiave = JSON.stringify(tratte || []);

  useEffect(() => {
    let attivo = true;
    if (!tratte || !tratte.length) {
      setDistanze(null);
      return;
    }
    distanzeStradali(tratte).then((d) => {
      if (attivo) setDistanze(d);
    });
    return () => {
      attivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave]);

  return distanze;
}