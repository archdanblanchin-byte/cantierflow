import { Camera, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import FotoCampione from "@/components/campioni/FotoCampione";
import { coloreValido, testoSuColore } from "@/lib/campioni";

// Riquadro colore: la foto diventa una tessera piena della tinta rilevata,
// correggibile a mano o ricampionando un punto della foto.
export default function FotoColoreField({ colore, preview, fileUri, onScegli, onColore, onCampiona, onRimuovi }) {
  const hex = coloreValido(colore) ? colore : "";

  return (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Colore</Label>
      <div className="mt-1.5 flex items-start gap-3">
        <div
          className="w-24 h-24 rounded-2xl border border-black/10 shrink-0 flex items-end justify-end p-2"
          style={hex ? { backgroundColor: hex } : undefined}
        >
          {hex && (
            <span
              className="text-[10px] font-bold uppercase tracking-wide"
              style={{ color: testoSuColore(hex) }}
            >
              {hex}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {preview ? (
            <div className="flex items-start gap-2">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0">
                <img
                  src={preview}
                  alt=""
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    onCampiona((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
                  }}
                  className="w-full h-full object-cover cursor-crosshair"
                />
                <button
                  type="button"
                  onClick={onRimuovi}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tocca la foto nel punto del colore per correggere la tinta.
              </p>
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
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
              <Camera className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground mt-1">Foto colore</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => onScegli(e.target.files?.[0])}
              />
            </label>
          )}

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={hex || "#cccccc"}
              onChange={(e) => onColore(e.target.value)}
              className="w-8 h-8 rounded-lg border border-border bg-transparent cursor-pointer p-0.5"
            />
            <span className="text-[11px] text-muted-foreground">
              {hex ? "Correggi il colore a mano" : "Nessun colore rilevato"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}