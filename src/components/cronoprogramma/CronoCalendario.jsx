import { addDays, endOfMonth, endOfWeek, format, isSameMonth, isToday, isWeekend, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { AlertTriangle, CloudRain, Pause, Palmtree } from "lucide-react";
import { COLORE_DEFAULT, fmt, inPausa } from "@/lib/cronoCalc";

const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const STRISCE = "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 4px,#9ca3af 4px,#9ca3af 8px)";

function Barra({ c, key_, onEdit }) {
  const pausa = inPausa(c, key_);
  const pioggia = c.piano.pioggia.has(key_);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onEdit(c); }}
      className={`w-full text-left text-[10px] font-semibold rounded px-1 py-0.5 truncate flex items-center gap-1 ${pausa ? "text-gray-700" : "text-white"} ${!pausa && !c.data_confermata ? "opacity-60 border border-dashed border-black/40" : ""}`}
      style={{ background: pausa ? STRISCE : c.colore || COLORE_DEFAULT }}
    >
      {pausa && <Pause className="w-2.5 h-2.5 shrink-0" />}
      {pioggia && <CloudRain className="w-2.5 h-2.5 shrink-0" />}
      <span className="truncate">{c.nome}</span>
    </button>
  );
}

export default function CronoCalendario({ cantieri, occ, maxDip, cursor, permessi, onEdit, onNuovo }) {
  const giorni = eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }) });
  const perGiorno = (key) => cantieri.filter((c) => c.piano.giorni.includes(key) || (inPausa(c, key) && key >= c.data_inizio && key <= (c.piano.fine || "")));
  const permessiGiorno = (key) => permessi.filter((p) => p.data === key);

  return (
    <div className="space-y-3">
      <div className="border rounded-xl bg-card overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 bg-muted/50 border-b">
            {GIORNI.map((g) => <div key={g} className="text-center text-xs font-semibold py-2">{g}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {giorni.map((g) => {
              const key = fmt(g);
              const n = occ[key] || 0;
              const over = n > maxDip;
              const fuori = !isSameMonth(g, cursor);
              const feriale = !isWeekend(g);
              return (
                <div
                  key={key}
                  onClick={() => feriale && onNuovo(key)}
                  className={`min-h-[104px] border-r border-b p-1 space-y-0.5 ${isWeekend(g) ? "bg-muted/60" : "cursor-pointer hover:bg-primary/5"} ${fuori ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${isToday(g) ? "bg-primary text-primary-foreground" : ""}`}>{g.getDate()}</span>
                    {n > 0 && (
                      <span className={`text-[10px] font-semibold px-1 rounded flex items-center gap-0.5 ${over ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"}`} title={over ? `Superato il limite di ${maxDip} dipendenti` : "Persone occupate"}>
                        {over && <AlertTriangle className="w-2.5 h-2.5" />}{n}
                      </span>
                    )}
                  </div>
                  {perGiorno(key).map((c) => <Barra key={c.id} c={c} key_={key} onEdit={onEdit} />)}
                  {permessiGiorno(key).map((p) => (
                    <div key={p.id} className="text-[10px] rounded px-1 py-0.5 bg-amber-100 text-amber-800 truncate flex items-center gap-1">
                      <Palmtree className="w-2.5 h-2.5 shrink-0" />{p.nome}{p.tipo === "permesso" && p.ore ? ` ${p.ore}h` : ""}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {permessi.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Permessi e ferie non disponibili per questo mese: nessun dato presente. Si caricano dalla sincronizzazione del calendario nella sezione Calendario.
        </p>
      )}
    </div>
  );
}