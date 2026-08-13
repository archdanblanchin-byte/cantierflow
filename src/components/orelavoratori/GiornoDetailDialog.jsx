import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Route, Clock, Truck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { TRASFERTA_CONFIG, fmtOre } from "@/lib/timbratureUtils";
import { formatDataBreve } from "@/lib/oreLavoratoriUtils";

export default function GiornoDetailDialog({ open, onOpenChange, data, dettaglio, trasferta, collaboratoreNome }) {
  const cantieri = dettaglio?.cantieri || [];
  const spostamenti = dettaglio?.spostamenti || [];
  const oreTotali = dettaglio?.oreTotali || 0;
  const oreCantieri = dettaglio?.oreCantieri || 0;
  const oreSpostamenti = dettaglio?.oreSpostamenti || 0;
  const note = dettaglio?.note || [];
  const cfg = trasferta?.tipo_trasferta ? TRASFERTA_CONFIG[trasferta.tipo_trasferta] : null;
  const cfgAndata = trasferta?.fascia_andata ? TRASFERTA_CONFIG[trasferta.fascia_andata] : null;
  const cfgRitorno = trasferta?.fascia_ritorno ? TRASFERTA_CONFIG[trasferta.fascia_ritorno] : null;
  const split = trasferta?.fascia_andata && trasferta?.fascia_ritorno && trasferta.fascia_andata !== trasferta.fascia_ritorno;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-primary" />
            {data ? formatDataBreve(data) : ""}
          </DialogTitle>
          <p className="text-xs text-muted-foreground -mt-1">{collaboratoreNome}</p>
        </DialogHeader>

        {/* Totale giornata */}
        <Card className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Totale giornata</p>
            <p className="text-xl font-bold text-primary">{fmtOre(oreTotali)}</p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
            <p>Cantieri: <span className="font-semibold text-foreground">{fmtOre(oreCantieri)}</span></p>
            <p>Spostamenti: <span className="font-semibold text-foreground">{fmtOre(oreSpostamenti)}</span></p>
          </div>
        </Card>

        {/* Cantieri */}
        {cantieri.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Cantieri
            </p>
            {cantieri.map((c, i) => (
              <Card key={c.id || c.nome || i} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{c.nome}</p>
                    {c.ingresso && c.uscita ? (
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(c.ingresso.data_ora), "HH:mm", { locale: it })}
                        {" → "}
                        {format(new Date(c.uscita.data_ora), "HH:mm", { locale: it })}
                      </p>
                    ) : c.stato === "bozza" ? (
                      <p className="text-[11px] text-amber-600">rapportino in bozza</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">da rapportino</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.stato === "bozza" && <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">bozza</Badge>}
                    <span className="text-sm font-bold text-primary">{fmtOre(c.ore)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Spostamenti */}
        {spostamenti.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-orange-600" /> Spostamenti
            </p>
            {spostamenti.map((s, i) => (
              <Card key={s.id} className="p-3 border-orange-200 bg-orange-50/30">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="text-orange-600">#{i + 1}</span>{" "}
                      {s.destinazione ? `→ ${s.destinazione}` : "In corso"}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>{format(s.ora, "HH:mm", { locale: it })}</span>
                      {s.durata > 0 && <span>· {fmtOre(s.durata)}</span>}
                      {s.mezzo_proprio && <span className="flex items-center gap-0.5"><Truck className="w-3 h-3" />mezzo proprio</span>}
                    </p>
                  </div>
                  {s.km > 0 && (
                    <Badge variant="outline" className="text-orange-700 border-orange-300 text-[10px]">{s.km} km</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Trasferta */}
        {trasferta && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Route className="w-3.5 h-3.5" /> Trasferta
            </p>
            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Giornata (media andata+ritorno)</span>
                {cfg ? (
                  <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
              {split && (
                <div className="rounded-md bg-primary/10 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Combinazione</p>
                  <p className="text-sm font-bold text-primary">{trasferta.label || `½ ${trasferta.fascia_andata} + ½ ${trasferta.fascia_ritorno}`}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[9px] text-muted-foreground uppercase">Andata</p>
                  <p className="text-sm font-bold">{trasferta.km_andata ?? 0} km</p>
                  {cfgAndata ? (
                    <Badge variant="outline" className={`mt-1 text-[9px] ${cfgAndata.color}`}>{cfgAndata.label}</Badge>
                  ) : <p className="text-[9px] text-muted-foreground mt-1">—</p>}
                  <p className="text-[9px] text-muted-foreground truncate mt-1">{trasferta.primo_cantiere_nome || "—"}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[9px] text-muted-foreground uppercase">Ritorno</p>
                  <p className="text-sm font-bold">{trasferta.km_ritorno ?? 0} km</p>
                  {cfgRitorno ? (
                    <Badge variant="outline" className={`mt-1 text-[9px] ${cfgRitorno.color}`}>{cfgRitorno.label}</Badge>
                  ) : <p className="text-[9px] text-muted-foreground mt-1">—</p>}
                  <p className="text-[9px] text-muted-foreground truncate mt-1">{trasferta.ultimo_cantiere_nome || "—"}</p>
                </div>
                <div className="rounded-md bg-primary/10 p-2 flex flex-col">
                  <p className="text-[9px] text-muted-foreground uppercase">Totali</p>
                  <p className="text-sm font-bold text-primary flex-1 flex items-center">{trasferta.km_totali ?? 0} km</p>
                  {trasferta.confermata && (
                    <Badge className="mt-1 text-[9px] bg-emerald-600">confermata</Badge>
                  )}
                </div>
              </div>
              {trasferta.mezzo_proprio && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Spostamento con mezzo proprio
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Note / Anomalie */}
        {note.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Note / Anomalie
            </p>
            {note.map((n, i) => (
              <Card key={i} className="p-3 border-amber-200 bg-amber-50/40">
                {n.cantiere && <p className="text-[11px] text-muted-foreground mb-0.5">{n.cantiere}</p>}
                <p className="text-sm text-amber-900">{n.testo}</p>
              </Card>
            ))}
          </div>
        )}

        {cantieri.length === 0 && spostamenti.length === 0 && !trasferta && note.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">Nessun dato per questa giornata</p>
        )}
      </DialogContent>
    </Dialog>
  );
}