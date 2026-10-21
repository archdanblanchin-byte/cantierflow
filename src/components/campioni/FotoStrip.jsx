import { Building2, Camera, Image as ImageIcon, Loader2, PaintBucket, Palette, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import FotoCampione from "@/components/campioni/FotoCampione";

// Le quattro foto del campione, in griglia: si scattano prima di compilare,
// così l'etichetta riempie da sola i campi del form.
const SLOT = [
  { chiave: "fornitore", label: "Etichetta fornitore", Icona: Tag },
  { chiave: "azienda", label: "Etichetta ditta", Icona: Building2 },
  { chiave: "secchio", label: "Contenitore", Icona: PaintBucket },
  { chiave: "colore", label: "Colore", Icona: Palette },
];

const BTN =
  "flex h-10 items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40";

function Slot({ voce, foto, inCorso, onScegli, onRimuovi, onCampiona }) {
  const { Icona } = voce;
  const presente = Boolean(foto?.preview || foto?.file_uri);
  // Sul riquadro colore il tocco sulla foto campiona la tinta dal punto toccato.
  const campionabile = voce.chiave === "colore" && Boolean(foto?.preview) && Boolean(onCampiona);

  const campiona = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    onCampiona((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };

  const scelto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    onScegli(file);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="relative aspect-square border-b border-dashed border-border bg-muted/30">
        {foto?.preview ? (
          <img src={foto.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : foto?.file_uri ? (
          <FotoCampione file_uri={foto.file_uri} className="absolute inset-0 w-full h-full" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Icona className="w-6 h-6 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Nessuna foto</span>
          </div>
        )}

        {campionabile && (
          <button
            type="button"
            onClick={campiona}
            aria-label="Campiona il colore dalla foto"
            className="absolute inset-0 w-full h-full"
          />
        )}

        {inCorso && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {presente && !inCorso && (
          <button
            type="button"
            onClick={onRimuovi}
            aria-label={`Rimuovi la foto: ${voce.label}`}
            className="absolute top-1.5 right-1.5 z-30 w-7 h-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="px-1.5 py-1.5 text-[11px] text-center text-muted-foreground leading-tight truncate">{voce.label}</p>

      <div className="grid grid-cols-2 gap-1 p-1.5 pt-0">
        <label className={cn(BTN, "bg-primary text-primary-foreground", inCorso && "pointer-events-none opacity-40")}>
          <Camera className="w-4 h-4 shrink-0" />
          <span className="truncate">Scatta</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={inCorso}
            onChange={scelto}
          />
        </label>
        <label
          className={cn(
            BTN,
            "border border-border bg-muted text-muted-foreground",
            inCorso && "pointer-events-none opacity-40"
          )}
        >
          <ImageIcon className="w-4 h-4 shrink-0" />
          <span className="truncate">Galleria</span>
          <input type="file" accept="image/*" className="hidden" disabled={inCorso} onChange={scelto} />
        </label>
      </div>
    </div>
  );
}

export default function FotoStrip({ foto, lavoro = {}, onScegli, onRimuovi, onCampiona }) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {SLOT.map((voce) => (
          <Slot
            key={voce.chiave}
            voce={voce}
            foto={foto[voce.chiave]}
            inCorso={Boolean(lavoro[voce.chiave])}
            onScegli={(file) => onScegli(voce.chiave, file)}
            onRimuovi={() => onRimuovi(voce.chiave)}
            onCampiona={onCampiona}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Usa <span className="font-semibold text-foreground">Scatta</span> per la fotocamera e{" "}
        <span className="font-semibold text-foreground">Galleria</span> per scegliere una foto già sul telefono. Sul
        riquadro colore, tocca la foto nel punto della tinta per correggerla.
      </p>
    </div>
  );
}