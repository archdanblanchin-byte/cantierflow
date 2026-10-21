import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SheetSelect from "@/components/ui/sheet-select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PRIORITA, toLocalInput, buildDestOptions } from "@/lib/notaResolve";

/**
 * Creazione / modifica di un task: personale se non ha assegnatario,
 * altrimenti assegnato a un utente dell'app che riceve la notifica.
 */
export default function TaskFormDialog({ open, onOpenChange, initial, onSaved }) {
  const [utente, setUtente] = useState(null);
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["collaboratori"], queryFn: () => base44.entities.Collaboratore.list() });

  const [testo, setTesto] = useState("");
  const [priorita, setPriorita] = useState("media");
  const [assegnatario, setAssegnatario] = useState("");
  const [scadenza, setScadenza] = useState("");
  const [saving, setSaving] = useState(false);
  const inizializzato = useRef(false);

  useEffect(() => { base44.auth.me().then(setUtente).catch(() => {}); }, []);

  const opzioni = [
    // "nessuno" è un valore sentinella: lo Select non accetta una voce vuota.
    { value: "nessuno", label: "Nessuno (task personale)" },
    ...buildDestOptions(users, collaboratori)
      .filter((o) => o.email !== utente?.email)
      .map((o) => ({ value: o.email, label: `${o.nome} · ${o.email}` })),
  ];

  useEffect(() => {
    if (!open) { inizializzato.current = false; return; }
    if (inizializzato.current) return;
    inizializzato.current = true;
    const init = initial || {};
    setTesto(init.testo || "");
    setPriorita(init.priorita || "media");
    setAssegnatario((init.destinatari_email || [])[0] || "");
    setScadenza(toLocalInput(init.data_promemoria));
  }, [open, initial]);

  const handleSave = async () => {
    if (!testo.trim()) { toast.error("Scrivi il task"); return; }
    setSaving(true);
    try {
      const scelto = opzioni.find((o) => o.value === assegnatario);
      const payload = {
        testo: testo.trim(),
        tipo: "task",
        items: [],
        privata: !assegnatario,
        destinatari_email: assegnatario ? [assegnatario] : [],
        destinatari_nomi: assegnatario && scelto ? [scelto.label.split(" · ")[0]] : [],
        assegnato_da: utente?.email || null,
        assegnato_da_nome: utente?.full_name || utente?.email || null,
        data_promemoria: scadenza ? new Date(scadenza).toISOString() : null,
        priorita,
        origine: "manuale",
      };

      if (initial?.id) {
        await base44.entities.Nota.update(initial.id, payload);
      } else {
        const creato = await base44.entities.Nota.create(payload);
        if (assegnatario) {
          try {
            await base44.functions.invoke("notifica_task", { nota_id: creato.id, evento: "assegnato" });
          } catch { /* la notifica email è best-effort */ }
        }
      }

      toast.success(initial?.id ? "Task aggiornato" : assegnatario ? "Task assegnato" : "Task creato");
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
          <DialogTitle>{initial?.id ? "Modifica task" : "Nuovo task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Task</Label>
            <Textarea rows={3} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Es. Preparare il preventivo per il cliente Rossi" className="text-base sm:text-sm" />
          </div>

          <div className="space-y-1">
            <Label>Assegna a</Label>
            <SheetSelect
              value={assegnatario || "nessuno"}
              onValueChange={(v) => setAssegnatario(v === "nessuno" ? "" : v)}
              options={opzioni}
              placeholder="Nessuno (task personale)"
            />
            <p className="text-[11px] text-muted-foreground">
              {assegnatario
                ? "Chi riceve il task lo vede nella sua sezione Task e riceve una notifica in app e via email. Quando lo completa, tu vieni avvisato."
                : "Task personale: resta solo a te."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Priorità</Label>
              <SheetSelect value={priorita} onValueChange={setPriorita} options={PRIORITA} placeholder="Priorità" />
            </div>
            <div className="space-y-1">
              <Label>Scadenza</Label>
              <Input type="datetime-local" value={scadenza} onChange={(e) => setScadenza(e.target.value)} className="text-base sm:text-sm" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}