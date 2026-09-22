import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { fmtOre, TRASFERTA_CONFIG } from "@/lib/timbratureUtils";
import { fmtOreBreve } from "@/lib/riepilogoMensile";

const FINE_SETTIMANA = [0, 6];

/**
 * Foglio riepilogativo del mese: dipendenti in riga, giorni in colonna.
 * Ogni cella è colorata con il colore del cantiere e mostra ore, fascia
 * trasferta ed eventuali luoghi di lavoro fuori cantiere.
 */
export default function RiepilogoMensile({ giorni, righe, totaliGiorno, colori }) {
  const totaleSquadra = righe.reduce((s, r) => s + (r.totOre || 0), 0);
  const cantieriInUso = Object.keys(colori);

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-lg border bg-card max-h-[68vh]">
        <table className="border-collapse text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-card border-b border-r px-2 py-1 text-left min-w-[130px]">
                Dipendente
              </th>
              {giorni.map((d) => {
                const weekend = FINE_SETTIMANA.includes(d.getDay());
                return (
                  <th
                    key={format(d, "yyyy-MM-dd")}
                    className={`sticky top-0 z-20 w-12 border-b border-r px-0 py-1 text-center font-semibold ${
                      weekend ? "bg-muted text-muted-foreground" : "bg-card"
                    }`}
                  >
                    <div>{format(d, "d")}</div>
                    <div className="text-[8px] uppercase font-normal text-muted-foreground">
                      {format(d, "EEEEEE", { locale: it })}
                    </div>
                  </th>
                );
              })}
              <th className="sticky top-0 z-20 w-16 border-b border-r bg-primary/10 px-1 py-1 text-center">Tot ore</th>
              <th className="sticky top-0 z-20 w-16 border-b border-r bg-muted px-1 py-1 text-center">Spost.</th>
              <th className="sticky top-0 z-20 w-16 border-b border-r bg-muted px-1 py-1 text-center">Trasf.</th>
              <th className="sticky top-0 z-20 w-40 border-b px-2 py-1 text-left">Cantieri</th>
            </tr>
          </thead>

          <tbody>
            {righe.map((r) => (
              <tr key={r.collaboratore.id} className="hover:bg-accent/30">
                <th className="sticky left-0 z-10 bg-card border-b border-r px-2 py-1 text-left font-medium align-middle">
                  <div className="truncate max-w-[118px]">{r.collaboratore.nome}</div>
                  <div className="text-[8px] font-normal text-muted-foreground">{r.giorniLavorati} gg lavorati</div>
                </th>

                {giorni.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const cella = r.celle[key];
                  const weekend = FINE_SETTIMANA.includes(d.getDay());
                  const colore = cella?.cantiere ? colori[cella.cantiere] : null;
                  const cfg = cella?.fascia ? TRASFERTA_CONFIG[cella.fascia] : null;
                  const vuota = !cella || (cella.ore <= 0 && !cella.trasferta);
                  return (
                    <td
                      key={key}
                      title={
                        cella
                          ? [
                              cella.cantiere || "",
                              cella.ore > 0 ? fmtOre(cella.ore) : "",
                              cella.luoghi.length ? `Lavoro a ${cella.luoghi.join(", ")}` : "",
                              cella.inSede ? "In sede" : cfg ? `Trasferta ${cella.fascia}` : "",
                              cella.nota || "",
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          : ""
                      }
                      className={`border-b border-r p-0 text-center align-middle ${
                        colore ? colore.cella : vuota ? (weekend ? "bg-muted/50" : "") : "bg-muted/30"
                      }`}
                    >
                      <div className="w-12 h-10 flex flex-col items-center justify-center leading-tight">
                        {vuota ? (
                          <span className="text-[10px] text-muted-foreground/60">/</span>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold">{fmtOreBreve(cella.ore) || "—"}</span>
                            {cella.inSede && <span className="text-[8px] font-semibold opacity-80">sede</span>}
                            {!cella.inSede && cfg && (
                              <span className="text-[8px] font-semibold opacity-80">
                                {cfg.label}
                                {cella.trasferta.km_totali ? ` ${cella.trasferta.km_totali}km` : ""}
                              </span>
                            )}
                            {cella.luoghi.length > 0 && (
                              <span className="text-[8px] font-semibold opacity-80 truncate max-w-[44px]">
                                {cella.luoghi[0]}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}

                <td className="border-b border-r text-center font-bold bg-primary/5">{fmtOreBreve(r.totOre) || "—"}</td>
                <td className="border-b border-r text-center text-orange-700 dark:text-orange-400">
                  {fmtOreBreve(r.totSpost) || "—"}
                </td>
                <td className="border-b border-r text-center">
                  {r.nTrasferte > 0 ? (
                    <div className="leading-tight">
                      <div className="font-semibold">{r.nTrasferte} gg</div>
                      <div className="text-[8px] text-muted-foreground">{r.totKm.toFixed(0)} km</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="border-b px-2 py-1 align-middle">
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 max-w-[150px]">
                    {r.cantieriUsati.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      r.cantieriUsati.map((n) => (
                        <span key={n} className="inline-flex items-center gap-1 truncate max-w-[140px]">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${colori[n]?.pallino || "bg-muted-foreground"}`} />
                          <span className="truncate">{n}</span>
                        </span>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th className="sticky left-0 bottom-0 z-30 bg-muted border-r px-2 py-1 text-left">
                Totale giorno
              </th>
              {giorni.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const ore = totaliGiorno[key] || 0;
                return (
                  <td
                    key={key}
                    className={`sticky bottom-0 z-20 border-r px-0 py-1 text-center font-semibold ${
                      ore > 0 ? "bg-muted" : "bg-muted/60 text-muted-foreground/60"
                    }`}
                  >
                    <div className="w-12 h-7 flex items-center justify-center">{ore > 0 ? fmtOreBreve(ore) : "/"}</div>
                  </td>
                );
              })}
              <td className="sticky bottom-0 z-20 border-r px-1 py-1 text-center font-bold bg-primary/20">
                {fmtOreBreve(totaleSquadra) || "—"}
              </td>
              <td className="sticky bottom-0 z-20 border-r bg-muted" />
              <td className="sticky bottom-0 z-20 border-r bg-muted" />
              <td className="sticky bottom-0 z-20 bg-muted" />
            </tr>
          </tfoot>
        </table>
      </div>

      {cantieriInUso.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-card px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cantieri</span>
          {cantieriInUso.map((n) => (
            <span key={n} className="inline-flex items-center gap-1.5 text-[11px]">
              <span className={`w-3 h-3 rounded-sm border ${colori[n]?.cella || ""}`} />
              {n}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-[10px]">Legenda</span>
        <span>Ogni colore = un cantiere</span>
        <span className="inline-flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600 border-slate-300">sede</Badge>
          nessuna trasferta
        </span>
        {["T0", "T1", "T2", "T3", "T4"].map((f) => (
          <span key={f} className="inline-flex items-center gap-1">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${TRASFERTA_CONFIG[f].color}`}>{f}</Badge>
          </span>
        ))}
      </div>
    </div>
  );
}