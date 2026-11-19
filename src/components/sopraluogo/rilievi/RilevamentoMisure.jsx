import React, { useState } from 'react';
import { Ruler } from 'lucide-react';
import BloccoLavorazione from './BloccoLavorazione';
import SelettoreLavorazione from './SelettoreLavorazione';
import AnagraficheRilievo from './AnagraficheRilievo';
import { useAnagraficheRilievo } from '@/hooks/useAnagraficheRilievo';
import { creaLavorazione, ultimaAltezzaStanze, totaliRilievi, fmtMq } from '@/lib/rilievi';

// Sezione "Rilevamento misure": rilievo dinamico organizzato per lavorazioni
export default function RilevamentoMisure({ rilievi = [], onChange }) {
  const anagrafiche = useAnagraficheRilievo();
  const [espansa, setEspansa] = useState(null);

  const totali = totaliRilievi(rilievi);
  const riepilogo = Object.entries(totali).map(([u, v]) => `${fmtMq(v)} ${u}`).join(' · ');

  const aggiungiLavorazione = (nome) => {
    const nuova = creaLavorazione(nome, ultimaAltezzaStanze(rilievi));
    onChange([...rilievi, nuova]);
    setEspansa(nuova.id);
  };

  return (
    <div className="space-y-3">
      {/* Intestazione con totale complessivo */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Ruler className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">Rilevamento misure</p>
            <p className="text-[11px] text-muted-foreground tabular-nums truncate">
              {riepilogo || 'Nessuna misura rilevata'}
            </p>
          </div>
        </div>
        <AnagraficheRilievo anagrafiche={anagrafiche} />
      </div>

      {rilievi.length === 0 &&
      <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-xl hidden">
          Aggiungi una lavorazione per iniziare a rilevare le misure.
        </div>
      }

      {rilievi.map((lav) =>
      <BloccoLavorazione key={lav.id} lav={lav} rilievi={rilievi} anagrafiche={anagrafiche}
      onChange={(aggiornata) => onChange(rilievi.map((l) => l.id === lav.id ? aggiornata : l))}
      onRemove={() => onChange(rilievi.filter((l) => l.id !== lav.id))} />
      )}

      <SelettoreLavorazione voci={anagrafiche.lavorazioni.voci}
      onScegli={aggiungiLavorazione}
      onAggiungi={anagrafiche.lavorazioni.aggiungi} />
    </div>);
}