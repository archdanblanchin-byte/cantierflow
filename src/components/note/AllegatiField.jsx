import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Paperclip, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { caricaFilePrivato } from "@/lib/allegati";

/**
 * Allegati di una nota personale: i file restano privati e si aprono dalla nota.
 */
export default function AllegatiField({ value = [], onChange }) {
  const inputRef = useRef(null);
  const [caricando, setCaricando] = useState(false);

  const scegli = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setCaricando(true);
    try {
      const nuovi = [];
      for (const f of files) {
        const file_uri = await caricaFilePrivato(f);
        nuovi.push({ nome: f.name, file_uri });
      }
      onChange([...value, ...nuovi]);
    } catch (err) {
      toast.error("Errore nel caricamento: " + err.message);
    } finally {
      setCaricando(false);
    }
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" multiple className="hidden" onChange={scegli} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => inputRef.current?.click()}
        disabled={caricando}
      >
        {caricando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
        {caricando ? "Caricamento…" : "Allega file"}
      </Button>

      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs truncate flex-1">{a.nome}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                aria-label="Rimuovi allegato"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}