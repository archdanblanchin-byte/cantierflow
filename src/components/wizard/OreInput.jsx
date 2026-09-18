import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

/**
 * Input numerico per le ore con:
 * - scatti di `step` (default 0,25 = 15 minuti; passo 1 per i contatori)
 * - bottoni + e − laterali (incremento/decremento di `step`)
 * - select-all-on-focus (digitando sovrascrivi il valore presente)
 * - il valore digitato viene allineato allo scatto quando si esce dal campo
 * - niente frecce su/giù del browser
 */
export default function OreInput({ value, onChange, step = 0.25, min = 0, className, disabled, compact = false }) {
  // Testo libero mentre si digita (per non disturbare la digitazione dei decimali)
  const [testo, setTesto] = useState(null);

  const snap = (v) => {
    let val = v;
    if (min != null && val < min) val = min;
    const r = Math.round(val / step) * step;
    return Math.round(r * 1000) / 1000;
  };

  const inc = () => onChange(snap((parseFloat(value) || 0) + step));
  const dec = () => onChange(snap((parseFloat(value) || 0) - step));

  const btnW = compact ? "w-7" : "w-9";
  const iconSize = compact ? "w-3.5 h-3.5" : "w-4 h-4";

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
        value={testo ?? (value ?? "")}
        disabled={disabled}
        onFocus={(e) => {
          setTesto(String(value ?? "").replace(".", ","));
          const el = e.target;
          el.select();
          requestAnimationFrame(() => el.select());
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setTesto(raw);
          const parsed = parseFloat(raw.replace(",", "."));
          if (!isNaN(parsed)) onChange(snap(parsed));
        }}
        onBlur={() => {
          const parsed = parseFloat(String(testo ?? "").replace(",", "."));
          setTesto(null);
          onChange(isNaN(parsed) ? 0 : snap(parsed));
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