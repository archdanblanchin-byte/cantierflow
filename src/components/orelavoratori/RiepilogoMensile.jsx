import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, HardHat, RefreshCw } from "lucide-react";
import { fmtOre, TRASFERTA_CONFIG } from "@/lib/timbratureUtils";
import { cantieriDelMese, estraiRiepilogoCantiere, fmtOreBreve, fmtOrePermesso } from "@/lib/riepilogoMensile";
import { esportaRiepilogoMensile } from "@/lib/riepilogoExcel";
import DettaglioCantiereDialog from "@/components/orelavoratori/DettaglioCantiereDialog";

const FINE_SETTIMANA = [0, 6];
const COLORE_SEDE = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
const COLORE_FERIE = "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200";
const COLORE_PERMESSO = "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-200";
// Sigla mostrata nella cella: F = ferie, P = permesso
const SIGLA_PERMESSO = { ferie: "F", permesso: "P" };
// Sigla con le ore lette dal titolo del calendario: "P 4h", "F", ...
const siglaConOre = (cella) => {
  const s = SIGLA_PERMESSO[cella?.permesso] || "";
  if (!s) return "";
  const ore = fmtOrePermesso(cella?.permessoOre);
  return ore ? `${s} ${ore}` : s;
};

/**
 * Foglio riepilogativo del mese: dipendenti in riga, giorni in colonna.
 * Il colore di ogni cella indica la trasferta del giorno (grigio = in sede,
 * T0–T4 = fascia di trasferta). Tocca una cella per il dettaglio del giorno.
 */
export default function RiepilogoMensile({
  giorni,
  righe,
  totaliGiorno,
  mese,
  onGiornoClick,
  onAggiornaPermessi,
  loadingPermessi,
}) {
  const [cantiereAperto, setCantiereAperto] = useState(null);
  const totaleSquadra = righe.reduce((s, r) => s + (r.totOre || 0), 0);
  const cantieri = cantieriDelMese({ righe });

  const dettaglioCantiere = cantiereAperto
    ? estraiRiepilogoCantiere({ giorni, righe }, cantiereAperto)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cantieri del mese
        </span>
        {cantieri.length === 0 ? (
          <span className="text-[11px] text-muted-foreground">nessuno</span>
        ) : (
          cantieri.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCantiereAperto(n)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-[11px] hover:bg-accent/50 transition-colors"
            >
              <HardHat className="w-3 h-3 text-primary shrink-0" />
              <span className="max-w-[180px] truncate">{n}</span>
            </button>
          ))
        )}
        {onAggiornaPermessi && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={onAggiornaPermessi}
            disabled={loadingPermessi}
            title="Rileggi permessi e ferie dal calendario Google"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingPermessi ? "animate-spin" : ""}`} />
            {loadingPermessi ? "Aggiorno..." : "Permessi"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={onAggiornaPermessi ? "" : "ml-auto"}
          onClick={() => esportaRiepilogoMensile({ giorni, righe }, mese)}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" /> Excel
        </Button>
      </div>

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
              <th className="sticky top-0 z-20 w-16 border-b bg-muted px-1 py-1 text-center">Trasf.</th>
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
                  const cfg = cella?.fascia ? TRASFERTA_CONFIG[cella.fascia] : null;
                  const permesso = cella?.permesso || null;
                  const haLavoro = !!cella && ((cella.ore || 0) > 0 || !!cella.trasferta);
                  const vuota = !haLavoro && !permesso;
                  const colore = !haLavoro && permesso
                    ? (permesso === "ferie" ? COLORE_FERIE : COLORE_PERMESSO)
                    : cella?.inSede
                    ? COLORE_SEDE
                    : cfg
                    ? cfg.color
                    : "";
                  return (
                    <td
                      key={key}
                      onClick={!haLavoro && !permesso ? undefined : () => onGiornoClick(r.collaboratore, key)}
                      title={
                        cella
                          ? [
                              cella.cantieri.join(", "),
                              cella.ore > 0 ? fmtOre(cella.ore) : "",
                              cella.luoghi.length ? `Lavoro a ${cella.luoghi.join(", ")}` : "",
                              cella.inSede ? "In sede" : cfg ? `Trasferta ${cella.fascia}` : "",
                              permesso
                                ? `${permesso === "ferie" ? "Ferie" : "Permesso"}${
                                    cella.permessoOre ? ` ${fmtOrePermesso(cella.permessoOre)}` : ""
                                  }`
                                : "",
                              cella.nota || "",
                            ]
                              .filter(Boolean)
                              .join(" · ")
                          : ""
                      }
                      className={`border-b border-r p-0 text-center align-middle ${colore} ${
                        haLavoro || permesso
                          ? "cursor-pointer hover:brightness-95"
                          : !permesso && weekend
                          ? "bg-muted/50"
                          : ""
                      }`}
                    >
                      <div className="w-12 h-10 flex flex-col items-center justify-center leading-tight">
                        {vuota ? (
                          <span className="text-[10px] text-muted-foreground/60">/</span>
                        ) : !haLavoro ? (
                          <span className="text-[11px] font-bold">{siglaConOre(cella)}</span>
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
                            {permesso && (
                              <span className="text-[8px] font-semibold opacity-80">{siglaConOre(cella)}</span>
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
                <td className="border-b text-center">
                  <div className="leading-tight">
                    {r.nTrasferte > 0 ? (
                      <>
                        <div className="font-semibold">{r.nTrasferte} gg</div>
                        <div className="text-[8px] text-muted-foreground">{r.totKm.toFixed(0)} km</div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {r.totPermessoOre > 0 && (
                      <div className="text-[8px] font-semibold text-teal-700 dark:text-teal-300">
                        P {fmtOrePermesso(r.totPermessoOre)}
                      </div>
                    )}
                    {r.giorniFerie > 0 && (
                      <div className="text-[8px] font-semibold text-violet-700 dark:text-violet-300">
                        F {r.giorniFerie} gg
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr>
              <th className="sticky left-0 bottom-0 z-30 bg-muted border-r px-2 py-1 text-left">Totale giorno</th>
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
              <td className="sticky bottom-0 z-20 bg-muted" />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider text-[10px]">Legenda</span>
        <span className="inline-flex items-center gap-1">
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${COLORE_SEDE}`}>sede</Badge>
          nessuna trasferta
        </span>
        <span className="inline-flex items-center gap-1">
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${COLORE_FERIE}`}>F</Badge>
          ferie
        </span>
        <span className="inline-flex items-center gap-1">
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${COLORE_PERMESSO}`}>P</Badge>
          permesso
        </span>
        <span className="inline-flex items-center gap-1">
          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${COLORE_PERMESSO}`}>P 4h</Badge>
          ore di permesso lette dal titolo del calendario
        </span>
        {["T0", "T1", "T2", "T3", "T4"].map((f) => (
          <span key={f} className="inline-flex items-center gap-1">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${TRASFERTA_CONFIG[f].color}`}>
              {TRASFERTA_CONFIG[f].label}
            </Badge>
          </span>
        ))}
        <span>Tocca una cella per il dettaglio del giorno</span>
      </div>

      <DettaglioCantiereDialog
        open={!!cantiereAperto}
        onOpenChange={(v) => !v && setCantiereAperto(null)}
        dettaglio={dettaglioCantiere}
        mese={mese}
      />
    </div>
  );
}