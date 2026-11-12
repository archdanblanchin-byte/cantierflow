import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Check, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Selettore ibrido: su mobile usa un bottom sheet (Vaul), su desktop lo Select nativo shadcn.
 * Props: value, onValueChange, options([{value,label}]), placeholder, id, disabled, searchable.
 *
 * Con `searchable` si ottiene un campo di ricerca testuale: digitando una o più parole
 * l'elenco si filtra come un motore di ricerca (su tutto il testo dell'opzione).
 */
export default function SheetSelect({
  value,
  onValueChange,
  options = [],
  placeholder = "Seleziona...",
  id,
  disabled,
  searchable = false,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return options.filter((o) => {
      const hay = `${o.label || ""} ${o.value || ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [options, query, searchable]);

  const pick = (val) => {
    onValueChange?.(val);
    setOpen(false);
    setQuery("");
  };

  // Desktop + ricerca libera -> combobox con Popover + Command
  if (!isMobile && searchable) {
    return (
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            role="combobox"
            aria-expanded={open}
            className="mt-1 w-full justify-between font-normal"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-2" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Cerca scrivendo..."
                className="h-9"
              />
            </div>
            <CommandList>
              <CommandEmpty>Nessun risultato.</CommandEmpty>
              <CommandGroup>
                {filtered.map((o) => (
                  <CommandItem key={o.value} value={o.value} onSelect={() => pick(o.value)}>
                    <Check className={cn("mr-1 h-4 w-4 shrink-0", value === o.value ? "opacity-100" : "opacity-0")} />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Desktop senza ricerca -> Select nativo (comportamento originale)
  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} className="mt-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile -> Drawer (con campo di ricerca se searchable)
  return (
    <>
      <Button
        type="button"
        variant="outline"
        id={id}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="mt-1 w-full justify-between font-normal"
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </Button>
      <Drawer
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setQuery("");
            const restore = () => {
              if (document.body.style.pointerEvents === "none") document.body.style.pointerEvents = "";
            };
            requestAnimationFrame(restore);
            setTimeout(restore, 120);
            setTimeout(restore, 350);
          }
        }}
      >
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{placeholder}</DrawerTitle>
            <DrawerDescription>
              {searchable ? "Cerca o scegli un'opzione" : "Scegli un'opzione"}
            </DrawerDescription>
          </DrawerHeader>
          {searchable && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cerca scrivendo..."
                  className="pl-8"
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto px-2 pb-6">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Nessun risultato.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm hover:bg-accent transition-colors"
                >
                  <span className={cn(o.value === value && "font-medium")}>{o.label}</span>
                  {o.value === value && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}