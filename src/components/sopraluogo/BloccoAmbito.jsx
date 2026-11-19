import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const THEMES = {
  interno: {
    border: 'border-slate-200',
    headerBg: 'bg-slate-50',
    bodyBg: 'bg-white',
    accent: 'text-slate-600',
    chip: 'bg-slate-100 text-slate-600',
  },
  esterno: {
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-50/60',
    bodyBg: 'bg-white',
    accent: 'text-emerald-600',
    chip: 'bg-emerald-100 text-emerald-700',
  },
};

export default function BloccoAmbito({ ambito, titolo, sottotitolo, totale, count, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const theme = THEMES[ambito] || THEMES.interno;

  return (
    <div className={`rounded-xl border ${theme.border} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full ${theme.headerBg} px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 transition-colors hover:brightness-95`}
      >
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-sm leading-tight text-foreground">{titolo}</p>
          {sottotitolo && <p className="text-xs text-muted-foreground leading-tight truncate mt-0.5">{sottotitolo}</p>}
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {count > 0 && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${theme.chip}`}>
              {count} {count === 1 ? 'elemento' : 'elementi'}
            </span>
          )}
          {totale > 0 && (
            <div className="text-right">
              <p className="text-[9px] text-muted-foreground leading-none">Totale</p>
              <p className={`font-bold text-sm leading-tight ${theme.accent}`}>{totale.toFixed(1)}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">mq</span></p>
            </div>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className={`${theme.bodyBg} px-0.5 sm:px-4 py-1.5 sm:py-4 space-y-4 border-t ${theme.border}`}>
          {children}
        </div>
      )}
    </div>
  );
}