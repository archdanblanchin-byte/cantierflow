import { useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const GIORNI_PIENI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmtKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function WeekDateStrip({ value, onChange, dir, onDir }) {
  const inputRef = useRef(null);
  const center = parseDate(value);
  const todayKey = fmtKey(new Date());

  const days = useMemo(() => {
    const arr = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [value]);

  const shift = (delta) => {
    onDir?.(delta);
    const d = new Date(center);
    d.setDate(d.getDate() + delta);
    onChange(fmtKey(d));
  };

  const tap = (d, idx) => {
    if (fmtKey(d) === value) {
      inputRef.current?.click();
      return;
    }
    onDir?.(idx - 3);
    onChange(fmtKey(d));
  };

  const onPick = (e) => {
    if (e.target.value) {
      onDir?.(0);
      onChange(e.target.value);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-4">
      <div className="rounded-2xl bg-muted/70 p-2 flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9 rounded-xl"
          onClick={() => shift(-1)}
          title="Giorno precedente"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={value}
              initial={dir === 0 ? { opacity: 0 } : dir > 0 ? { x: 36, opacity: 0 } : { x: -36, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={dir === 0 ? { opacity: 0 } : dir > 0 ? { x: -36, opacity: 0 } : { x: 36, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-end justify-center gap-1.5 w-full"
            >
              {days.map((d, idx) => {
                const key = fmtKey(d);
                const selected = key === value;
                const isToday = key === todayKey;
                const dow = d.getDay();

                if (selected) {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => tap(d, idx)}
                      className="flex-[1.7] min-w-0 flex flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground px-1 py-2.5 shadow-lg"
                    >
                      <span className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-wide opacity-90 truncate w-full text-center">
                        {cap(GIORNI_PIENI[dow])}
                      </span>
                      <span className="text-2xl sm:text-4xl font-extrabold leading-none my-1">{d.getDate()}</span>
                      <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wide opacity-90 truncate w-full text-center">
                        {cap(MESI[d.getMonth()])}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => tap(d, idx)}
                    className={`flex-1 min-w-0 flex flex-col items-center justify-center rounded-xl bg-card border px-1 py-1.5 transition-colors hover:bg-accent ${
                      isToday ? "border-primary/60" : "border-border"
                    }`}
                  >
                    <span className="text-[9px] sm:text-[10px] font-medium uppercase text-muted-foreground">
                      {GIORNI_BREVI[dow]}
                    </span>
                    <span className="text-sm sm:text-base font-bold leading-none mt-0.5 text-foreground">{d.getDate()}</span>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9 rounded-xl"
          onClick={() => shift(1)}
          title="Giorno successivo"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={onPick}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}