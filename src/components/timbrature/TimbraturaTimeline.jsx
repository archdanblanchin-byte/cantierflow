import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Clock, Navigation, Pencil, Trash2, StickyNote } from "lucide-react";
import { STEP_CONFIG, fmtOre } from "@/lib/timbratureUtils";
import { calcolaOrePerCantiere } from "@/lib/rapportiniFromTimbrature";
import SequenzaGiornata from "@/components/timbrature/SequenzaGiornata";
import CantiereTimbraturaCard from "@/components/timbrature/CantiereTimbraturaCard";

export default function TimbraturaTimeline({ timbrature, isAdmin = false, canEdit = isAdmin, onEdit, onDelete }) {
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

  // Ore canoniche per cantiere (lo spostamento conta come chiusura del cantiere)
  const oreMap = {};
  calcolaOrePerCantiere(timbratureOrd).forEach((c) => { oreMap[c.cantiere_id] = { ore: c.ore, spo: c.ore_spostamento || 0 }; });

  const gruppi = Object.entries(perCantiere).map(([id, g]) => {
    const tIng = g.timbri.find(t => t.tipo_evento === "ingresso");
    const tUsc = g.timbri.find(t => t.tipo_evento === "uscita");
    // Lo spostamento chiude il cantiere precedente: cerca lo spostamento di questo cantiere
    const tSpost = spostamenti.find(t => t.cantiere_id === id);
    const hasClose = !!(tUsc || tSpost);
    // Solo se la sessione è chiusa (uscita o spostamento) mostriamo le ore; se aperta resta "In corso"
    const ore = hasClose ? (oreMap[id]?.ore || 0) : 0;
    const oreSpostamento = hasClose ? (oreMap[id]?.spo || 0) : 0;
    return { id, ...g, ore, oreSpostamento, completo: hasClose };
  });

  const oreTotali = gruppi.reduce((s, g) => s + g.ore, 0);
  const oreSpostTotali = gruppi.reduce((s, g) => s + (g.oreSpostamento || 0), 0);
  const kmTotali = spostamenti.reduce((s, t) => s + (t.km_spostamento || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Totale giornata</p>
          <p className="text-2xl font-bold text-primary">{fmtOre(oreTotali)}</p>
          {oreSpostTotali > 0 && (
            <p className="text-[11px] text-orange-600 font-medium">+{fmtOre(oreSpostTotali)} spostamento</p>
          )}
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

      <SequenzaGiornata timbrature={timbratureOrd} />

      {spostamenti.length > 0 && (
        <Card className="p-4 space-y-2 border-orange-200 bg-orange-50/30">
          <div className="flex items-center gap-2 border-b border-orange-200 pb-2">
            <Navigation className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-orange-900">Spostamenti</span>
          </div>
          {spostamenti.map((t, i) => (
            <div key={t.id} className="space-y-0.5">
            <div className="flex items-center justify-between text-sm">
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
                {canEdit && (
                  <div className="flex items-center gap-1 ml-1">
                    <button onClick={() => onEdit?.(t)} className="p-1 rounded hover:bg-accent" title="Modifica"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                    <button onClick={() => onDelete?.(t)} className="p-1 rounded hover:bg-destructive/10" title="Elimina"><Trash2 className="w-3 h-3 text-destructive" /></button>
                  </div>
                )}
              </div>
            </div>
            {t.nota && (
              <div className="flex items-start gap-1.5 text-[11px] text-orange-900/80 pl-5">
                <StickyNote className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="italic break-words">{t.nota}</span>
              </div>
            )}
            </div>
          ))}
        </Card>
      )}

      {gruppi.map((g) => (
        <CantiereTimbraturaCard key={g.id} g={g} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}