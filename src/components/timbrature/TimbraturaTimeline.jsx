import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MapPin, Clock, AlertTriangle, Navigation, Pencil, Trash2 } from "lucide-react";
import { STEP_CONFIG, arrotondaQuarti, fmtOre } from "@/lib/timbratureUtils";

export default function TimbraturaTimeline({ timbrature, isAdmin = false, onEdit, onDelete }) {
  const timbratureOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

  if (timbratureOrd.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nessuna timbratura oggi</p>
      </Card>
    );
  }

  const perCantiere = {};
  const spostamenti = [];
  timbratureOrd.forEach(t => {
    if (t.tipo_evento === "spostamento") {
      spostamenti.push(t);
    } else if (t.cantiere_id) {
      if (!perCantiere[t.cantiere_id]) perCantiere[t.cantiere_id] = { nome: t.cantiere_nome, timbri: [] };
      perCantiere[t.cantiere_id].timbri.push(t);
    }
  });

  const gruppi = Object.entries(perCantiere).map(([id, g]) => {
    const tIng = g.timbri.find(t => t.tipo_evento === "ingresso");
    const tUsc = g.timbri.find(t => t.tipo_evento === "uscita");
    let ore = 0;
    if (tIng && tUsc) {
      let totale = new Date(tUsc.data_ora) - new Date(tIng.data_ora);
      const pauseInizio = g.timbri.filter(t => t.tipo_evento === "pausa_inizio");
      const pauseFine = g.timbri.filter(t => t.tipo_evento === "pausa_fine");
      const numPause = Math.min(pauseInizio.length, pauseFine.length);
      for (let i = 0; i < numPause; i++) {
        totale -= new Date(pauseFine[i].data_ora) - new Date(pauseInizio[i].data_ora);
      }
      ore = arrotondaQuarti(totale);
    }
    return { id, ...g, ore, completo: !!tUsc };
  });

  const oreTotali = gruppi.reduce((s, g) => s + g.ore, 0);
  const kmTotali = spostamenti.reduce((s, t) => s + (t.km_spostamento || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Totale giornata</p>
          <p className="text-2xl font-bold text-primary">{fmtOre(oreTotali)}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-xs text-muted-foreground">{gruppi.length} cantiere/i</p>
          {spostamenti.length > 0 && (
            <p className="text-xs text-orange-600 font-medium flex items-center gap-1 justify-end">
              <Navigation className="w-3 h-3" />
              {kmTotali.toFixed(1)} km in {spostamenti.length} spost.
            </p>
          )}
        </div>
      </Card>

      {spostamenti.length > 0 && (
        <Card className="p-4 space-y-2 border-orange-200 bg-orange-50/30">
          <div className="flex items-center gap-2 border-b border-orange-200 pb-2">
            <Navigation className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-orange-900">Spostamenti</span>
          </div>
          {spostamenti.map((t, i) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-orange-600 font-medium">#{i + 1}</span>
                <span className="text-muted-foreground">
                  {t.cantiere_destinazione_nome ? `→ ${t.cantiere_destinazione_nome}` : "In corso"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {t.km_spostamento != null && (
                  <Badge variant="outline" className="text-orange-700 border-orange-300">{t.km_spostamento} km</Badge>
                )}
                <span className="text-muted-foreground">{format(new Date(t.data_ora), "HH:mm", { locale: it })}</span>
                {isAdmin && (
                  <div className="flex items-center gap-1 ml-1">
                    <button onClick={() => onEdit?.(t)} className="p-1 rounded hover:bg-accent" title="Modifica"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                    <button onClick={() => onDelete?.(t)} className="p-1 rounded hover:bg-destructive/10" title="Elimina"><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      {gruppi.map((g) => (
        <Card key={g.id} className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-semibold">{g.nome}</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">{fmtOre(g.ore)}</p>
              {!g.completo && <Badge variant="secondary" className="text-[9px]">In corso</Badge>}
            </div>
          </div>
          <div className="space-y-1">
            {g.timbri.map(t => {
              const cfg = STEP_CONFIG[t.tipo_evento] || {};
              const Icon = cfg.icon || Clock;
              return (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{cfg.label || t.tipo_evento}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{format(new Date(t.data_ora), "HH:mm", { locale: it })}</span>
                    {t.in_cantiere === false && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    {isAdmin && (
                      <div className="flex items-center gap-1 ml-1">
                        <button onClick={() => onEdit?.(t)} className="p-1 rounded hover:bg-accent" title="Modifica"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                        <button onClick={() => onDelete?.(t)} className="p-1 rounded hover:bg-destructive/10" title="Elimina"><Trash2 className="w-3 h-3 text-destructive" /></button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}