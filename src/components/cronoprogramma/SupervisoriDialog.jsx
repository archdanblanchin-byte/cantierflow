import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { PALETTE } from "@/lib/cronoCalc";

const VUOTO = { nome: "", ruolo: "capocantiere", colore: PALETTE[0] };

export default function SupervisoriDialog({ open, onClose, supervisori }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(VUOTO);
  const [editId, setEditId] = useState(null);
  const done = () => { qc.invalidateQueries({ queryKey: ["supervisori"] }); qc.invalidateQueries({ queryKey: ["crono-cantieri"] }); };
  const onError = (e) => toast({ title: "Operazione non riuscita", description: e.message, variant: "destructive" });

  const salva = useMutation({
    mutationFn: () => (editId ? base44.entities.Supervisore.update(editId, form) : base44.entities.Supervisore.create(form)),
    onSuccess: () => { done(); setForm(VUOTO); setEditId(null); },
    onError,
  });
  const elimina = useMutation({
    mutationFn: (id) => base44.entities.Supervisore.delete(id),
    onSuccess: done,
    onError,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Gestisci supervisori</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {supervisori.length === 0 && <p className="text-sm text-muted-foreground">Nessun supervisore creato.</p>}
          {supervisori.map((s) => (
            <div key={s.id} className="flex items-center gap-2 border rounded-lg p-2">
              <span className="w-4 h-4 rounded-full" style={{ background: s.colore }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.nome}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{s.ruolo}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setEditId(s.id); setForm({ nome: s.nome, ruolo: s.ruolo, colore: s.colore || PALETTE[0] }); }}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (window.confirm(`Eliminare ${s.nome}?`)) elimina.mutate(s.id); }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-2">
          <p className="text-sm font-semibold">{editId ? "Modifica supervisore" : "Nuovo supervisore"}</p>
          <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Select value={form.ruolo} onValueChange={(v) => setForm({ ...form, ruolo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="capocantiere">Capocantiere</SelectItem>
              <SelectItem value="responsabile">Responsabile</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setForm({ ...form, colore: c })} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: c }}>
                {form.colore === c && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!form.nome.trim() || salva.isPending} onClick={() => salva.mutate()}>{editId ? "Salva" : "Aggiungi"}</Button>
            {editId && <Button variant="outline" onClick={() => { setEditId(null); setForm(VUOTO); }}>Annulla</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}