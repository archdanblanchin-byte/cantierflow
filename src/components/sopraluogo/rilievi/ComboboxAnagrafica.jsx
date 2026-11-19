import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, Plus, BookmarkPlus } from 'lucide-react';
import { normalizzaElenco } from '@/lib/normalizzaElenco';

// Selettore di una voce anagrafica: si sceglie dalla lista (deduplicata e
// ordinata) oppure si scrive un valore nuovo. Un valore nuovo o modificato
// può essere usato solo per questa voce (nessun salvataggio) oppure salvato
// nell'elenco riutilizzabile.
export default function ComboboxAnagrafica({ value, onChange, voci = [], onAggiungi, placeholder = 'Seleziona…', className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const pulite = normalizzaElenco(voci);
  const q = query.trim().toLowerCase();
  const filtrate = pulite.filter((v) => v.toLowerCase().includes(q));
  const esiste = pulite.some((v) => v.toLowerCase() === q);

  const scegli = (v) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  const usaPerVoce = () => {
    const nome = query.trim();
    if (!nome) return;
    scegli(nome);
  };

  const salvaEdUsa = async () => {
    const nome = query.trim();
    if (!nome) return;
    await onAggiungi?.(nome);
    scegli(nome);
  };

  const mostraNuova = query.trim() && !esiste;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`flex items-center justify-between gap-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left hover:bg-muted/40 transition-colors ${className}`}>
          <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>{value || placeholder}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[240px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cerca o scrivi…" value={query} onValueChange={setQuery} />
          <CommandList>
            {filtrate.length === 0 && !query.trim() && <CommandEmpty>Nessuna voce</CommandEmpty>}
            {filtrate.length > 0 && (
              <CommandGroup>
                {filtrate.map((v) => (
                  <CommandItem key={v} value={v} onSelect={() => scegli(v)}>
                    <Check className={`w-3.5 h-3.5 mr-2 ${value === v ? 'opacity-100' : 'opacity-0'}`} />
                    {v}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {mostraNuova && (
              <CommandGroup heading="Nuovo valore">
                <CommandItem value={`usa-${query}`} onSelect={usaPerVoce}>
                  <Plus className="w-3.5 h-3.5 mr-2" /> Usa solo per questa voce
                </CommandItem>
                <CommandItem value={`salva-${query}`} onSelect={salvaEdUsa}>
                  <BookmarkPlus className="w-3.5 h-3.5 mr-2" /> Salva nell'elenco e usa
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}