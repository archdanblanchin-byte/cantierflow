import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function NewCantiereModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ nome: "", indirizzo: "", cliente: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.nome) return;
    setLoading(true);
    const created = await base44.entities.Cantiere.create({ ...form, attivo: true });
    setLoading(false);
    setForm({ nome: "", indirizzo: "", cliente: "" });
    onCreated(created);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo Cantiere</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome cantiere *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es. Cantiere Via Roma" />
          </div>
          <div>
            <Label>Indirizzo</Label>
            <Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} placeholder="Es. Via Roma 15, Milano" />
          </div>
          <div>
            <Label>Cliente</Label>
            <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Es. Rossi Costruzioni" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!form.nome || loading}>
            {loading ? "Creazione..." : "Crea Cantiere"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}