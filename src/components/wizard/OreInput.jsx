import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

/**
 * Input numerico per le ore con:
 * - select-all-on-focus (digitando sovrascrivi il valore presente)
 * - bottoni + e − laterali (incremento/decremento di `step`, default 0.25 = un quarto d'ora)
 * - niente frecce su/giù del browser
 */
export default function OreInput({ value, onChange, step = 0.25, min = 0, className, disabled }) {
  const round = (v) => Math.round(v * 100) / 100;
  const clamp = (v) => (min != null && v < min ? min : v);

  const inc = () => onChange(clamp(round((parseFloat(value) || 0) + step)));
  const dec = () => onChange(clamp(round((parseFloat(value) || 0) - step)));

  return (
    <div className={`flex items-stretch gap-1 mt-1 ${className || ""}`}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled}
        className="flex items-center justify-center w-9 rounded-md border border-input bg-transparent shadow-sm text-destructive hover:bg-accent disabled:opacity-50"
        aria-label="Diminuisci"
      >
        <Minus className="w-4 h-4" />
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
        className="text-center font-semibold tabular-nums"
      />
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        className="flex items-center justify-center w-9 rounded-md border border-input bg-transparent shadow-sm text-primary hover:bg-accent disabled:opacity-50"
        aria-label="Aumenta"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}