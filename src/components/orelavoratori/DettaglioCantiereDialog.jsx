import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, HardHat } from "lucide-react";
import { fmtOre } from "@/lib/timbratureUtils";
import { fmtOreBreve } from "@/lib/riepilogoMensile";
import { esportaRiepilogoCantiere } from "@/lib/riepilogoExcel";

const FINE_SETTIMANA = [0, 6];

/**
 * Ore lavorate su un singolo cantiere nel mese: una riga per dipendente,
 * una colonna per giorno, con il totale ore di ognuno.
 */
export default function DettaglioCantiereDialog({ open, onOpenChange, dettaglio, mese }) {
  if (!dettaglio) return null;
  const { cantiereNome, giorni, righe, totaliGiorno, totale } = dettaglio;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base pr-6">
            <HardHat className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">{cantiereNome}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground -mt-1 capitalize">
            Ore lavorate · {format(mese, "MMMM yyyy", { locale: it })} · {righe.length} persone · {fmtOre(totale)}
          </p>
        </DialogHeader>

        <div className="overflow-auto rounded-lg border max-h-[55vh]">
          <table className="border-collapse text-[10px] w-full">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-20 bg-card border-b border-r px-2 py-1 text-left min-w-[130px]">
                  Dipendente
                </th>
                {giorni.map((d) => {
                  const weekend = FINE_SETTIMANA.includes(d.getDay());
                  return (
                    <th
                      key={format(d, "yyyy-MM-dd")}
                      className={`sticky top-0 z-10 w-11 border-b border-r py-1 text-center font-semibold ${
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
                <th className="sticky top-0 z-10 w-16 border-b bg-primary/10 px-1 py-1 text-center">Tot ore</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.collaboratore.id} className="hover:bg-accent/30">
                  <th className="sticky left-0 z-10 bg-card border-b border-r px-2 py-1 text-left font-medium">
                    <div className="truncate max-w-[118px]">{r.collaboratore.nome}</div>
                    <div className="text-[8px] font-normal text-muted-foreground">{r.giorniLavorati} gg</div>
                  </th>
                  {giorni.map((d) => {
                    const key = format(d, "yyyy-MM-dd");
                    const ore = r.celle[key]?.ore || 0;
                    const weekend = FINE_SETTIMANA.includes(d.getDay());
                    return (
                      <td
                        key={key}
                        className={`border-b border-r p-0 text-center ${
                          ore > 0 ? "bg-primary/5 font-semibold" : weekend ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="w-11 h-9 flex items-center justify-center">
                          {ore > 0 ? fmtOreBreve(ore) : <span className="text-muted-foreground/60">/</span>}
                        </div>
                      </td>
                    );
                  })}
                  <td className="border-b text-center font-bold bg-primary/5">{fmtOreBreve(r.totOre) || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th className="sticky left-0 bottom-0 z-20 bg-muted border-r px-2 py-1 text-left">Totale giorno</th>
                {giorni.map((d) => {
                  const key = format(d, "yyyy-MM-dd");
                  const ore = totaliGiorno[key] || 0;
                  return (
                    <td key={key} className="sticky bottom-0 z-10 border-r bg-muted text-center font-semibold">
                      <div className="w-11 h-7 flex items-center justify-center">
                        {ore > 0 ? fmtOreBreve(ore) : <span className="text-muted-foreground/60">/</span>}
                      </div>
                    </td>
                  );
                })}
                <td className="sticky bottom-0 z-10 text-center font-bold bg-primary/20">{fmtOreBreve(totale) || "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <Button variant="outline" className="w-full" onClick={() => esportaRiepilogoCantiere(dettaglio, mese)}>
          <Download className="w-4 h-4 mr-1.5" /> Scarica Excel
        </Button>
      </DialogContent>
    </Dialog>
  );
}