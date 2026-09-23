import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isToday } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MapPin } from "lucide-react";
import { TRASFERTA_CONFIG, fmtOre } from "@/lib/timbratureUtils";
import { fmtOrePermesso } from "@/lib/riepilogoMensile";

const GIORNI_SETT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const COLORE_FERIE = "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-200";
const COLORE_PERMESSO = "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200";

/**
 * giorniSintesi: { [yyyy-MM-dd]: { ore: number, luoghi: string[], trasferta: { tipo_trasferta, km_totali, label } | null } }
 * permessi:      { [yyyy-MM-dd]: { tipo: "ferie"|"permesso", ore: number|null } }
 */
export default function CalendarioMese({ mese, giorniSintesi, permessi = {}, onGiornoClick }) {
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
          const fascia = trasferta?.tipo_trasferta;
          const cfg = fascia ? TRASFERTA_CONFIG[fascia] : null;
          const inSede = !!trasferta?.nessuna_trasferta;
          const permesso = permessi[key] || null;
          const haDati = ore > 0 || !!trasferta || !!permesso;
          const luoghi = s?.luoghi || [];
          const hasNote = !!s?.hasNote;
          const oggi = isToday(d);

          return (
            <button
              key={key}
              type="button"
              disabled={!haDati}
              onClick={() => haDati && onGiornoClick(key)}
              className={`relative aspect-square rounded-lg border p-1 flex flex-col items-center justify-start text-center transition-colors ${
                haDati
                  ? "border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer"
                  : "border-transparent"
              } ${oggi ? "ring-1 ring-primary/40" : ""}`}
            >
              {hasNote && (
                <AlertTriangle className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-amber-500" />
              )}
              {luoghi.length > 0 && (
                <MapPin className="absolute top-0.5 left-0.5 w-2.5 h-2.5 text-slate-500" />
              )}
              <span className={`text-xs ${oggi ? "font-bold text-primary" : "text-muted-foreground"}`}>
                {format(d, "d")}
              </span>
              {ore > 0 && (
                <span className="text-[10px] font-semibold text-primary leading-tight mt-0.5">
                  {fmtOre(ore)}
                </span>
              )}
              {inSede && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 mt-0.5 leading-none bg-slate-100 text-slate-600 border-slate-300 max-w-full truncate">
                  {luoghi[0] ? luoghi[0].slice(0, 9) : "sede"}
                </Badge>
              )}
              {cfg && !inSede && (
                <Badge variant="outline" className={`text-[8px] px-1 py-0 mt-0.5 leading-none ${cfg.color}`}>
                  {cfg.label} {trasferta.km_totali != null ? `${trasferta.km_totali}km` : ""}
                </Badge>
              )}
              {permesso && (
                <Badge
                  variant="outline"
                  className={`text-[8px] px-1 py-0 mt-0.5 leading-none max-w-full truncate ${
                    permesso.tipo === "ferie" ? COLORE_FERIE : COLORE_PERMESSO
                  }`}
                >
                  {permesso.tipo === "ferie" ? "F" : "P"}
                  {fmtOrePermesso(permesso.ore) ? ` ${fmtOrePermesso(permesso.ore)}` : ""}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}