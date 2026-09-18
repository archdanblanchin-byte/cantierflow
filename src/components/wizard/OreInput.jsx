import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

// Passo dei minuti: 5, 10, 15, 20, 25, ...
const STEP_MIN = 5;

/**
 * Input ORE in formato ore + minuti (mai decimali).
 * - due caselle separate: ORE e MINUTI
 * - i minuti si muovono a scatti di 5 (tasti + e − nella versione estesa)
 * - i minuti digitati si allineano allo scatto di 5 uscendo dal campo
 * - 60 minuti diventano automaticamente 1 ora (e i minuti negativi scalano l'ora)
 * - legge e scrive lo stesso valore decimale salvato sulle entità (nessuna migrazione dati)
 * - `compact` = solo le due caselle (per le celle strette delle lavorazioni)
 */
export default function OreInput({ value, onChange, className, disabled, compact = false }) {
  const totMin = Math.max(0, Math.round((Number(value) || 0) * 60));
  const ore = Math.floor(totMin / 60);
  const minuti = totMin % 60;

  const [testoOre, setTestoOre] = useState(null);
  const [testoMinuti, setTestoMinuti] = useState(null);

  const emit = (h, m) => {
    let hh = Math.max(0, Math.floor(Number(h) || 0));
    let mm = Math.round(Number(m) || 0);
    while (mm < 0) {
      mm += 60;
      hh = Math.max(0, hh - 1);
    }
    while (mm > 59) {
      mm -= 60;
      hh += 1;
    }
    onChange(Math.round((hh + mm / 60) * 1000) / 1000);
  };

  const snapMinuti = (m) => Math.max(0, Math.round((Number(m) || 0) / STEP_MIN) * STEP_MIN);

  const campoW = compact ? "w-8 px-0.5 text-sm" : "w-11 px-1";
  const labelW = compact ? "text-[10px]" : "text-xs";
  const btnW = compact ? "w-6" : "w-8";

  return (
    <div className={`flex items-center gap-1 mt-1 ${className || ""}`}>
      <Input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        aria-label="Ore"
        value={testoOre ?? (ore || "")}
        onFocus={(e) => {
          setTestoOre(ore ? String(ore) : "");
          e.target.select();
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          setTestoOre(raw);
          emit(raw === "" ? 0 : parseInt(raw, 10), minuti);
        }}
        onBlur={() => {
          setTestoOre(null);
          emit(ore, minuti);
        }}
        className={`min-w-0 text-center font-semibold tabular-nums ${campoW}`}
      />
      <span className={`${labelW} text-muted-foreground`}>h</span>

      {!compact && (
        <button
          type="button"
          onClick={() => emit(ore, minuti - STEP_MIN)}
          disabled={disabled}
          className={`flex h-9 ${btnW} items-center justify-center rounded-md border border-input bg-transparent shadow-sm text-destructive hover:bg-accent disabled:opacity-50`}
          aria-label="Diminuisci di 5 minuti"
        >
          <Minus className="w-3.5 h-3.5 shrink-0" />
        </button>
      )}

      <Input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        aria-label="Minuti"
        value={testoMinuti ?? (minuti || "")}
        onFocus={(e) => {
          setTestoMinuti(minuti ? String(minuti) : "");
          e.target.select();
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          setTestoMinuti(raw);
          emit(ore, raw === "" ? 0 : parseInt(raw, 10));
        }}
        onBlur={() => {
          setTestoMinuti(null);
          emit(ore, snapMinuti(minuti));
        }}
        className={`min-w-0 text-center font-semibold tabular-nums ${campoW}`}
      />
      <span className={`${labelW} text-muted-foreground`}>min</span>

      {!compact && (
        <button
          type="button"
          onClick={() => emit(ore, minuti + STEP_MIN)}
          disabled={disabled}
          className={`flex h-9 ${btnW} items-center justify-center rounded-md border border-input bg-transparent shadow-sm text-primary hover:bg-accent disabled:opacity-50`}
          aria-label="Aumenta di 5 minuti"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
        </button>
      )}
    </div>
  );
}