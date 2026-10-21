import { Camera, Loader2, Sparkles, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FotoCampione from "@/components/campioni/FotoCampione";

// Foto di un'etichetta: si scatta, si vede l'anteprima e si chiede all'AI di trascriverla.
export default function EtichettaField({
  label,
  preview,
  fileUri,
  onScegli,
  onRimuovi,
  onTrascrivi,
  trascrivendo,
  hint,
}) {
  const presente = Boolean(preview || fileUri);

  return (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5 flex items-start gap-3">
        {preview ? (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0">
            <img src={preview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={onRimuovi}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : fileUri ? (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0">
            <FotoCampione file_uri={fileUri} className="w-full h-full" />
            <button
              type="button"
              onClick={onRimuovi}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-1">Foto</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onScegli(e.target.files?.[0])}
            />
          </label>
        )}

        <div className="flex-1 min-w-0">
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
          {onTrascrivi && presente && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 mt-1.5"
              onClick={onTrascrivi}
              disabled={trascrivendo}
            >
              {trascrivendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {trascrivendo ? "Trascrivo..." : "Trascrivi dati"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}