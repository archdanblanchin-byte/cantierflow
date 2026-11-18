import { addDays, addMonths, eachDayOfInterval, format, isWeekend, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Minus, Plus, Flag, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATI, COLORE_DEFAULT, fmt, inPausa } from "@/lib/cronoCalc";

const W = 30;
const STRISCE_PIOGGIA = "repeating-linear-gradient(45deg,#bfdbfe,#bfdbfe 4px,#60a5fa 4px,#60a5fa 8px)";
const STRISCE_PAUSA = "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 4px,#9ca3af 4px,#9ca3af 8px)";

function Cella({ c, key_, giorno }) {
  const colore = c.colore || COLORE_DEFAULT;
  const lavoro = c.piano.giorni.includes(key_);
  const inizio = key_ === c.data_inizio;
  const fine = key_ === c.piano.fine;
  const weekend = isWeekend(giorno);
  let bar = null;
  if (inPausa(c, key_) && key_ >= c.data_inizio && key_ <= (c.piano.fine || c.data_inizio)) {
    bar = <div className="h-6 w-full" style={{ background: STRISCE_PAUSA }} title="Pausa" />;
  } else if (lavoro) {
    const pioggia = c.piano.pioggia.has(key_);
    bar = (
      <div
        className={`h-6 w-full flex items-center justify-center text-white ${inizio ? "rounded-l-md" : ""} ${fine ? "rounded-r-md" : ""} ${c.data_confermata ? "" : "opacity-60 border border-dashed border-black/40"}`}
        style={{ background: pioggia ? STRISCE_PIOGGIA : colore }}
        title={pioggia ? "Giorno di pioggia" : ""}
      >
        {inizio && <Play className="w-3 h-3 fill-white" />}
        {fine && !inizio && <Flag className="w-3 h-3" />}
      </div>
    );
  }
  return (
    <div className={`shrink-0 flex items-center border-r border-border/40 ${weekend ? "bg-muted/70" : ""}`} style={{ width: W, height: 44 }}>
      {bar}
    </div>
  );
}

export default function CronoGantt({ cantieri, occ, maxDip, cursor, setCursor, mesi, setMesi, onEdit, onPioggia, readOnly }) {
  const inizio = cursor;
  const fineFinestra = addDays(addMonths(inizio, mesi), -1);
  const giorni = eachDayOfInterval({ start: inizio, end: fineFinestra });
  const a = fmt(inizio);
  const b = fmt(fineFinestra);
  const visibili = cantieri
    .filter((c) => c.data_inizio && c.data_inizio <= b && (c.piano.fine || c.data_inizio) >= a)
    .sort((x, y) => x.data_inizio.localeCompare(y.data_inizio));
  const meta = Math.max(1, Math.round(giorni.length / 2));

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => setCursor(addDays(cursor, -meta))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(addDays(cursor, meta))}><ChevronRight className="w-4 h-4" /></Button>
          <Select value={String(mesi)} onValueChange={(v) => setMesi(Number(v))}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map((m) => <SelectItem key={m} value={String(m)}>{m} {m === 1 ? "mese" : "mesi"}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">
            {visibili.length} di {cantieri.length} cantieri nel periodo
          </span>
        </div>
      )}
      <div className="border rounded-xl bg-card overflow-x-auto">
        <div style={{ width: 220 + giorni.length * W }}>
          <div className="flex border-b bg-muted/40">
            <div className="shrink-0 sticky left-0 z-10 bg-muted px-3 py-2 text-xs font-semibold" style={{ width: 220 }}>Cantiere</div>
            {giorni.map((g) => (
              <div key={fmt(g)} className={`shrink-0 text-center border-r border-border/40 ${isWeekend(g) ? "bg-muted" : ""}`} style={{ width: W }}>
                {g.getDate() === 1 || g === giorni[0] ? (
                  <div className="text-[9px] font-bold uppercase text-primary">{format(g, "MMM", { locale: it })}</div>
                ) : <div className="text-[9px]">&nbsp;</div>}
                <div className="text-[11px] font-semibold">{g.getDate()}</div>
                <div className="text-[9px] text-muted-foreground">{format(g, "EEEEE", { locale: it })}</div>
              </div>
            ))}
          </div>
          {visibili.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground sticky left-0" style={{ width: "min(100%, 100vw)" }}>
              Nessun cantiere in questo periodo.
            </div>
          )}
          {visibili.map((c) => {
            const stato = STATI[c.stato] || STATI.pianificato;
            return (
              <div key={c.id} className="flex border-b last:border-b-0">
                <div className="shrink-0 sticky left-0 z-10 bg-card px-3 py-1 border-r cursor-pointer hover:bg-muted/50" style={{ width: 220, height: 44 }} onClick={() => onEdit(c)}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.colore || COLORE_DEFAULT }} />
                    <span className="text-xs font-semibold truncate flex-1">{c.nome}</span>
                    {!readOnly && (
                      <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <button className="w-4 h-4 rounded bg-blue-100 text-blue-700 flex items-center justify-center" title="Meno pioggia" onClick={() => onPioggia(c, -1)}><Minus className="w-3 h-3" /></button>
                        <span className="text-[10px] font-semibold w-3 text-center">{c.giorni_pioggia || 0}</span>
                        <button className="w-4 h-4 rounded bg-blue-100 text-blue-700 flex items-center justify-center" title="Più pioggia" onClick={() => onPioggia(c, 1)}><Plus className="w-3 h-3" /></button>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    <span className={`px-1 rounded ${stato.cls}`}>{stato.label}</span>{" "}
                    {[c.capocantiere, c.responsabile].filter(Boolean).join(" / ")} · {c.ore_totali || 0}h · {c.piano.necessari}gg
                  </div>
                </div>
                {giorni.map((g) => <Cella key={fmt(g)} c={c} key_={fmt(g)} giorno={g} />)}
              </div>
            );
          })}
          <div className="flex bg-muted/30 border-t">
            <div className="shrink-0 sticky left-0 z-10 bg-muted px-3 py-1.5 text-[11px] font-semibold" style={{ width: 220 }}>Persone (max {maxDip})</div>
            {giorni.map((g) => {
              const n = occ[fmt(g)] || 0;
              const over = n > maxDip;
              return (
                <div key={fmt(g)} className={`shrink-0 text-center text-[10px] py-1.5 font-semibold border-r border-border/40 ${over ? "bg-red-500 text-white" : "text-muted-foreground"}`} style={{ width: W }} title={over ? "Superato il limite di dipendenti" : ""}>
                  {n || ""}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-primary" /> Data confermata</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-primary/60 border border-dashed border-black/40" /> Non confermata</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded" style={{ background: STRISCE_PIOGGIA }} /> Pioggia</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded" style={{ background: STRISCE_PAUSA }} /> Pausa</span>
        <span className="flex items-center gap-1"><Play className="w-3 h-3" /> Inizio</span>
        <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> Fine</span>
        <span className="flex items-center gap-1"><span className="w-4 h-3 rounded bg-red-500" /> Oltre max dip.</span>
      </div>
    </div>
  );
}