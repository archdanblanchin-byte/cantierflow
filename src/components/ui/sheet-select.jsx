import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Selettore ibrido: su mobile usa un bottom sheet (Vaul), su desktop lo Select nativo shadcn.
 * Props: value, onValueChange, options([{value,label}]), placeholder, id.
 */
export default function SheetSelect({
  value,
  onValueChange,
  options = [],
  placeholder = "Seleziona...",
  id,
  disabled,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

  const selected = options.find((o) => o.value === value);

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
            // Fix bug di Vaul: a volte body.pointerEvents resta "none" dopo la chiusura,
            // bloccando l'intera pagina (non si può più andare avanti).
            requestAnimationFrame(() => {
              if (document.body.style.pointerEvents === "none") {
                document.body.style.pointerEvents = "";
              }
            });
          }
        }}
      >
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{placeholder}</DrawerTitle>
            <DrawerDescription>Scegli un'opzione</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-2 pb-6">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onValueChange?.(o.value);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm hover:bg-accent transition-colors"
              >
                <span className={cn(o.value === value && "font-medium")}>{o.label}</span>
                {o.value === value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}