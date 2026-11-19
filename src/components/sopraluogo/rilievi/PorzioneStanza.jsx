import React from 'react';
import { Plus, Minus, Sun, SunDim } from 'lucide-react';
import CampoNumero from '../CampoNumero';
import PorzioniStanza from './PorzioniStanza';
import { creaVoceStanza, dettaglioStanza, fmtMq } from '@/lib/rilievi';

const btnPorzione = 'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/40 rounded-lg py-1.5 transition-colors';

const etichetta = 'text-[10px] uppercase tracking-wider text-muted-foreground font-medium';

// Modalità "Stanza": una misura lunghezza × larghezza × altezza con soffitto,
// porzioni aggiunte e porzioni sottratte.
export default function PorzioneStanza({ misura, onChange, anagrafiche }) {
  const m = misura;
  const d = dettaglioStanza(m);
  const soffittoCompreso = m.soffitto !== false;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className={etichetta}>Lunghezza (m)</p>
          <CampoNumero value={m.lunghezza} onChange={(e) => onChange({ lunghezza: e.target.value })} placeholder="0,00" className="text-right" />
        </div>
        <div className="space-y-1">
          <p className={etichetta}>Larghezza (m)</p>
          <CampoNumero value={m.larghezza} onChange={(e) => onChange({ larghezza: e.target.value })} placeholder="0,00" className="text-right" />
        </div>
        <div className="space-y-1">
          <p className={etichetta}>Altezza (m)</p>
          <CampoNumero value={m.altezza} onChange={(e) => onChange({ altezza: e.target.value })} placeholder="0,00" className="text-right" />
        </div>
        <div className="space-y-1">
          <p className={etichetta}>Soffitto</p>
          <button type="button" onClick={() => onChange({ soffitto: !soffittoCompreso })}
            className={`w-full h-9 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${soffittoCompreso ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border bg-muted/40 text-muted-foreground'}`}>
            {soffittoCompreso ? <Sun className="w-3.5 h-3.5" /> : <SunDim className="w-3.5 h-3.5" />}
            {soffittoCompreso ? 'Soffitto compreso' : 'Soffitto escluso'}
          </button>
        </div>
      </div>

      <PorzioniStanza tipo="aggiungi" nascondiBottone voci={m.aggiunte || []} onChange={(v) => onChange({ aggiunte: v })} anagrafica={anagrafiche.sottrazioni} />
      <PorzioniStanza tipo="sottrai" nascondiBottone voci={m.sottrazioni || []} onChange={(v) => onChange({ sottrazioni: v })} anagrafica={anagrafiche.sottrazioni} />

      <div className="flex gap-2">
        <button type="button" onClick={() => onChange({ aggiunte: [...(m.aggiunte || []), creaVoceStanza()] })} className={btnPorzione}>
          <Plus className="w-3.5 h-3.5" /> Aggiungi porzione
        </button>
        <button type="button" onClick={() => onChange({ sottrazioni: [...(m.sottrazioni || []), creaVoceStanza()] })} className={btnPorzione}>
          <Minus className="w-3.5 h-3.5" /> Sottrai porzione
        </button>
      </div>

      <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground tabular-nums">
        pareti {fmtMq(d.pareti, 2)} m²{d.soffitto > 0 ? ` + soffitto ${fmtMq(d.soffitto, 2)} m²` : ''}
        {d.sottrazioni > 0 ? ` − sottrazioni ${fmtMq(d.sottrazioni, 2)} m²` : ''}
        {d.aggiunte > 0 ? ` + porzioni ${fmtMq(d.aggiunte, 2)} m²` : ''}
      </div>
    </div>
  );
}