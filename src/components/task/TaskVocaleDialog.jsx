import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SheetSelect from "@/components/ui/sheet-select";
import NotaVocaleRecorder from "@/components/note/NotaVocaleRecorder";
import { PRIORITA, toLocalInput, buildDestOptions } from "@/lib/notaResolve";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Dettatura IA dei task: si parla liberamente, l'IA estrae uno o più task e
 * riconosce se sono personali oppure assegnati a una persona citata.
 * Prima di salvare si può correggere tutto.
 */
export default function TaskVocaleDialog({ open, onOpenChange, currentUser, onSaved }) {
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["collaboratori"], queryFn: () => base44.entities.Collaboratore.list() });

  const destOptions = buildDestOptions(users, collaboratori).filter((o) => o.email !== currentUser?.email);
  const opzioni = [
    { value: "nessuno", label: "Per me (personale)" },
    ...destOptions.map((o) => ({ value: o.email, label: o.nome })),
  ];

  const [fase, setFase] = useState("dettatura");
  const [list, setList] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) { setFase("dettatura"); setList([]); }
  }, [open]);

  const risolviAssegnatario = (nomi) => {
    const nome = (nomi || [])[0];
    if (!nome) return "";
    const low = String(nome).toLowerCase();
    const m = destOptions.find((o) => o.nome.toLowerCase().includes(low) || low.includes(o.nome.toLowerCase()));
    return m?.email || "";
  };

  const onResult = (tasks) => {
    const mapped = (tasks || [])
      .map((t) => ({
        testo: t.testo || "",
        priorita: t.priorita || "media",
        scadenza: toLocalInput(t.data_promemoria),
        assegnatario: risolviAssegnatario(t.destinatari_nomi),
      }))
      .filter((t) => t.testo.trim());
    if (!mapped.length) { toast.info("Nessun task riconosciuto, riprova parlando più chiaro"); return; }
    setList(mapped);
    setFase("revisione");
  };

  const update = (i, patch) => setList((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const remove = (i) => setList((l) => l.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const valid = list.filter((t) => t.testo.trim());
    if (!valid.length) { toast.error("Nessun task da salvare"); return; }
    setSaving(true);
    try {
      const payloads = valid.map((t) => ({
        testo: t.testo.trim(),
        tipo: "task",
        items: [],
        privata: !t.assegnatario,
        destinatari_email: t.assegnatario ? [t.assegnatario] : [],
        destinatari_nomi: t.assegnatario ? [destOptions.find((o) => o.email === t.assegnatario)?.nome || t.assegnatario] : [],
        assegnato_da: currentUser?.email || null,
        assegnato_da_nome: currentUser?.full_name || currentUser?.email || null,
        data_promemoria: t.scadenza ? new Date(t.scadenza).toISOString() : null,
        priorita: t.priorita,
        origine: "vocale",
      }));

      const creati = await base44.entities.Nota.bulkCreate(payloads);
      await Promise.all(
        (creati || [])
          .filter((c) => (c.destinatari_email || []).length > 0)
          .map((c) => base44.functions.invoke("notifica_task", { nota_id: c.id, evento: "assegnato" }).catch(() => {}))
      );

      toast.success(`${payloads.length} task creat${payloads.length > 1 ? "i" : "o"}`);
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
          <DialogTitle>{fase === "dettatura" ? "Dettatura task" : `Controlla (${list.length})`}</DialogTitle>
        </DialogHeader>

        {fase === "dettatura" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Parla liberamente: di' cosa devi fare. Se dici a chi è destinato (es. «di' a Marco di…») il task
              viene assegnato, altrimenti resta per te.
            </p>
            <NotaVocaleRecorder mode="task" colleghi={destOptions} onResult={onResult} />
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((t, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Textarea
                    rows={2}
                    value={t.testo}
                    onChange={(e) => update(i, { testo: e.target.value })}
                    className="text-base sm:text-sm"
                  />
                  <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => remove(i)} aria-label="Rimuovi">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Per chi</Label>
                    <SheetSelect
                      value={t.assegnatario || "nessuno"}
                      onValueChange={(v) => update(i, { assegnatario: v === "nessuno" ? "" : v })}
                      options={opzioni}
                      placeholder="Per me"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Priorità</Label>
                    <SheetSelect value={t.priorita} onValueChange={(v) => update(i, { priorita: v })} options={PRIORITA} placeholder="Priorità" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Scadenza (facoltativa)</Label>
                  <Input type="datetime-local" value={t.scadenza} onChange={(e) => update(i, { scadenza: e.target.value })} className="text-base sm:text-sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {fase === "revisione" && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setFase("dettatura")}>Indietro</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salva ({list.filter((t) => t.testo.trim()).length})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}