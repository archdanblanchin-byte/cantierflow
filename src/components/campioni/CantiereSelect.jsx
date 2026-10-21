import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Scelta del cantiere fra quelli in anagrafe: si può scrivere il nome
// (o la città, o il cliente) e la lista si filtra da sola.
export default function CantiereSelect({ cantieri, value, onChange, placeholder = "Scegli il cantiere" }) {
  const [open, setOpen] = useState(false);
  const ordinati = [...cantieri].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "it"));
  const selezionato = ordinati.find((c) => c.id === value);

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
          {selezionato ? (
            <span className="flex items-center gap-2 truncate">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">
                {selezionato.nome}
                {selezionato.citta ? ` · ${selezionato.citta}` : ""}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
        <Command>
          <CommandInput placeholder="Scrivi il nome del cantiere..." />
          <CommandList>
            <CommandEmpty>Nessun cantiere trovato.</CommandEmpty>
            <CommandGroup>
              {ordinati.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nome || ""} ${c.citta || ""} ${c.cliente || ""}`}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-1 w-4 h-4 shrink-0", value === c.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{c.nome}</span>
                    {(c.citta || c.cliente) && (
                      <span className="text-xs text-muted-foreground truncate">
                        {[c.citta, c.cliente].filter(Boolean).join(" · ")}
                      </span>
                    )}
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