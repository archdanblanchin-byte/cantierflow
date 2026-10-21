import { ChevronRight, MapPin, PaintBucket } from "lucide-react";
import { cn } from "@/lib/utils";
import { coloreValido, etichettaTipo } from "@/lib/campioni";

export default function CampioneCard({ campione, onOpen }) {
  const usato = campione.stato === "utilizzato";
  const hex = coloreValido(campione.colore_hex) ? campione.colore_hex : "";
  const quantita = Number(campione.quantita || 0);

  return (
    <button
      onClick={() => onOpen(campione)}
      className={cn(
        "w-full rounded-xl border bg-card p-3 flex items-center gap-3 text-left transition-all hover:shadow-md active:scale-[0.99]",
        usato ? "border-border opacity-70" : "border-border"
      )}
    >
      {/* Riquadro colore: riempito con la tinta del campione */}
      <div
        className="w-14 h-14 rounded-xl border border-black/10 shrink-0 flex items-center justify-center overflow-hidden"
        style={hex ? { backgroundColor: hex } : undefined}
      >
        {!hex && <PaintBucket className="w-5 h-5 text-muted-foreground" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-semibold truncate", usato && "line-through decoration-1")}>
            {campione.nome || "Senza nome"}
          </p>
          {usato && (
            <span className="text-[10px] font-bold uppercase text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
              utilizzato
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {campione.colore_nome ? <span className="font-semibold text-foreground">{campione.colore_nome}</span> : null}
          {campione.colore_nome && (campione.marca || campione.codice) ? " · " : ""}
          {[campione.marca, campione.codice].filter(Boolean).join(" · ")}
        </p>

        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          <span className="font-semibold text-primary">{etichettaTipo(campione.tipo)}</span>
          {quantita > 0 ? ` · ${quantita} ${campione.unita_misura || ""}` : ""}
        </p>

        {(campione.cantiere_nome || campione.usato_cantiere_nome || campione.usato_nota) && (
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            {usato
              ? campione.usato_cantiere_nome || campione.usato_nota || "Uso registrato"
              : `Da ${campione.cantiere_nome}`}
          </p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}