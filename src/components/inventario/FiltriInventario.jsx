import { AlertTriangle, ArrowDownAZ, Rows3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { categoriePresenti, scaffaliPresenti } from "@/lib/categorieMateriale";

function Chip({ attivo, onClick, children, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap flex items-center gap-1.5",
        attivo ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

// Filtri combinabili dell'inventario: stato scorta, scaffale, categoria e ordinamento.
export default function FiltriInventario({ materiali, numeroSottoSoglia, filtri, onChange }) {
  const categorie = categoriePresenti(materiali);
  const scaffali = scaffaliPresenti(materiali);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip attivo={!filtri.soloSottoSoglia} onClick={() => onChange({ soloSottoSoglia: false })}>
          Tutti
        </Chip>
        <Chip
          attivo={filtri.soloSottoSoglia}
          onClick={() => onChange({ soloSottoSoglia: true })}
          className={filtri.soloSottoSoglia ? "bg-amber-500 border-amber-500 text-white" : ""}
        >
          <AlertTriangle className="w-3 h-3" />
          Sotto soglia {numeroSottoSoglia > 0 && `(${numeroSottoSoglia})`}
        </Chip>

        <Select
          value={filtri.scaffale || "tutti"}
          onValueChange={(v) => onChange({ scaffale: v === "tutti" ? "" : v })}
        >
          <SelectTrigger className="h-8 w-auto min-w-[132px] rounded-full text-xs font-semibold gap-1">
            <SelectValue placeholder="Scaffale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli scaffali</SelectItem>
            {scaffali.map((s) => (
              <SelectItem key={s} value={s}>
                Scaffale {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex rounded-full border border-border overflow-hidden">
          <button
            onClick={() => onChange({ ordinamento: "nome" })}
            title="Ordina dalla A alla Z"
            className={cn(
              "px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors",
              filtri.ordinamento === "nome" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            )}
          >
            <ArrowDownAZ className="w-3.5 h-3.5" /> A-Z
          </button>
          <button
            onClick={() => onChange({ ordinamento: "scaffale" })}
            title="Ordina per scaffale"
            className={cn(
              "px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors",
              filtri.ordinamento === "scaffale" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
            )}
          >
            <Rows3 className="w-3.5 h-3.5" /> Scaffale
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        <Chip attivo={!filtri.categoria} onClick={() => onChange({ categoria: "" })}>
          Tutte le categorie
        </Chip>
        {categorie.map((c) => (
          <Chip key={c.nome} attivo={filtri.categoria === c.nome} onClick={() => onChange({ categoria: c.nome })}>
            {c.nome}
            <span className={cn("text-[10px]", filtri.categoria === c.nome ? "opacity-80" : "opacity-60")}>{c.conteggio}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}