import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotaEditableFields from "@/components/note/NotaEditableFields";
import { resolveNota, buildNotaPayload, buildDestOptions } from "@/lib/notaResolve";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { maybeMirrorNotaToFurgone } from "@/lib/notaFurgoneMirror";

/**
 * Revisione di più note estratte da una singola registrazione vocale.
 * Ogni nota è modificabile; si possono aggiungere/rimuovere note e salvare tutto.
 */
export default function NotaReviewDialog({ open, onOpenChange, notes = [], onSaved }) {
  const { data: cantieri = [] } = useQuery({ queryKey: ["cantieri"], queryFn: () => base44.entities.Cantiere.list() });
  const { data: furgoni = [] } = useQuery({ queryKey: ["furgoni"], queryFn: () => base44.entities.Furgone.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["collaboratori"], queryFn: () => base44.entities.Collaboratore.list() });

  const destOptions = buildDestOptions(users, collaboratori);
  const [list, setList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setList((notes || []).map((n) => resolveNota(n, { cantieri, furgoni, destOptions })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notes, cantieri, furgoni, users, collaboratori]);

  const update = (i, v) => setList((l) => l.map((x, idx) => (idx === i ? v : x)));
  const remove = (i) => setList((l) => l.filter((_, idx) => idx !== i));
  const addEmpty = () => setList((l) => [...l, { tipo: "personale", testo: "", items: [], cantiere_id: "", furgone_id: "", destinatari_email: [], data_promemoria: "", priorita: "media", origine: "vocale" }]);

  const handleSave = async () => {
    const valid = list.filter((n) => (n.testo || "").trim());
    if (!valid.length) { toast.error("Nessuna nota con contenuto"); return; }
    setSaving(true);
    try {
      const payloads = valid.map((n) => buildNotaPayload(n, { cantieri, furgoni, destOptions }));
      const created = await base44.entities.Nota.bulkCreate(payloads);
      await Promise.all((created || []).map((c) => maybeMirrorNotaToFurgone(c)));
      toast.success(`${payloads.length} note create`);
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Errore: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisiona note ({list.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nessuna nota riconosciuta. Puoi aggiungerne una manualmente.</p>}
          {list.map((n, i) => (
            <div key={i} className="rounded-xl border border-border p-3 space-y-2 bg-muted/30">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">Nota {i + 1}</Badge>
                <Badge variant="outline" className="text-[10px]">{n.origine === "vocale" ? "vocale" : "manuale"}</Badge>
                <Button variant="ghost" size="icon" className="ml-auto w-8 h-8" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
              <NotaEditableFields value={n} onChange={(v) => update(i, v)} cantieri={cantieri} furgoni={furgoni} destOptions={destOptions} />
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1 w-full" onClick={addEmpty}><Plus className="w-4 h-4" />Aggiungi un'altra nota</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salva {list.length > 0 ? `(${list.filter((n) => (n.testo || "").trim()).length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}