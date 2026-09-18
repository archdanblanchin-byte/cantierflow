import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Plus, Loader2 } from "lucide-react";

/**
 * Dialog che chiede all'utente di scegliere un cantiere dopo aver premuto un bottone.
 * Mostra una lista filtrabile di cantieri attivi + opzione "nuovo cantiere".
 */
export default function CantierePickerDialog({
  open,
  onClose,
  onConfirm,
  cantieri = [],
  title = "Seleziona cantiere",
  loading = false,
  onNewCantiere,
}) {
  const [q, setQ] = useState("");

  const filtrati = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (cantieri || [])
      .filter((c) => (c.stato ? c.stato === "aperto" : c.attivo !== false))
      .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "it"));
    if (!term) return list;
    return list.filter(
      (c) =>
        (c.nome || "").toLowerCase().includes(term) ||
        (c.codice || "").toLowerCase().includes(term) ||
        (c.citta || "").toLowerCase().includes(term)
    );
  }, [cantieri, q]);

  const handlePick = (cantiere) => {
    setQ("");
    onConfirm(cantiere);
  };

  const handleClose = () => {
    setQ("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca cantiere..."
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-[200px]">
          {filtrati.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {q ? "Nessun cantiere trovato" : "Nessun cantiere disponibile"}
            </p>
          )}
          {filtrati.map((c) => (
            <button
              key={c.id}
              onClick={() => handlePick(c)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50 border border-transparent hover:border-border"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.nome}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[c.codice, c.citta, c.cliente].filter(Boolean).join(" · ")}
                </p>
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {onNewCantiere && (
            <Button
              variant="outline"
              onClick={() => { setQ(""); onNewCantiere(); }}
              disabled={loading}
              className="flex-1 gap-2"
            >
              <Plus className="w-4 h-4" /> Nuovo cantiere
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
            className="flex-1"
          >
            Annulla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}