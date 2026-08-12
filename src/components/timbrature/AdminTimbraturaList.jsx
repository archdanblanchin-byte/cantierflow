import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Pencil, Trash2, Clock } from "lucide-react";
import { STEP_CONFIG } from "@/lib/timbratureUtils";
import { syncRapportinoOreDaTimbratura } from "@/lib/rapportiniFromTimbrature";

const TIPI = ["ingresso", "pausa_inizio", "pausa_fine", "uscita", "spostamento"];

function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Componente di gestione timbrature per amministratori: modifica (tipo/data/cantiere/note) ed eliminazione.
export default function AdminTimbraturaList({ timbrature, cantieri = [], onCambiata }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const tOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

  const openEdit = (t) => {
    setEditing(t);
    setForm({
      tipo_evento: t.tipo_evento,
      data_ora: toLocalInput(t.data_ora),
      cantiere_id: t.cantiere_id || "",
      note: t.note || "",
    });
  };

  const salva = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const cantiere = cantieri.find((c) => c.id === form.cantiere_id);
      const payload = {
        tipo_evento: form.tipo_evento,
        data_ora: new Date(form.data_ora).toISOString(),
        cantiere_id: form.cantiere_id || null,
        cantiere_nome: cantiere?.nome || editing.cantiere_nome || null,
        note: form.note,
      };
      await base44.entities.Timbratura.update(editing.id, payload);
      // Ricalcola le ore del rapportino per cantiere di origine e destinazione
      const cantieriDaSync = new Set([editing.cantiere_id, form.cantiere_id].filter(Boolean));
      await Promise.all([...cantieriDaSync].map((cid) =>
        syncRapportinoOreDaTimbratura({ user_email: editing.user_email, cantiere_id: cid, giorno: editing.data_ora })
      ));
      setEditing(null);
      onCambiata?.();
    } finally {
      setSaving(false);
    }
  };

  const elimina = async () => {
    if (!deleting) return;
    await base44.entities.Timbratura.delete(deleting.id);
    // Ricalcola le ore del rapportino del cantiere/giorno del timbro eliminato
    if (deleting.cantiere_id) {
      await syncRapportinoOreDaTimbratura({
        user_email: deleting.user_email,
        cantiere_id: deleting.cantiere_id,
        giorno: deleting.data_ora,
      });
    }
    setDeleting(null);
    onCambiata?.();
  };

  if (tOrd.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-1">Gestione timbrature (admin)</p>
      {tOrd.map((t) => {
        const cfg = STEP_CONFIG[t.tipo_evento] || {};
        const Icon = cfg.icon || Clock;
        return (
          <div key={t.id} className="flex items-center gap-2 text-xs rounded-md border bg-card p-2">
            <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{cfg.label || t.tipo_evento} — {t.cantiere_nome || "—"}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(t.data_ora), "dd/MM/yyyy HH:mm", { locale: it })}
                {t.in_cantiere === false && <span className="text-amber-600 font-medium"> · Fuori posizione</span>}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} title="Modifica">
              <Pencil className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleting(t)} title="Elimina">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        );
      })}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifica timbratura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo evento</Label>
              <Select value={form.tipo_evento} onValueChange={(v) => setForm({ ...form, tipo_evento: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPI.map((tp) => <SelectItem key={tp} value={tp}>{STEP_CONFIG[tp]?.label || tp}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data e ora</Label>
              <Input type="datetime-local" value={form.data_ora} onChange={(e) => setForm({ ...form, data_ora: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cantiere</Label>
              <Select value={form.cantiere_id || "__none__"} onValueChange={(v) => setForm({ ...form, cantiere_id: v === "__none__" ? "" : v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Nessuno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nessuno</SelectItem>
                  {cantieri.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Note</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annulla</Button></DialogClose>
            <Button onClick={salva} disabled={saving || !form.data_ora}>{saving ? "Salvo..." : "Salva"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la timbratura?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (STEP_CONFIG[deleting.tipo_evento]?.label || deleting.tipo_evento) + " del " + format(new Date(deleting.data_ora), "dd/MM/yyyy HH:mm") + ". Operazione irreversibile."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={elimina} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}