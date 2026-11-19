import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import CampoNumero from '../CampoNumero';
import ComboboxAnagrafica from './ComboboxAnagrafica';
import { calcolaVoceStanza, creaVoceStanza, fmtMq } from '@/lib/rilievi';

// Porzioni aggiunte (+) o sottratte (−) al totale della stanza.
// tipo: 'aggiungi' | 'sottrai'
export default function PorzioniStanza({ voci = [], onChange, anagrafica, tipo = 'sottrai', nascondiBottone = false }) {
  const aggiunge = tipo === 'aggiungi';
  const aggiorna = (id, fields) => onChange(voci.map((v) => (v.id === id ? { ...v, ...fields } : v)));
  const rimuovi = (id) => onChange(voci.filter((v) => v.id !== id));
  const crea = () => onChange([...voci, creaVoceStanza()]);

  return (
    <div className="space-y-2">
      {voci.map((s) => (
        <div key={s.id} className="rounded-lg border border-border bg-background p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <ComboboxAnagrafica value={s.descrizione} voci={anagrafica.voci} onAggiungi={anagrafica.aggiungi}
              onChange={(v) => aggiorna(s.id, { descrizione: v })} placeholder="Descrizione" className="flex-1 h-8" />
            <button type="button" onClick={() => rimuovi(s.id)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-md overflow-hidden border border-input">
              {[{ k: 'semplice', l: 'Quantità' }, { k: 'bxa', l: 'Base × Alt.' }].map((m) => (
                <button key={m.k} type="button" onClick={() => aggiorna(s.id, { modalita: m.k })}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${s.modalita === m.k ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
                  {m.l}
                </button>
              ))}
            </div>
            {s.modalita === 'bxa' ? (
              <>
                <CampoNumero value={s.base} onChange={(e) => aggiorna(s.id, { base: e.target.value })} placeholder="Base" className="h-8 w-20 text-right text-xs" />
                <span className="text-xs text-muted-foreground">×</span>
                <CampoNumero value={s.altezza} onChange={(e) => aggiorna(s.id, { altezza: e.target.value })} placeholder="Alt." className="h-8 w-20 text-right text-xs" />
                <span className="text-xs text-muted-foreground">m</span>
              </>
            ) : (
              <>
                <CampoNumero value={s.quantita} onChange={(e) => aggiorna(s.id, { quantita: e.target.value })} placeholder="Quantità" className="h-8 w-20 text-right text-xs" />
                <ComboboxAnagrafica value={s.unita} voci={anagrafica.voci} onAggiungi={anagrafica.aggiungi}
                  onChange={(v) => aggiorna(s.id, { unita: v })} placeholder="m²" className="w-24 h-8" />
              </>
            )}
            <span className={`ml-auto text-xs font-semibold tabular-nums ${aggiunge ? 'text-primary' : 'text-foreground'}`}>
              {aggiunge ? '+' : '−'} {fmtMq(calcolaVoceStanza(s))} m²
            </span>
          </div>
        </div>
      ))}
      {!nascondiBottone && (
        <button type="button" onClick={crea}
          className="w-full text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/40 rounded-lg py-1.5 flex items-center justify-center gap-1.5 transition-colors">
          {aggiunge ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          {aggiunge ? 'Aggiungi porzione' : 'Sottrai porzione'}
        </button>
      )}
    </div>
  );
}