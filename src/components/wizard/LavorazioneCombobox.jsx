import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Wrench, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

// Selettore lavorazione con ricerca libera: si digita una o più parole
// (es. "tintegg", "pitt") e si ottengono tutte le voci del catalogo che
// corrispondono, indipendentemente dalla categoria.
export default function LavorazioneCombobox({
  tipiLavorazione = [],
  value, // tipo_lavorazione_id
  onSelect, // (tipo) => void
  onCustom, // () => void  -> passa in modalità "scrivi manualmente"
  placeholder = "Cerca lavorazione...",
  isCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = tipiLavorazione.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal mt-1"
        >
          {isCustom ? (
            <span className="flex items-center gap-2 truncate text-muted-foreground">
              <PencilLine className="w-4 h-4 shrink-0" />
              <span className="truncate">Manuale</span>
            </span>
          ) : selected ? (
            <span className="flex items-center gap-2 truncate">
              <Wrench className="w-4 h-4 text-muted-foreground shrink-0" />
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
          <CommandInput placeholder="Scrivi una o più parole..." />
          <CommandList>
            <CommandEmpty>Nessuna lavorazione trovata.</CommandEmpty>
            <CommandGroup>
              {tipiLavorazione.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.nome} ${t.categoria || ""}`}
                  onSelect={() => {
                    onSelect(t);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-1 w-4 h-4 shrink-0", value === t.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{t.nome}</span>
                    {t.categoria && (
                      <span className="text-xs text-muted-foreground truncate">{t.categoria}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem
                value="__custom_manual__ scrivi manualmente non trovata"
                onSelect={() => {
                  onCustom?.();
                  setOpen(false);
                }}
              >
                <PencilLine className="mr-1 w-4 h-4 shrink-0" />
                <span>Non trovata — scrivi manualmente</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}