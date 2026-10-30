import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Coffee, Navigation, Clock, Info, Route, Home } from "lucide-react";
import { fmtOre, timbroInSede, TRASFERTA_CONFIG } from "@/lib/timbratureUtils";
import { calcolaOrePerCantiere } from "@/lib/rapportiniFromTimbrature";
import { calcolaTrasfertaGiorno } from "@/lib/oreLavoratoriUtils";
import { base44 } from "@/api/base44Client";

// Cache leggera (config trasferta + cantieri) condivisa tra le istanze, così
// il riepilogo trasferta della sequenza non rifà la lista a ogni render.
let _cachePromise = null;
let _cache = null;
function getSedeCantieri() {
  if (_cache) return Promise.resolve(_cache);
  if (!_cachePromise) {
    _cachePromise = Promise.all([
      base44.entities.ConfigurazioneTrasferta.list(),
      base44.entities.Cantiere.list(),
    ])
      .then(([configs, cantieri]) => {
        _cache = { config: configs[0] || null, cantieri: cantieri || [] };
        return _cache;
      })
      .catch(() => {
        _cache = { config: null, cantieri: [] };
        return _cache;
      });
  }
  return _cachePromise;
}

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
// etichettato (lavoro / pausa / spostamento) con orario e durata. Sopra c'è il
// riepilogo della trasferta (sede↔cantiere, in km e fuori dalle ore lavorate),
// distinta dagli spostamenti (tra cantieri, in ore). Il lavoro svolto in sede
// — anche per un altro cantiere — è marcato esplicitamente.
export default function SequenzaGiornata({ timbrature }) {
  const tOrd = (timbrature || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

  const [trasferta, setTrasferta] = useState(null);
  useEffect(() => {
    let active = true;
    if (tOrd.length === 0) return;
    getSedeCantieri().then(({ config, cantieri }) => {
      if (!active) return;
      setTrasferta(calcolaTrasfertaGiorno(tOrd, cantieri, config));
    });
    return () => { active = false; };
  }, [timbrature]);

  if (tOrd.length === 0) return null;

  const perCantiere = calcolaOrePerCantiere(tOrd);
  const totLavoro = perCantiere.reduce((s, c) => s + (c.ore || 0), 0);
  const totSpost = perCantiere.reduce((s, c) => s + (c.ore_spostamento || 0), 0);

  // Cantieri la cui sessione è iniziata in sede (timbro entro il raggio GPS):
  // il loro lavoro è svolto in sede, anche se il cantiere selezionato è un altro.
  const sedeCantieri = new Set();
  tOrd.forEach((t) => {
    if (t.tipo_evento === "ingresso" && timbroInSede(t) && t.cantiere_id) sedeCantieri.add(t.cantiere_id);
  });

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
      inSede: tipo === "lavoro" && cur.cantiere_id && sedeCantieri.has(cur.cantiere_id),
    });
  }

  const inSedeGiornata = !!trasferta?.nessuna_trasferta;
  const cfgAndata = trasferta?.fascia_andata ? TRASFERTA_CONFIG[trasferta.fascia_andata] : null;
  const cfgRitorno = trasferta?.fascia_ritorno ? TRASFERTA_CONFIG[trasferta.fascia_ritorno] : null;

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

      {/* Riepilogo trasferta: sede↔cantiere, in km, NON conteggiata nelle ore. */}
      {trasferta && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-primary">
            <Route className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider">Trasferta (sede↔cantiere)</span>
            {inSedeGiornata && (
              <Badge variant="outline" className="ml-auto text-[9px] bg-slate-100 text-slate-600 border-slate-300">
                <Home className="w-2.5 h-2.5 mr-0.5" />In sede
              </Badge>
            )}
          </div>
          {!inSedeGiornata && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-card/60 px-2 py-1.5">
                <p className="text-[9px] text-muted-foreground uppercase">Andata</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">{trasferta.km_andata ?? 0} km</span>
                  {trasferta.partenza_da_sede
                    ? <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600 border-slate-300">In sede</Badge>
                    : cfgAndata
                      ? <Badge variant="outline" className={`text-[9px] ${cfgAndata.color}`}>{cfgAndata.label}</Badge>
                      : null}
                </div>
                <p className="text-[9px] text-muted-foreground truncate">→ {trasferta.primo_cantiere_nome || "—"}</p>
              </div>
              <div className="rounded-md bg-card/60 px-2 py-1.5">
                <p className="text-[9px] text-muted-foreground uppercase">Ritorno</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">{trasferta.km_ritorno ?? 0} km</span>
                  {trasferta.rientro_in_sede
                    ? <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600 border-slate-300">In sede</Badge>
                    : cfgRitorno
                      ? <Badge variant="outline" className={`text-[9px] ${cfgRitorno.color}`}>{cfgRitorno.label}</Badge>
                      : null}
                </div>
                <p className="text-[9px] text-muted-foreground truncate">{trasferta.ultimo_cantiere_nome || "—"} →</p>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            La trasferta è in km e non si somma alle ore lavorate.
          </p>
        </div>
      )}

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
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <Icon className={`w-3.5 h-3.5 ${st.color} shrink-0`} />
                    <span className={`text-sm font-medium ${st.color}`}>{st.label}</span>
                    {it.inSede && (
                      <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600 border-slate-300">
                        <Home className="w-2.5 h-2.5 mr-0.5" />sede
                      </Badge>
                    )}
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
          <b>Trasferta</b> = sede↔primo/ultimo cantiere (km, fuori dalle ore). <b>Spostamento</b> = tra un cantiere e l'altro (ore, diviso tra i cantieri). <b>Sede</b> = lavoro timbrato in capannone, anche per un altro cantiere.
        </span>
      </div>
    </Card>
  );
}