import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Plus, BookmarkPlus } from 'lucide-react';
import { normalizzaElenco } from '@/lib/normalizzaElenco';

// Pulsante "+ AGGIUNGI LAVORAZIONE": sceglie dall'anagrafica (elenco
// deduplicato e ordinato) oppure digita una nuova lavorazione. Un valore
// nuovo può essere usato solo per questa voce (nessun salvataggio) oppure
// salvato nell'elenco riutilizzabile.
export default function SelettoreLavorazione({ voci = [], onScegli, onAggiungi, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const pulite = normalizzaElenco(voci);
  const q = query.trim().toLowerCase();
  const filtrate = pulite.filter((v) => v.toLowerCase().includes(q));
  const esiste = pulite.some((v) => v.toLowerCase() === q);

  const scegli = (nome) => {
    onScegli(nome);
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
        <Button type="button" variant="outline" className={`w-full gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary ${className}`}>
          <Plus className="w-4 h-4" /> Aggiungi lavorazione
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[260px]" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Cerca o scrivi una lavorazione…" value={query} onValueChange={setQuery} />
          <CommandList>
            {filtrate.length === 0 && !query.trim() && <CommandEmpty>Nessuna lavorazione</CommandEmpty>}
            {filtrate.length > 0 && (
              <CommandGroup heading="Lavorazioni">
                {filtrate.map((v) => (
                  <CommandItem key={v} value={v} onSelect={() => scegli(v)}>{v}</CommandItem>
                ))}
              </CommandGroup>
            )}
            {mostraNuova && (
              <CommandGroup heading="Nuova lavorazione">
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