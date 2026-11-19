import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ValoreDialog({ open, titolo, etichetta, numerico, onConfirm, onClose }) {
  const [v, setV] = useState("");
  useEffect(() => { if (open) setV(""); }, [open]);

  const invia = (e) => {
    e.preventDefault();
    if (v.trim()) onConfirm(v.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{titolo}</DialogTitle></DialogHeader>
        <form onSubmit={invia} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{etichetta}</Label>
            <Input autoFocus value={v} onChange={(e) => setV(e.target.value)}
              inputMode={numerico ? "decimal" : "text"} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={!v.trim()}>Conferma</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}