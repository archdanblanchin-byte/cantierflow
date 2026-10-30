import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MapPin, Clock, AlertTriangle, Pencil, Trash2, StickyNote, ChevronDown, ChevronRight } from "lucide-react";
import { STEP_CONFIG, fmtOre } from "@/lib/timbratureUtils";

// Scheda cantiere con i dettagli (singoli timbri) collassabili: chiusi di
// default, si aprono toccando l'intestazione.
export default function CantiereTimbraturaCard({ g, canEdit = false, onEdit, onDelete }) {
  const [aperto, setAperto] = useState(false);

  return (
    <Card className="p-4 space-y-3">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        className="flex items-center justify-between w-full border-b pb-2 text-left"
      >
        <div className="flex items-center gap-2">
          {aperto ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-semibold">{g.nome}</span>
        </div>
        <div className="text-right space-y-0.5">
          <p className="font-bold text-primary">{fmtOre(g.ore)}</p>
          {g.oreSpostamento > 0 && (
            <p className="text-[10px] text-orange-600 font-medium">+{fmtOre(g.oreSpostamento)} spost.</p>
          )}
          {!g.completo && <Badge variant="secondary" className="text-[9px]">In corso</Badge>}
        </div>
      </button>

      {aperto && (
        <div className="space-y-1">
          {g.timbri.map((t) => {
            const cfg = STEP_CONFIG[t.tipo_evento] || {};
            const Icon = cfg.icon || Clock;
            return (
              <div key={t.id} className="space-y-0.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{cfg.label || t.tipo_evento}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{format(new Date(t.data_ora), "HH:mm", { locale: it })}</span>
                    {t.in_cantiere === false && (
                      <span className="inline-flex items-center gap-0.5 text-amber-600 text-[10px] font-medium" title="Timbratura fuori cantiere">
                        <AlertTriangle className="w-3 h-3" />
                        {t.distanza_metri != null
                          ? `${(t.distanza_metri / 1000).toFixed(t.distanza_metri < 1000 ? 2 : 1)} km`
                          : "Fuori"}
                      </span>
                    )}
                    {canEdit && (
                      <div className="flex items-center gap-1 ml-1">
                        <button onClick={() => onEdit?.(t)} className="p-1 rounded hover:bg-accent" title="Modifica"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                        <button onClick={() => onDelete?.(t)} className="p-1 rounded hover:bg-destructive/10" title="Elimina"><Trash2 className="w-3 h-3 text-destructive" /></button>
                      </div>
                    )}
                  </div>
                </div>
                {t.nota && (
                  <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground pl-5">
                    <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="italic break-words">{t.nota}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {aperto && g.oreSpostamento > 0 && (
        <div className="flex justify-between text-xs pt-2 border-t border-dashed border-border">
          <span className="text-muted-foreground">Totale cantiere (lav. + spost.)</span>
          <span className="font-semibold text-primary">{fmtOre(g.ore + g.oreSpostamento)}</span>
        </div>
      )}
    </Card>
  );
}