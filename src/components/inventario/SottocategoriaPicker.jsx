import { useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SOTTOCATEGORIE_MATERIALE, CONTROLLO_QUOTIDIANO } from "@/lib/categorieMateriale";

// Sottocategoria di gestione: il responsabile la usa per dividere i materiali
// da controllare ogni giorno dagli altri. "controllare ogni giorno" è messa in
// evidenza perché è la più usata.
export default function SottocategoriaPicker({ valore, onChange }) {
  const [custom, setCustom] = useState("");
  const attivo = String(valore || "").trim();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {SOTTOCATEGORIE_MATERIALE.map((s) => {
          const selezionato = attivo === s;
          const quotidiano = s === CONTROLLO_QUOTIDIANO;
          return (
            <button
              key={s}
              onClick={() => onChange(selezionato ? "" : s)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors flex items-center gap-1 capitalize",
                selezionato
                  ? quotidiano
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-accent",
                quotidiano && !selezionato && "border-amber-300 text-amber-700"
              )}
            >
              {quotidiano && <Clock className="w-3 h-3" />}
              {selezionato && <CheckCircle2 className="w-3 h-3" />}
              {s}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Nuova sottocategoria..."
          className="h-8 text-xs"
        />
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={!custom.trim()}
          onClick={() => {
            onChange(custom.trim());
            setCustom("");
          }}
        >
          Imposta
        </Button>
      </div>
    </div>
  );
}