import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { caricaFotoPrivata, urlFoto } from "@/lib/fotoCantiere";

// Allegati documentali nello storage privato: si salvano solo nome e riferimento del file.
export default function FileList({ items = [], onChange, titolo = "Allegati" }) {
  const ref = useRef(null);
  const [caricamento, setCaricamento] = useState(false);

  const aggiungi = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setCaricamento(true);
    try {
      const nuovi = [];
      for (const f of files) nuovi.push({ nome: f.name, file_uri: await caricaFotoPrivata(f) });
      onChange([...items, ...nuovi]);
    } catch {
      toast.error("Caricamento non riuscito. Riprova.");
    } finally {
      setCaricamento(false);
    }
  };

  const apri = async (it) => window.open(await urlFoto(it.file_uri), "_blank", "noopener");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{titolo} {items.length > 0 && <span className="text-muted-foreground">({items.length})</span>}</p>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={caricamento} onClick={() => ref.current?.click()}>
          {caricamento ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />} Aggiungi file
        </Button>
      </div>
      <input ref={ref} type="file" multiple className="hidden" onChange={aggiungi} />
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessun file.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={`${it.file_uri}-${i}`} className="flex items-center gap-2 border rounded-lg px-2 py-1.5 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <button type="button" className="flex-1 text-left truncate hover:underline" onClick={() => apri(it)}>{it.nome || "File"}</button>
              <button type="button" aria-label="Rimuovi" onClick={() => onChange(items.filter((_, k) => k !== i))}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}