import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CATEGORIE_MATERIALE } from "@/lib/categorieMateriale";

// Categoria del prodotto: si può scegliere dall'elenco suggerito, farla proporre all'AI
// oppure scriverne una nuova.
export default function CategoriaPicker({ valore, onChange, onSuggerisci, suggerendo }) {
  const [custom, setCustom] = useState("");

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={valore}
          onChange={(e) => onChange(e.target.value)}
          list="categorie-materiale-suggerite"
          placeholder="Es. Pitture, vernici e solventi"
        />
        {onSuggerisci && (
          <Button variant="outline" size="icon" onClick={onSuggerisci} disabled={suggerendo} title="Fai suggerire la categoria all'AI">
            {suggerendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </Button>
        )}
      </div>
      <datalist id="categorie-materiale-suggerite">
        {CATEGORIE_MATERIALE.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIE_MATERIALE.slice(0, 12).map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
              valore === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-accent"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Nuova categoria..."
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
          Aggiungi
        </Button>
      </div>
    </div>
  );
}