import { Camera, StickyNote, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

// Tre pulsanti sempre visibili: aprono solo la funzione richiesta,
// così la schermata non mostra campi vuoti.
export default function QuickActions({ open, onToggle, counts }) {
  const voci = [
    { key: "foto", icon: Camera, label: "Aggiungi foto", count: counts.foto },
    { key: "nota", icon: StickyNote, label: "Aggiungi nota", count: counts.nota },
    { key: "mezzi", icon: Truck, label: "Mezzi e attrezzi", count: counts.mezzi },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {voci.map(({ key, icon: Icon, label, count }) => {
        const attivo = open === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={cn(
              "relative h-20 rounded-xl border flex flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-tight transition-colors",
              attivo
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-center">{label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "absolute top-1.5 right-1.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  attivo ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}