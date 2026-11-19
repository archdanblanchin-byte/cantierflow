import React from 'react';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, Circle, Square, Dot } from 'lucide-react';

const FORME = [
  { id: 'punto', label: 'Punto', icona: Dot },
  { id: 'cerchio', label: 'Cerchio', icona: Circle },
  { id: 'area', label: 'Area', icona: Square }
];

function Titolo({ children }) {
  return <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex-shrink-0">{children}</span>;
}

export default function PannelloElemento({ elemento, onChange, onElimina, colori, coloreAttivo, setColoreAttivo }) {
  const set = (patch) => onChange({ ...elemento, ...patch });

  const coloriPicker = (
    <div className="flex items-center gap-1.5">
      <Titolo>Colore</Titolo>
      {colori.map((c, i) => (
        <button key={i} type="button" onClick={() => { setColoreAttivo(i); set({ colore: c }); }}
          className={`w-6 h-6 rounded-full border-2 transition-transform ${elemento.colore === c ? 'border-foreground scale-110' : 'border-border'}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  );

  const trasparenza = (
    <div className="flex items-center gap-2 flex-1 min-w-[160px]">
      <Titolo>Trasparenza</Titolo>
      <input type="range" min="5" max="90" value={Math.round((elemento.opacita ?? 0.35) * 100)}
        onChange={(e) => set({ opacita: Number(e.target.value) / 100 })} className="flex-1 accent-primary" />
      <span className="text-xs font-mono w-9 text-right">{Math.round((elemento.opacita ?? 0.35) * 100)}%</span>
    </div>
  );

  return (
    <div className="flex-shrink-0 bg-card border-t border-border px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide">
          {elemento.tipo === 'testo' ? 'Testo / nota' : elemento.tipo === 'quota' ? 'Quota' : elemento.tipo === 'figura' ? 'Figura' : 'Segnalatore'}
        </p>
        <button type="button" onClick={onElimina} className="text-muted-foreground hover:text-destructive" title="Elimina elemento">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {elemento.tipo === 'testo' && (
        <Input autoFocus placeholder="Scrivi una nota…" value={elemento.testo || ''}
          onChange={(e) => set({ testo: e.target.value })} className="h-9" />
      )}
      {elemento.tipo === 'quota' && (
        <Input placeholder="es: 3.20 m" value={elemento.testo === '?' ? '' : elemento.testo || ''}
          onChange={(e) => set({ testo: e.target.value || '?' })} className="h-9" />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {coloriPicker}
        {elemento.tipo === 'testo' && (
          <div className="flex items-center gap-1.5">
            <Titolo>Dimensione</Titolo>
            <button type="button" onClick={() => set({ size: Math.max(10, (elemento.size || 24) - 4) })}
              className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono w-8 text-center">{elemento.size}</span>
            <button type="button" onClick={() => set({ size: Math.min(220, (elemento.size || 24) + 4) })}
              className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {elemento.tipo === 'evidenziatore' && (
          <>
            <div className="flex items-center gap-1.5">
              <Titolo>Forma</Titolo>
              {FORME.map((f) => {
                const Icona = f.icona;
                return (
                  <button key={f.id} type="button" title={f.label} onClick={() => set({ forma: f.id })}
                    className={`h-7 px-2 rounded-md border text-xs flex items-center gap-1 ${elemento.forma === f.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>
                    <Icona className="w-3.5 h-3.5" /> {f.label}
                  </button>
                );
              })}
            </div>
            {trasparenza}
          </>
        )}
        {elemento.tipo === 'figura' && (
          <>
            <button type="button" onClick={() => set({ chiusa: !elemento.chiusa })}
              className={`h-7 px-2.5 rounded-md border text-xs ${elemento.chiusa ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'}`}>
              {elemento.chiusa ? 'Perimetro chiuso' : 'Perimetro aperto'}
            </button>
            {trasparenza}
          </>
        )}
      </div>
    </div>
  );
}