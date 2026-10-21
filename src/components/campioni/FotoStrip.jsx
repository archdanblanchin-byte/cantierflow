import { Building2, Image as ImageIcon, Loader2, PaintBucket, Palette, Tag, X } from "lucide-react";
import FotoCampione from "@/components/campioni/FotoCampione";

// Le quattro foto del campione, in fila: si scattano prima di compilare,
// così l'etichetta riempie da sola i campi del form.
const SLOT = [
  { chiave: "fornitore", label: "Etichetta fornitore", Icona: Tag },
  { chiave: "azienda", label: "Etichetta ditta", Icona: Building2 },
  { chiave: "secchio", label: "Contenitore", Icona: PaintBucket },
  { chiave: "colore", label: "Colore", Icona: Palette },
];

function Slot({ voce, foto, inCorso, onScegli, onRimuovi, onCampiona }) {
  const { Icona } = voce;
  const presente = Boolean(foto?.preview || foto?.file_uri);
  // Sul riquadro colore il tocco campiona la tinta dal punto toccato.
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
    <div className="flex-1 min-w-0">
      <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-border">
        {foto?.preview ? (
          <img src={foto.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : foto?.file_uri ? (
          <FotoCampione file_uri={foto.file_uri} className="absolute inset-0 w-full h-full" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Icona className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Foto</span>
          </div>
        )}

        {/* Tocco sul riquadro = fotocamera (predefinito). Sono campi file
            trasparenti ma reali: la pressione è diretta sull'input, così la
            fotocamera si apre su tutti i telefoni. */}
        {campionabile ? (
          <button
            type="button"
            onClick={campiona}
            aria-label="Campiona il colore dalla foto"
            className="absolute inset-0 w-full h-full"
          />
        ) : (
          <input
            type="file"
            accept="image/*"
            capture="environment"
            aria-label={`Scatta la foto: ${voce.label}`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={scelto}
          />
        )}

        {/* Seconda opzione: caricare dalla galleria. */}
        {!inCorso && (
          <>
            <span className="absolute bottom-1 left-1 z-20 w-5 h-5 rounded bg-background/85 flex items-center justify-center pointer-events-none">
              <ImageIcon className="w-3 h-3 text-foreground" />
            </span>
            <input
              type="file"
              accept="image/*"
              aria-label={`Carica dalla galleria: ${voce.label}`}
              className="absolute bottom-1 left-1 z-20 w-5 h-5 opacity-0 cursor-pointer"
              onChange={scelto}
            />
          </>
        )}

        {inCorso && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}

        {presente && !inCorso && (
          <button
            type="button"
            onClick={onRimuovi}
            className="absolute top-1 right-1 z-30 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="text-[10px] text-center text-muted-foreground mt-1 leading-tight">{voce.label}</p>
    </div>
  );
}

export default function FotoStrip({ foto, lavoro = {}, onScegli, onRimuovi, onCampiona }) {
  return (
    <div>
      <div className="flex gap-2">
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
        Tocca il riquadro per scattare la foto, oppure l'icona in basso a sinistra per caricarla dalla galleria. Sul
        riquadro colore, tocca la foto nel punto della tinta per correggerla.
      </p>
    </div>
  );
}