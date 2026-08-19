import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CantiereCombobox({ cantieri, value, onSelect, excludedIds = new Set(), placeholder = "Cerca cantiere..." }) {
  const [open, setOpen] = useState(false);
  const selected = cantieri.find((c) => c.id === value);

  const disponibili = cantieri.filter((c) => !excludedIds.has(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{selected.nome}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Cerca per nome cantiere..." />
          <CommandList>
            <CommandEmpty>
              {disponibili.length === 0 && cantieri.length > 0
                ? "Tutti i cantieri sono già assegnati per questa giornata."
                : "Nessun cantiere trovato."}
            </CommandEmpty>
            <CommandGroup>
              {disponibili.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nome} ${c.citta || ""} ${c.cliente || ""}`}
                  onSelect={() => {
                    onSelect(c.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("mr-1 w-4 h-4", value === c.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span>{c.nome}</span>
                    {c.citta && <span className="text-xs text-muted-foreground">{c.citta}</span>}
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