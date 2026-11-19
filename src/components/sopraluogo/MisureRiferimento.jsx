import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import CampoNumero from './CampoNumero';

function generateId() { return Math.random().toString(36).slice(2, 9); }

const UNITA = ['mq', 'ml', 'm', 'pz', 'lt', 'kg', 'n°'];

export default function MisureRiferimento({ misure, onChange, ambito = 'interno' }) {
  const list = misure || [];

  const add = () => onChange([...list, { id: generateId(), descrizione: '', valore: '', unita: 'mq', ambito }]);
  const update = (i, fields) => onChange(list.map((m, idx) => (idx === i ? { ...m, ...fields } : m)));
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Es: ponteggi, copertura, metri di lattoneria, numero spalette…</p>
      {list.map((m, i) => (
        <div key={m.id || i} className="bg-amber-50/40 border border-amber-200/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input className="h-8 text-xs flex-1" placeholder="Es: Ponteggi"
              value={m.descrizione || ''} onChange={(e) => update(i, { descrizione: e.target.value })} />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => remove(i)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <CampoNumero className="h-8 w-28 text-xs" placeholder="0"
              value={m.valore || ''} onChange={(e) => update(i, { valore: e.target.value })} />
            <select className="h-8 text-xs rounded-md border border-input bg-transparent px-2"
              value={m.unita || 'mq'} onChange={(e) => update(i, { unita: e.target.value })}>
              {UNITA.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-amber-400 text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition-colors">
        + Aggiungi misura di riferimento
      </button>
    </div>
  );
}