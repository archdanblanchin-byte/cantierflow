import { AlertTriangle, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { sottoSoglia } from "@/lib/inventario";

export default function MaterialeRow({ materiale, onOpen }) {
  const basso = sottoSoglia(materiale);
  const giacenza = Number(materiale.giacenza || 0);
  const soglia = Number(materiale.soglia_minima || 0);
  const riferimento = soglia > 0 ? soglia * 2 : giacenza || 1;
  const percentuale = Math.max(4, Math.min(100, Math.round((giacenza / riferimento) * 100)));

  return (
    <button
      onClick={() => onOpen(materiale)}
      className={cn(
        "w-full text-left rounded-xl border bg-card p-3.5 flex items-center gap-3 transition-all hover:shadow-md active:scale-[0.99]",
        basso ? "border-amber-400 bg-amber-50/60" : "border-border"
      )}
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
        <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
          <div className={cn("h-full rounded-full", basso ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${percentuale}%` }} />
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}