import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, PenLine, ListChecks } from "lucide-react";
import { toast } from "sonner";
import AllegatiField from "@/components/note/AllegatiField";
import DisegnoEditor from "@/components/note/DisegnoEditor";
import DisegnoView from "@/components/note/DisegnoView";

/**
 * Editor di una nota personale: titolo, testo, checklist, disegno e file.
 */
export default function NotaEditorDialog({ open, onOpenChange, initial, onSaved }) {
  const [titolo, setTitolo] = useState("");
  const [testo, setTesto] = useState("");
  const [items, setItems] = useState([]);
  const [disegno, setDisegno] = useState("");
  const [allegati, setAllegati] = useState([]);
  const [disegnoOpen, setDisegnoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const inizializzato = useRef(false);

  useEffect(() => {
    if (!open) { inizializzato.current = false; return; }
    if (inizializzato.current) return;
    inizializzato.current = true;
    const init = initial || {};
    setTitolo(init.titolo || "");
    setTesto(init.testo || "");
    setItems((init.items || []).map((i) => ({ text: i.text || "", done: !!i.done })));
    setDisegno(init.disegno || "");
    setAllegati(init.allegati || []);
  }, [open, initial]);

  const addItem = () => setItems((it) => [...it, { text: "", done: false }]);
  const updateItem = (i, text) => setItems((it) => it.map((x, idx) => (idx === i ? { ...x, text } : x)));
  const removeItem = (i) => setItems((it) => it.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const t = testo.trim();
    if (!t && !titolo.trim()) { toast.error("Scrivi un titolo o un testo"); return; }
    setSaving(true);
    try {
      const lista = items.filter((i) => i.text.trim()).map((i) => ({ text: i.text.trim(), done: !!i.done }));
      const payload = {
        titolo: titolo.trim() || null,
        testo: t || titolo.trim(),
        tipo: lista.length ? "lista" : "personale",
        items: lista,
        disegno: disegno || null,
        allegati,
        privata: true,
        destinatari_email: [],
        destinatari_nomi: [],
        priorita: "media",
        origine: initial?._vocale ? "vocale" : "manuale",
      };
      if (initial?.id) await base44.entities.Nota.update(initial.id, payload);
      else await base44.entities.Nota.create(payload);
      toast.success(initial?.id ? "Nota aggiornata" : "Nota creata");
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
      <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto p-4 sm:p-6 top-[3%] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Modifica nota" : "Nuova nota"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Titolo</Label>
            <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Cose da fare in capannone" className="text-base sm:text-sm" />
          </div>

          <div className="space-y-1">
            <Label>Testo</Label>
            <Textarea rows={5} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Scrivi liberamente…" className="text-base sm:text-sm" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="flex-1 flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Checklist</Label>
              <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" /> Voce
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Aggiungi le voci da spuntare man mano che le completi.</p>
            ) : (
              <div className="space-y-1.5">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={it.text} onChange={(e) => updateItem(i, e.target.value)} placeholder="es. Ritirare il materiale" className="text-base sm:text-sm" />
                    <Button variant="ghost" size="icon" onClick={() => removeItem(i)} aria-label="Rimuovi voce">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Disegno</Label>
            {disegno ? (
              <div className="space-y-2">
                <DisegnoView file_uri={disegno} className="w-full rounded-xl border border-border bg-white" />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setDisegnoOpen(true)}>
                    <PenLine className="w-3.5 h-3.5" /> Rifai
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDisegno("")}>Rimuovi</Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setDisegnoOpen(true)}>
                <PenLine className="w-3.5 h-3.5" /> Disegna
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Allegati</Label>
            <AllegatiField value={allegati} onChange={setAllegati} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salva
          </Button>
        </DialogFooter>

        <DisegnoEditor open={disegnoOpen} onOpenChange={setDisegnoOpen} onSaved={setDisegno} />
      </DialogContent>
    </Dialog>
  );
}