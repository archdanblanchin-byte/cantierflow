import React from "react";
import { Trash2 } from "lucide-react";
import { TIPI, nomeMisura, valoreMisura } from "@/lib/misure";
import { cn } from "@/lib/utils";

export default function MisureElenco({ misure, selectedId, onSelect, onDelete }) {
  if (misure.length === 0) {
    return <p className="text-xs text-slate-500 p-4 text-center">Nessuna misura su questa pagina. Calibra la scala e scegli uno strumento.</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {Object.keys(TIPI).map((tipo) => {
        const gruppo = misure.filter((m) => m.type === tipo);
        if (!gruppo.length) return null;
        return (
          <div key={tipo} className="py-1.5">
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {TIPI[tipo].label} ({gruppo.length})
            </div>
            {gruppo.map((m) => (
              <div key={m.id} onClick={() => onSelect(m.id)}
                className={cn("group flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50", m.id === selectedId && "bg-sky-50")}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color || "#ef4444" }} />
                <span className="flex-1 min-w-0 truncate text-xs text-slate-700">{nomeMisura(m)}</span>
                <span className="text-xs font-semibold text-slate-900">{m.type === "text" ? "" : valoreMisura(m)}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(m); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}