import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isToday } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRASFERTA_CONFIG, fmtOre } from "@/lib/timbratureUtils";

const GIORNI_SETT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/**
 * giorniSintesi: { [yyyy-MM-dd]: { ore: number, trasferta: { fascia, km } | null } }
 */
export default function CalendarioMese({ mese, giorniSintesi, onGiornoClick }) {
  const primo = startOfMonth(mese);
  const ultimo = endOfMonth(mese);
  const offset = (getDay(primo) + 6) % 7;
  const giorni = eachDayOfInterval({ start: primo, end: ultimo });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {GIORNI_SETT.map((g) => (
          <div key={g} className="text-center text-[10px] font-semibold text-muted-foreground uppercase">
            {g}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {giorni.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const s = giorniSintesi[key];
          const ore = s?.ore || 0;
          const trasferta = s?.trasferta;
          const cfg = trasferta?.fascia ? TRASFERTA_CONFIG[trasferta.fascia] : null;
          const haDati = ore > 0 || !!trasferta;
          const oggi = isToday(d);

          return (
            <button
              key={key}
              type="button"
              disabled={!haDati}
              onClick={() => haDati && onGiornoClick(key)}
              className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-start text-center transition-colors ${
                haDati
                  ? "border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer"
                  : "border-transparent"
              } ${oggi ? "ring-1 ring-primary/40" : ""}`}
            >
              <span className={`text-xs ${oggi ? "font-bold text-primary" : "text-muted-foreground"}`}>
                {format(d, "d")}
              </span>
              {ore > 0 && (
                <span className="text-[10px] font-semibold text-primary leading-tight mt-0.5">
                  {fmtOre(ore)}
                </span>
              )}
              {cfg && (
                <Badge variant="outline" className={`text-[8px] px-1 py-0 mt-0.5 leading-none ${cfg.color}`}>
                  {cfg.label} {trasferta.km != null ? `${trasferta.km}km` : ""}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}