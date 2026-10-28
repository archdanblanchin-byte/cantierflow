// Segnale visivo per i cantieri privi di geolocalizzazione: senza coordinate
// non si può verificare se le timbrature sono dentro l'area del cantiere.
export function mancaGps(cantiere) {
  const lat = cantiere?.latitudine;
  const lon = cantiere?.longitudine;
  const valida = (v) => v != null && v !== "" && !Number.isNaN(Number(v));
  return !valida(lat) || !valida(lon);
}

export default function GpsMancanteBadge({ cantiere, withLabel = true, className = "" }) {
  if (!mancaGps(cantiere)) return null;

  return (
    <span
      title="Questo cantiere non ha la geolocalizzazione"
      className={`inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
      </span>
      {withLabel && "GPS mancante"}
    </span>
  );
}