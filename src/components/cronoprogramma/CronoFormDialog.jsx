import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATI = [
  { value: "da_iniziare", label: "Da iniziare" },
  { value: "in_corso", label: "In corso" },
  { value: "completato", label: "Completato" },
];

export default function CronoFormDialog({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState({
    titolo: "",
    descrizione: "",
    data_inizio: "",
    data_fine: "",
    stato: "da_iniziare",
    progresso: 0,
    ordine: 0,
  });

  useEffect(() => {
    if (open) {
      setForm({
        titolo: initial?.titolo || "",
        descrizione: initial?.descrizione || "",
        data_inizio: initial?.data_inizio || "",
        data_fine: initial?.data_fine || "",
        stato: initial?.stato || "da_iniziare",
        progresso: initial?.progresso ?? 0,
        ordine: initial?.ordine ?? 0,
      });
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.titolo.trim()) return;
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifica fase" : "Nuova fase"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titolo</Label>
            <Input value={form.titolo} onChange={(e) => set("titolo", e.target.value)} placeholder="Es. Demolizione pareti" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrizione</Label>
            <Textarea value={form.descrizione} onChange={(e) => set("descrizione", e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data inizio</Label>
              <Input type="date" value={form.data_inizio} onChange={(e) => set("data_inizio", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data fine</Label>
              <Input type="date" value={form.data_fine} onChange={(e) => set("data_fine", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={form.stato} onValueChange={(v) => set("stato", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Progresso %</Label>
              <Input type="number" min={0} max={100} value={form.progresso} onChange={(e) => set("progresso", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Ordine</Label>
              <Input type="number" value={form.ordine} onChange={(e) => set("ordine", Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={submit}>{initial ? "Salva" : "Aggiungi"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}