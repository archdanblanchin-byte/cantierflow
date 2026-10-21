import { useRef } from "react";
import { Building2, Loader2, PaintBucket, Palette, Tag, X } from "lucide-react";
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
  const inputRef = useRef(null);
  const { Icona } = voce;
  const presente = Boolean(foto?.preview || foto?.file_uri);
  // Sul riquadro colore il tocco campiona la tinta dal punto toccato.
  const campionabile = voce.chiave === "colore" && Boolean(foto?.preview) && Boolean(onCampiona);

  const tocca = (e) => {
    if (campionabile) {
      const r = e.currentTarget.getBoundingClientRect();
      onCampiona((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      return;
    }
    inputRef.current?.click();
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed border-border">
        <button type="button" onClick={tocca} className="absolute inset-0 w-full h-full">
          {foto?.preview ? (
            <img src={foto.preview} alt="" className="w-full h-full object-cover" />
          ) : foto?.file_uri ? (
            <FotoCampione file_uri={foto.file_uri} className="w-full h-full" />
          ) : (
            <span className="flex flex-col items-center justify-center gap-1 h-full">
              <Icona className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Foto</span>
            </span>
          )}
        </button>

        {inCorso && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        )}

        {presente && !inCorso && (
          <button
            type="button"
            onClick={onRimuovi}
            className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            onScegli(file);
          }}
        />
      </div>
      <p className="text-[10px] text-center text-muted-foreground mt-1 leading-tight">{voce.label}</p>
    </div>
  );
}

export default function FotoStrip({ foto, lavoro = {}, onScegli, onRimuovi, onCampiona }) {
  return (
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
  );
}