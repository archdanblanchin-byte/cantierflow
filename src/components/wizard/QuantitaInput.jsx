import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Input numerico per le quantità:
 * - digitazione libera (i decimali non vengono disturbati)
 * - il valore viene allineato agli scatti di `step` (default 0,25) quando si esce dal campo
 */
export default function QuantitaInput({ value, onChange, step = 0.25, className, placeholder }) {
  const [testo, setTesto] = useState(null);

  const snap = (v) => Math.round(Math.round(v / step) * step * 100) / 100;

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={testo ?? (value ?? "")}
      placeholder={placeholder}
      onFocus={() => setTesto(String(value ?? "").replace(".", ","))}
      onChange={(e) => {
        const raw = e.target.value;
        setTesto(raw);
        const parsed = parseFloat(raw.replace(",", "."));
        if (!isNaN(parsed)) onChange(snap(parsed));
      }}
      onBlur={() => {
        const parsed = parseFloat(String(testo ?? "").replace(",", "."));
        setTesto(null);
        if (!isNaN(parsed)) onChange(snap(parsed));
      }}
      className={className}
    />
  );
}