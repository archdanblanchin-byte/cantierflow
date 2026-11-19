import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { nomeMisura, TIPI, valoreMisura } from "@/lib/misure";
import { exportCSV, exportPDF } from "@/lib/misureExport";

export default function EsportaMisureDialog({ open, onClose, project, page, misure, imageUrl }) {
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setSel(new Set(misure.map((m) => m.id))); }, [open]);

  const scelte = misure.filter((m) => sel.has(m.id));
  const tutte = sel.size === misure.length;
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const pdf = async () => {
    setBusy(true);
    await exportPDF({ project, page, misure: scelte, imageUrl });
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Esporta misurazioni</DialogTitle></DialogHeader>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={tutte} onCheckedChange={(v) => setSel(new Set(v ? misure.map((m) => m.id) : []))} />
          Seleziona tutto ({misure.length})
        </label>
        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
          {misure.map((m) => (
            <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer">
              <Checkbox checked={sel.has(m.id)} onCheckedChange={() => toggle(m.id)} />
              <span className="text-slate-400">{TIPI[m.type]?.label}</span>
              <span className="flex-1 truncate">{nomeMisura(m)}</span>
              <span className="font-semibold">{m.type === "text" ? "" : valoreMisura(m)}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={!scelte.length} onClick={() => exportCSV({ project, page, misure: scelte })}>Esporta CSV</Button>
          <Button disabled={!scelte.length || busy} onClick={pdf}>{busy ? "Creo il PDF…" : "Esporta PDF"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}