import React, { useState } from 'react';
import { Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import ComboboxAnagrafica from './ComboboxAnagrafica';
import MisuraCampi from './MisuraCampi';
import { MODALITA_RILIEVO, calcolaMisura, calcolaPorzione, creaMisura, fmtMq, formulaMisura, formulaPorzione, misurePorzione, unitaPorzione } from '@/lib/rilievi';

const etichetta = 'text-[10px] uppercase tracking-wider text-muted-foreground font-medium';

// Una porzione di misura: UNA modalità attiva e una o più misurazioni della
// stessa modalità, sommate tra loro. Cambiando modalità i dati precedenti
// vengono azzerati (nessuna somma tra modalità diverse).
export default function PorzioneRilievo({ porzione, onChange, onRemove, anagrafiche, altezzaPrecedente = '' }) {
  const [aperta, setAperta] = useState(true);
  const p = porzione;
  const misure = misurePorzione(p);
  const unita = unitaPorzione(p);
  const risultato = calcolaPorzione(p);
  const nome = p.descrizione || p.stanza || '';
  const isStanza = p.modalita === 'stanza';

  // La nuova modalità sostituisce completamente la precedente per questa porzione
  const cambiaModalita = (modalita) => {
    if (modalita === p.modalita) return;
    onChange({
      id: p.id,
      modalita,
      descrizione: nome,
      stanza: nome,
      unita: p.unita || 'm²',
      misure: [creaMisura(modalita, altezzaPrecedente)]
    });
  };

  const aggiornaMisura = (i, fields) => onChange({ ...p, misure: misure.map((m, idx) => (idx === i ? { ...m, ...fields } : m)) });
  const aggiungiMisura = () => onChange({ ...p, misure: [...misure, creaMisura(p.modalita, altezzaPrecedente)] });
  const rimuoviMisura = (i) => onChange({ ...p, misure: misure.filter((_, idx) => idx !== i) });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Riga porzione: nome, totale, comprimi ed elimina */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border bg-muted/30">
        <button type="button" onClick={() => setAperta((v) => !v)} title={aperta ? 'Comprimi porzione' : 'Espandi porzione'}
          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background flex-shrink-0">
          {aperta ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => setAperta((v) => !v)} className="flex-1 min-w-0 text-left">
          <p className={`text-sm truncate ${nome ? 'font-semibold' : 'text-muted-foreground'}`}>{nome || 'Porzione senza nome'}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
            {aperta ? `${misure.length} misure` : `${fmtMq(risultato)} ${unita}`}
          </p>
        </button>
        <span className="text-sm font-semibold tabular-nums flex-shrink-0">{fmtMq(risultato)} {unita}</span>
        <button type="button" onClick={onRemove} title="Elimina porzione"
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {aperta && (
        <>
          {/* Barra modalità */}
          <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto no-scrollbar border-b border-border bg-muted/20">
            {MODALITA_RILIEVO.map((m) => (
              <button key={m.key} type="button" onClick={() => cambiaModalita(m.key)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${p.modalita === m.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-background'}`}>
                {m.label}
              </button>
            ))}
            <button type="button" onClick={aggiungiMisura} title="Aggiungi un'altra misurazione a questa porzione"
              className="ml-auto flex-shrink-0 flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-background">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Nome della porzione: uno solo per tutte le sue misure */}
            <div className="space-y-1">
              <p className={etichetta}>{isStanza ? 'Stanza / zona' : 'Descrizione'}</p>
              <ComboboxAnagrafica value={nome}
                voci={isStanza ? anagrafiche.stanze.voci : anagrafiche.elementi.voci}
                onAggiungi={isStanza ? anagrafiche.stanze.aggiungi : anagrafiche.elementi.aggiungi}
                onChange={(v) => onChange({ ...p, descrizione: v, stanza: v })}
                placeholder={isStanza ? 'Scegli o scrivi la stanza' : "Scegli o scrivi l'elemento"} />
            </div>

            {p.modalita === 'semplice' && (
              <div className="space-y-1">
                <p className={etichetta}>Unità</p>
                <ComboboxAnagrafica value={p.unita} voci={anagrafiche.unita.voci} onAggiungi={anagrafiche.unita.aggiungi}
                  onChange={(v) => onChange({ ...p, unita: v })} placeholder="m²" />
              </div>
            )}

            {/* Misurazioni della stessa modalità */}
            <div className="space-y-2">
              {misure.map((m, i) => (
                <div key={i} className={misure.length > 1 ? 'rounded-lg border border-border bg-muted/20 p-2.5 space-y-2' : ''}>
                  {misure.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Misura {i + 1}</span>
                      <button type="button" onClick={() => rimuoviMisura(i)}
                        className="ml-auto w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <MisuraCampi misura={m} modalita={p.modalita} onChange={(fields) => aggiornaMisura(i, fields)}
                    anagrafiche={anagrafiche} altezzaPrecedente={altezzaPrecedente} />
                  {misure.length > 1 && (
                    <p className="text-right text-xs text-muted-foreground tabular-nums">
                      {formulaMisura(m, p.modalita)} = <strong className="text-foreground">{fmtMq(calcolaMisura(m, p.modalita))} {unita}</strong>
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Risultato */}
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
              <span className="text-xs text-muted-foreground tabular-nums truncate">{formulaPorzione(p)}</span>
              <span className="text-sm font-semibold tabular-nums flex-shrink-0">{fmtMq(risultato)} {unita}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}