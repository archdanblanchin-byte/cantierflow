import { AlertTriangle, ChevronRight, Flag, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { sottoSoglia } from "@/lib/inventario";

export default function MaterialeRow({ materiale, onOpen, onSegnala }) {
  const basso = sottoSoglia(materiale);
  const giacenza = Number(materiale.giacenza || 0);
  const soglia = Number(materiale.soglia_minima || 0);
  const riferimento = soglia > 0 ? soglia * 2 : giacenza || 1;
  const percentuale = Math.max(4, Math.min(100, Math.round((giacenza / riferimento) * 100)));

  return (
    <div
      className={cn(
        "w-full rounded-xl border bg-card p-3.5 flex items-center gap-2 transition-all hover:shadow-md",
        basso ? "border-amber-400 bg-amber-50/60" : "border-border"
      )}
    >
      <button
        onClick={() => onOpen(materiale)}
        className="flex-1 min-w-0 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", basso ? "bg-amber-500" : "bg-slate-500")}>
          <Package className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{materiale.nome}</p>
            {basso && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-700 bg-amber-200/70 rounded-full px-2 py-0.5 shrink-0">
                <AlertTriangle className="w-3 h-3" />
                sotto soglia
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className={cn("font-semibold", basso ? "text-amber-700" : "text-foreground")}>
              {giacenza} {materiale.unita_misura || ""}
            </span>
            {soglia > 0 && ` · soglia ${soglia} ${materiale.unita_misura || ""}`}
          </p>
          {(materiale.categoria || materiale.posizione_scaffale || materiale.fornitore) && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {materiale.categoria ? <span className="font-semibold text-primary">{materiale.categoria}</span> : ""}
              {materiale.categoria && (materiale.posizione_scaffale || materiale.fornitore) ? " · " : ""}
              {materiale.posizione_scaffale ? `Scaffale ${materiale.posizione_scaffale}` : ""}
              {materiale.posizione_scaffale && materiale.fornitore ? " · " : ""}
              {materiale.fornitore || ""}
            </p>
          )}
          <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
            <div className={cn("h-full rounded-full", basso ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${percentuale}%` }} />
          </div>
        </div>
      </button>
      {onSegnala && (
        <button
          onClick={() => onSegnala(materiale)}
          title="Segnala mancante"
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:border-rose-300 shrink-0"
        >
          <Flag className="w-4 h-4" />
        </button>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </div>
  );
}