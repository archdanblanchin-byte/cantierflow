import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { arrotondaOre } from "@/lib/timbratureUtils";

/**
 * Input numerico per le ore con:
 * - select-all-on-focus (digitando sovrascrivi il valore presente)
 * - bottoni + e − laterali (incremento/decremento di `step`, default 5 minuti)
 * - niente frecce su/giù del browser
 */
export default function OreInput({ value, onChange, step = 5 / 60, min = 0, className, disabled, compact = false }) {
  const round = (v) => Math.round(v * 1000) / 1000;
  const clamp = (v) => (min != null && v < min ? min : v);
  const btnW = compact ? "w-7" : "w-9";
  const iconSize = compact ? "w-3.5 h-3.5" : "w-4 h-4";

  const inc = () => onChange(clamp(arrotondaOre((parseFloat(value) || 0) + step)));
  const dec = () => onChange(clamp(arrotondaOre((parseFloat(value) || 0) - step)));

  return (
    <div className={`flex items-stretch gap-1 mt-1 ${className || ""}`}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled}
        className={`flex items-center justify-center ${btnW} rounded-md border border-input bg-transparent shadow-sm text-destructive hover:bg-accent disabled:opacity-50`}
        aria-label="Diminuisci"
      >
        <Minus className={`${iconSize} shrink-0`} />
      </button>
      <Input
        type="text"
        inputMode="decimal"
        value={value ?? ""}
        disabled={disabled}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          if (raw === "" || raw === "-") { onChange(0); return; }
          const parsed = parseFloat(raw);
          onChange(isNaN(parsed) ? 0 : clamp(round(parsed)));
        }}
        className="min-w-0 px-1 text-center font-semibold tabular-nums"
      />
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        className={`flex items-center justify-center ${btnW} rounded-md border border-input bg-transparent shadow-sm text-primary hover:bg-accent disabled:opacity-50`}
        aria-label="Aumenta"
      >
        <Plus className={`${iconSize} shrink-0`} />
      </button>
    </div>
  );
}