import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MousePointer2, Ruler, Type, Highlighter, PenTool, Hand, ZoomIn, ZoomOut, RotateCcw, Check, X, Palette } from 'lucide-react';

const STRUMENTI = [
  { id: 'seleziona', icona: MousePointer2, label: 'Seleziona e sposta' },
  { id: 'quota', icona: Ruler, label: 'Quota' },
  { id: 'testo', icona: Type, label: 'Testo / Nota' },
  { id: 'evidenzia', icona: Highlighter, label: 'Segnalatore' },
  { id: 'figura', icona: PenTool, label: 'Disegno libero' },
  { id: 'pan', icona: Hand, label: 'Sposta la vista' }
];

export default function ToolbarAnnotazioni({
  strumento, setStrumento, colori, onColoriChange, coloreAttivo, setColoreAttivo,
  opacita, setOpacita, zoom, onZoomIn, onZoomOut, onResetZoom, onSalva, onClose, saving
}) {
  const [personalizza, setPersonalizza] = useState(false);

  return (
    <div className="flex-shrink-0 bg-black/80 text-white border-t border-white/10">
      {/* Strumenti */}
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto no-scrollbar">
        {STRUMENTI.map((s) => {
          const Icona = s.icona;
          const attivo = strumento === s.id;
          return (
            <button key={s.id} type="button" title={s.label} onClick={() => setStrumento(s.id)}
              className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors flex-shrink-0 ${attivo ? 'bg-white text-black' : 'text-white/80 hover:bg-white/15'}`}>
              <Icona className="w-4 h-4" />
              <span className="hidden sm:inline">{s.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <div className="w-px h-6 bg-white/20 mx-1 flex-shrink-0" />
        {/* Colori */}
        {colori.map((c, i) => (
          <button key={i} type="button" onClick={() => setColoreAttivo(i)} title={`Colore ${i + 1}`}
            className={`w-7 h-7 rounded-full border-2 flex-shrink-0 transition-transform ${coloreAttivo === i ? 'border-white scale-110' : 'border-white/30'}`}
            style={{ backgroundColor: c }} />
        ))}
        <button type="button" onClick={() => setPersonalizza((v) => !v)} title="Personalizza i colori"
          className={`h-9 px-2 rounded-lg flex items-center gap-1 text-xs flex-shrink-0 ${personalizza ? 'bg-white text-black' : 'text-white/80 hover:bg-white/15'}`}>
          <Palette className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-white/20 mx-1 flex-shrink-0" />
        {/* Zoom */}
        <button type="button" onClick={onZoomOut} disabled={zoom <= 1} title="Riduci"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/15 disabled:opacity-30 flex-shrink-0">
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono w-11 text-center flex-shrink-0">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={onZoomIn} title="Ingrandisci"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/15 flex-shrink-0">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button type="button" onClick={onResetZoom} title="Reimposta vista"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/15 flex-shrink-0">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Personalizzazione colori + trasparenza */}
      {personalizza && (
        <div className="flex items-center gap-3 px-3 pb-2 flex-wrap">
          {colori.map((c, i) => (
            <label key={i} className="flex items-center gap-1.5 text-xs text-white/70">
              Colore {i + 1}
              <input type="color" value={c} onChange={(e) => onColoriChange(i, e.target.value)}
                className="w-8 h-7 rounded bg-transparent border border-white/30" />
            </label>
          ))}
        </div>
      )}
      {(strumento === 'evidenzia' || strumento === 'figura') && (
        <div className="flex items-center gap-2 px-3 pb-2">
          <span className="text-xs text-white/70 flex-shrink-0">Trasparenza</span>
          <input type="range" min="5" max="90" value={Math.round(opacita * 100)}
            onChange={(e) => setOpacita(Number(e.target.value) / 100)} className="flex-1 accent-white" />
          <span className="text-xs font-mono w-9 text-right">{Math.round(opacita * 100)}%</span>
        </div>
      )}

      {/* Azioni */}
      <div className="flex items-center justify-end gap-2 px-3 pb-2">
        <Button size="sm" variant="ghost" className="text-white" onClick={onClose}>
          <X className="w-4 h-4 mr-1" /> Annulla
        </Button>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onSalva} disabled={saving}>
          <Check className="w-4 h-4 mr-1" /> {saving ? 'Salvo…' : 'Salva'}
        </Button>
      </div>
    </div>
  );
}