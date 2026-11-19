import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings2, Plus, Trash2 } from 'lucide-react';

function Lista({ titolo, anagrafica }) {
  const [nuova, setNuova] = useState('');

  const aggiungi = async () => {
    if (!nuova.trim()) return;
    await anagrafica.aggiungi(nuova.trim());
    setNuova('');
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{titolo}</p>
      <div className="flex flex-wrap gap-1.5">
        {anagrafica.voci.map((v) => {
          const record = anagrafica.extra.find((r) => r.nome === v);
          return (
            <span key={v} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 pl-2.5 pr-1.5 py-0.5 text-xs">
              {v}
              {record && (
                <button type="button" onClick={() => anagrafica.rimuovi(record.id)}
                  className="w-4 h-4 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input value={nuova} onChange={(e) => setNuova(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aggiungi(); } }}
          placeholder="Aggiungi voce…"
          className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs" />
        <button type="button" onClick={aggiungi}
          className="h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-muted flex items-center gap-1">
          <Plus className="w-3 h-3" /> Aggiungi
        </button>
      </div>
    </div>
  );
}

// Gestione delle anagrafiche usate dal rilevamento misure
export default function AnagraficheRilievo({ anagrafiche }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
          <Settings2 className="w-3.5 h-3.5" /> Anagrafiche
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anagrafiche rilevamento misure</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <Lista titolo="Lavorazioni" anagrafica={anagrafiche.lavorazioni} />
          <Lista titolo="Descrizioni / elementi" anagrafica={anagrafiche.elementi} />
          <Lista titolo="Stanze / zone" anagrafica={anagrafiche.stanze} />
          <Lista titolo="Unità di misura" anagrafica={anagrafiche.unita} />
          <Lista titolo="Elementi da sottrarre" anagrafica={anagrafiche.sottrazioni} />
        </div>
      </DialogContent>
    </Dialog>
  );
}