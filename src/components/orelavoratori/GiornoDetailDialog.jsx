import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Route, Clock, Truck, AlertTriangle, Home, Warehouse, CalendarDays, NotebookPen } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { TRASFERTA_CONFIG, STEP_CONFIG, fmtOre } from "@/lib/timbratureUtils";
import { formatDataBreve } from "@/lib/oreLavoratoriUtils";
import { fmtOrePermesso } from "@/lib/riepilogoMensile";
import ModificaTrasfertaGiorno from "@/components/orelavoratori/ModificaTrasfertaGiorno";

export default function GiornoDetailDialog({
  open,
  onOpenChange,
  data,
  dettaglio,
  trasferta,
  collaboratoreNome,
  onApriCalendario,
  permesso,
  correzioneTrasferta,
  timbrature = [],
  notaGiornata = null,
}) {
  const [mostraTimbrature, setMostraTimbrature] = useState(false);
  const timbratureOrd = (timbrature || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const cantieri = dettaglio?.cantieri || [];
  const spostamenti = dettaglio?.spostamenti || [];
  const oreTotali = dettaglio?.oreTotali || 0;
  const oreCantieri = dettaglio?.oreCantieri || 0;
  const oreSpostamenti = dettaglio?.oreSpostamentiTot || dettaglio?.oreSpostamenti || 0;
  const note = dettaglio?.note || [];
  const luoghiLavoro = dettaglio?.luoghiLavoro || [];
  const cfg = trasferta?.tipo_trasferta ? TRASFERTA_CONFIG[trasferta.tipo_trasferta] : null;
  const inSede = !!trasferta?.nessuna_trasferta;
  const sopraOtto = !!trasferta?.sopra_otto;
  const minutiMancanti = trasferta?.minuti_mancanti || 0;
  const kmDeficit = trasferta?.km_deficit || 0;
  const nCantieri = trasferta?.n_cantieri || cantieri.length || 1;

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
            <p>Lavorazione: <span className="font-semibold text-foreground">{fmtOre(oreCantieri)}</span></p>
            <p>Spostamenti: <span className="font-semibold text-foreground">{fmtOre(oreSpostamenti)}</span></p>
          </div>
        </Card>

        {/* Permesso / ferie dal calendario Google */}
        {permesso && (
          <Card
            className={`p-3 flex items-center gap-2 ${
              permesso.tipo === "ferie"
                ? "border-violet-200 bg-violet-50/40 dark:bg-violet-900/10"
                : "border-teal-200 bg-teal-50/40 dark:bg-teal-900/10"
            }`}
          >
            <CalendarDays className="w-4 h-4 shrink-0 text-muted-foreground" />
            <p className="text-sm font-semibold">
              {permesso.tipo === "ferie" ? "Ferie" : "Permesso"}
              {permesso.ore ? <span className="font-bold"> · {fmtOrePermesso(permesso.ore)}</span> : null}
              <span className="font-normal text-muted-foreground"> · dal calendario</span>
            </p>
          </Card>
        )}

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
            {dettaglio?.classificazioneSpostamenti?.totSpostamento > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Tempo totale spostamenti: {fmtOre(dettaglio.classificazioneSpostamenti.totSpostamento)}.
                I km sono sempre sommati alla trasferta (vedi riepilogo sotto).
              </p>
            )}
          </div>
        )}

        {/* Luoghi di lavoro fuori cantiere (Capannone, officina, ...) */}
        {luoghiLavoro.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5 text-slate-500" /> Lavoro fuori cantiere
            </p>
            <Card className="p-3 border-slate-200 bg-slate-50/60 space-y-1">
              {luoghiLavoro.map((l, i) => (
                <p key={i} className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {l}
                </p>
              ))}
              <p className="text-[10px] text-muted-foreground pt-0.5">
                Giornata timbrata in questi luoghi: la trasferta è calcolata sulla posizione del timbro, non sul cantiere.
              </p>
            </Card>
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
                <span className="text-xs text-muted-foreground">Fascia (su km totali ÷ 2)</span>
                {inSede ? (
                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">In sede</Badge>
                ) : cfg ? (
                  <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                ) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
              {inSede && (
                <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <p className="text-[11px] font-semibold text-slate-700">
                    {luoghiLavoro.length
                      ? `Nessuna trasferta – lavoro a ${luoghiLavoro.join(", ")}`
                      : "Nessuna trasferta – lavoro in sede"}
                  </p>
                </div>
              )}
              {!inSede && (
                <>
                  {/* Andata */}
                  <div className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase">Andata</p>
                      <p className="text-[11px] font-medium truncate">
                        {trasferta.partenza_da_sede
                          ? <span className="text-slate-500">dalla sede</span>
                          : `→ ${trasferta.primo_cantiere_nome || "—"}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-bold">{trasferta.km_andata ?? 0} km</span>
                      {trasferta.partenza_da_sede && (
                        <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600 border-slate-300">sede</Badge>
                      )}
                    </div>
                  </div>
                  {/* Ritorno */}
                  <div className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase">Ritorno</p>
                      <p className="text-[11px] font-medium truncate">
                        {trasferta.rientro_in_sede
                          ? <span className="text-slate-500">in sede</span>
                          : `${trasferta.ultimo_cantiere_nome || "—"} →`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-bold">{trasferta.km_ritorno ?? 0} km</span>
                      {trasferta.rientro_in_sede && (
                        <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600 border-slate-300">sede</Badge>
                      )}
                    </div>
                  </div>
                  {/* Spostamenti intermedi */}
                  {(trasferta.km_spostamenti ?? 0) > 0 && (
                    <div className="flex items-center justify-between rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-2.5 py-1.5">
                      <div className="min-w-0">
                        <p className="text-[9px] text-orange-700 dark:text-orange-300 uppercase">Spostamenti intermedi</p>
                        <p className="text-[11px] text-muted-foreground">
                          {spostamenti.length} tratta/e
                          {trasferta.minuti_spostamento ? ` · ${fmtOre(trasferta.minuti_spostamento / 60)}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{trasferta.km_spostamenti} km</span>
                    </div>
                  )}
                  {/* Totale km */}
                  <div className="flex items-center justify-between rounded-md bg-primary/10 px-2.5 py-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Totale km</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(trasferta.km_andata ?? 0)} + {trasferta.km_spostamenti ?? 0} + {(trasferta.km_ritorno ?? 0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{trasferta.km_totali ?? 0} km</span>
                      {trasferta.confermata && (
                        <Badge className="text-[9px] bg-emerald-600">confermata</Badge>
                      )}
                    </div>
                  </div>
                  {/* Riconosciuti e fascia */}
                  {trasferta.km_riconosciuti != null && (
                    <div className="rounded-md bg-muted/50 px-2.5 py-1.5 space-y-0.5">
                      <p className="text-[11px]">
                        Trasferta riconosciuta: <span className="font-semibold">{trasferta.km_riconosciuti} km</span>
                        {" "}(totali ÷ 2)
                        {cfg && <> → <span className="font-bold text-primary">{cfg.label}</span></>}
                      </p>
                    </div>
                  )}
                  {/* Spiegazione regola delle 8 ore */}
                  {sopraOtto
                    ? (minutiMancanti === 0 && (trasferta.km_spostamenti ?? 0) > 0 && (
                      <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5">
                        <p className="text-[10px] text-emerald-800 dark:text-emerald-200 font-medium">
                          Oltre le 8 ore di cantiere: ore e km degli spostamenti, andata e ritorno restano invariati e concorrono tutti alla trasferta.
                        </p>
                      </div>
                    ))
                    : minutiMancanti > 0 && (
                      <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 space-y-1">
                        <p className="text-[10px] text-amber-800 dark:text-amber-200 font-medium">
                          Mancano <strong>{minutiMancanti} min</strong> alle 8 ore di cantiere.
                        </p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-300">
                          <strong>−{kmDeficit} km</strong> e <strong>{minutiMancanti} min</strong> sono stati tolti dagli spostamenti e aggiunti alle lavorazioni, divisi tra i {nCantieri} cantieri della giornata.
                        </p>
                      </div>
                    )}
                </>
              )}
              {trasferta.mezzo_proprio && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Spostamento con mezzo proprio
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Correzione manuale della trasferta (timbrature e rapportini restano invariati) */}
        {correzioneTrasferta && <ModificaTrasfertaGiorno key={`${correzioneTrasferta.dataKey}-${correzioneTrasferta.collaboratore?.id}`} {...correzioneTrasferta} />}

        {/* Nota della giornata scritta dal dipendente */}
        {(notaGiornata?.testo || notaGiornata?.dinamica) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <NotebookPen className="w-3.5 h-3.5 text-primary" /> Note della giornata
            </p>
            <Card className="p-3 border-primary/30 bg-primary/5 space-y-1.5">
              {notaGiornata.dinamica && (
                <p className="text-[11px] font-medium text-primary">Dinamica: {notaGiornata.dinamica}</p>
              )}
              {notaGiornata.testo && (
                <p className="text-sm whitespace-pre-wrap">{notaGiornata.testo}</p>
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

        {cantieri.length === 0 && spostamenti.length === 0 && !trasferta && !permesso && note.length === 0 && luoghiLavoro.length === 0 && !notaGiornata?.testo && !notaGiornata?.dinamica && (
          <p className="text-center text-sm text-muted-foreground py-6">Nessun dato per questa giornata</p>
        )}

        {/* Timbrature della giornata */}
        {timbratureOrd.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMostraTimbrature((v) => !v)}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              {mostraTimbrature ? "Nascondi timbrature" : `Vedi timbrature del giorno (${timbratureOrd.length})`}
            </Button>
            {mostraTimbrature && (
              <div className="space-y-1.5">
                {timbratureOrd.map((t) => {
                  const cfgT = STEP_CONFIG[t.tipo_evento] || {};
                  const Icona = cfgT.icon || Clock;
                  return (
                    <div key={t.id} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                      <Icona className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{cfgT.label || t.tipo_evento}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {format(new Date(t.data_ora), "HH:mm", { locale: it })} · {t.cantiere_nome || "—"}
                          {t.luogo_lavoro ? ` · ${t.luogo_lavoro}` : ""}
                        </p>
                        {t.nota && <p className="text-[10px] italic text-primary truncate">📝 {t.nota}</p>}
                      </div>
                      {t.distanza_metri != null && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {(t.distanza_metri / 1000).toFixed(t.distanza_metri < 1000 ? 2 : 1)} km
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {onApriCalendario && (
          <Button variant="outline" className="w-full" onClick={onApriCalendario}>
            <CalendarDays className="w-4 h-4 mr-1.5" /> Apri nel calendario di {collaboratoreNome}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}