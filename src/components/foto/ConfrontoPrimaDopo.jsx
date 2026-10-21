import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { urlFoto } from "@/lib/fotoCantiere";

// Anteprima composita del confronto prima/dopo: il prima scorre sopra il dopo.
// Le foto originali non vengono mai modificate.
export default function ConfrontoPrimaDopo({ prima_uri, dopo_uri, className }) {
  const [posizione, setPosizione] = useState(50);
  const [urlPrima, setUrlPrima] = useState("");
  const [urlDopo, setUrlDopo] = useState("");

  useEffect(() => {
    let attivo = true;
    Promise.all([urlFoto(prima_uri), urlFoto(dopo_uri)])
      .then(([a, b]) => {
        if (!attivo) return;
        setUrlPrima(a);
        setUrlDopo(b);
      })
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, [prima_uri, dopo_uri]);

  if (!urlPrima || !urlDopo) return <div className={cn("bg-muted rounded-xl", className)} />;

  return (
    <div className={cn("relative rounded-xl overflow-hidden bg-black select-none", className)}>
      <img src={urlDopo} alt="Dopo" className="w-full h-full object-contain" />
      <img
        src={urlPrima}
        alt="Prima"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ clipPath: `inset(0 ${100 - posizione}% 0 0)` }}
      />
      <div className="absolute inset-y-0 w-0.5 bg-white/80 shadow" style={{ left: `${posizione}%` }} />
      <input
        type="range"
        min="0"
        max="100"
        value={posizione}
        onChange={(e) => setPosizione(Number(e.target.value))}
        aria-label="Confronta prima e dopo"
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
      <span className="absolute top-2 left-2 rounded-full bg-black/60 text-white text-[10px] px-2 py-0.5">Prima</span>
      <span className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-[10px] px-2 py-0.5">Dopo</span>
    </div>
  );
}