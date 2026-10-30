import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Coffee, Navigation, Clock, Info } from "lucide-react";
import { fmtOre } from "@/lib/timbratureUtils";
import { calcolaOrePerCantiere } from "@/lib/rapportiniFromTimbrature";

const hhmm = (iso) => format(new Date(iso), "HH:mm", { locale: it });

const fmtDur = (min) => {
  if (!min) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

// Classifica ogni intervallo tra due timbri consecutivi.
function tipoIntervallo(cur, next) {
  if (cur.tipo_evento === "ingresso") return "lavoro";
  if (cur.tipo_evento === "pausa_inizio") return "pausa";
  if (cur.tipo_evento === "pausa_fine") {
    // Dopo la pausa si entra in un cantiere diverso senza uscita intermedia:
    // il tratto è spostamento. Altrimenti si riprende a lavorare.
    if (next.tipo_evento === "ingresso" && next.cantiere_id !== cur.cantiere_id) return "spostamento";
    return "lavoro";
  }
  if (cur.tipo_evento === "uscita") {
    if (next.tipo_evento === "ingresso") return "spostamento";
    return "pausa";
  }
  if (cur.tipo_evento === "spostamento") return "spostamento";
  return "lavoro";
}

const STILE = {
  lavoro: { label: "Lavoro", icon: Clock, color: "text-emerald-700", dot: "bg-emerald-500" },
  pausa: { label: "Pausa", icon: Coffee, color: "text-amber-700", dot: "bg-amber-500" },
  spostamento: { label: "Spostamento", icon: Navigation, color: "text-orange-700", dot: "bg-orange-500" },
};

// Vista cronologica della giornata: ogni intervallo tra timbri consecutivi è
// etichettato (lavoro / pausa / spostamento) con orario e durata. Aiuta l'admin
// a capire come si compone il totale e perché certi tempi non sono lavorati.
export default function SequenzaGiornata({ timbrature }) {
  const tOrd = (timbrature || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  if (tOrd.length === 0) return null;

  const perCantiere = calcolaOrePerCantiere(tOrd);
  const totLavoro = perCantiere.reduce((s, c) => s + (c.ore || 0), 0);
  const totSpost = perCantiere.reduce((s, c) => s + (c.ore_spostamento || 0), 0);

  const intervalli = [];
  for (let i = 0; i < tOrd.length - 1; i++) {
    const cur = tOrd[i];
    const next = tOrd[i + 1];
    const ms = new Date(next.data_ora) - new Date(cur.data_ora);
    if (ms <= 0) continue;
    const tipo = tipoIntervallo(cur, next);
    intervalli.push({
      tipo,
      inizio: cur.data_ora,
      fine: next.data_ora,
      min: Math.round(ms / 60000),
      cantiere: cur.cantiere_nome,
      destinazione: tipo === "spostamento" ? next.cantiere_nome : null,
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Sequenza giornata</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-lg font-bold text-emerald-700">{fmtOre(totLavoro)} lavoro</span>
          {totSpost > 0 && (
            <span className="text-sm font-semibold text-orange-700">+{fmtOre(totSpost)} spostamento</span>
          )}
        </div>
      </div>

      <div className="space-y-0">
        {intervalli.map((it, i) => {
          const st = STILE[it.tipo];
          const Icon = st.icon;
          const ultimo = i === intervalli.length - 1;
          return (
            <div key={i} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full ${st.dot} mt-1.5`} />
                {!ultimo && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 min-w-0 -mt-0.5 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className={`w-3.5 h-3.5 ${st.color} shrink-0`} />
                    <span className={`text-sm font-medium ${st.color}`}>{st.label}</span>
                    {it.cantiere && (
                      <span className="text-xs text-muted-foreground truncate">· {it.cantiere}</span>
                    )}
                    {it.destinazione && (
                      <span className="text-xs text-muted-foreground truncate">→ {it.destinazione}</span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                    {hhmm(it.inizio)}–{hhmm(it.fine)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground pl-5">{fmtDur(it.min)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          <b>Spostamento</b> = tempo tra la chiusura di un cantiere e l'ingresso nel successivo.
          <b> Trasferta</b> = km riconosciuti capannone↔cantiere (visibile in Ore Lavoratori).
        </span>
      </div>
    </Card>
  );
}