import { Mic, Square } from "lucide-react";

/**
 * Indicatore visivo animato per la registrazione audio.
 * Mostra un pallino rosso pulsante "REC" con effetto radar e barre equalizer.
 */
export default function RecordingIndicator({ seconds, fmt }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative flex h-3 w-3 items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <span className="flex items-end gap-0.5 h-4">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-0.5 bg-red-500 rounded-full animate-pulse"
            style={{ height: `${[6, 12, 9, 14][i]}px`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      <span className="font-mono text-xs font-bold text-red-600 tabular-nums">{fmt(seconds)}</span>
      <span className="flex items-center gap-1 text-red-600">
        <Mic className="w-3.5 h-3.5" />
        <Square className="w-3 h-3 fill-current" />
        ferma
      </span>
    </span>
  );
}