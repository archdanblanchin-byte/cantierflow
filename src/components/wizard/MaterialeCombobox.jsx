import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";

// Selettore materiale con ricerca: l'anagrafe di magazzino è molto grande,
// quindi si cerca per nome, posizione di scaffale o fornitore.
export default function MaterialeCombobox({ materiali, value, onSelect, placeholder = "Cerca materiale..." }) {
  const [open, setOpen] = useState(false);
  const selected = materiali.find((m) => m.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal mt-1">
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{selected.nome}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Cerca per nome, scaffale o fornitore..." />
          <CommandList>
            <CommandEmpty>Nessun materiale trovato.</CommandEmpty>
            <CommandGroup>
              {materiali.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.nome} ${m.posizione_scaffale || ""} ${m.fornitore || ""}`}
                  onSelect={() => {
                    onSelect(m);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-1 w-4 h-4 shrink-0", value === m.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{m.nome}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {m.posizione_scaffale ? `Scaffale ${m.posizione_scaffale}` : "senza scaffale"}
                      {m.unita_misura ? ` · ${m.unita_misura}` : ""}
                      {m.gestito_magazzino ? ` · in magazzino: ${Number(m.giacenza || 0)}` : ""}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}