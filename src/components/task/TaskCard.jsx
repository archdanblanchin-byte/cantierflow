import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Trash2, Pencil, Users, Bell, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import TaskFormDialog from "@/components/task/TaskFormDialog";

/**
 * Riga di un task: spunta rapida, assegnatario e notifica a chi l'ha assegnato.
 */
export default function TaskCard({ nota, currentUser, onChanged }) {
  const [editing, setEditing] = useState(false);
  const isAutore = nota.created_by === currentUser?.email;
  const assegnatari = nota.destinatari_email || [];
  const isAssegnato = assegnatari.includes(currentUser?.email);
  const isLetto = (nota.letto_da || []).includes(currentUser?.email);
  const assegnatoAdAltri = assegnatari.length > 0 && !isAssegnato;

  // Chi riceve il task lo segna come letto: sparisce dalle notifiche nuove.
  useEffect(() => {
    if (!currentUser || !isAssegnato || isLetto) return;
    base44.entities.Nota.update(nota.id, { letto_da: [...(nota.letto_da || []), currentUser.email] })
      .then(() => onChanged?.())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nota.id, currentUser?.email]);

  const toggleComplete = async () => {
    const completato = !nota.completato;
    try {
      await base44.entities.Nota.update(nota.id, {
        completato,
        completato_da: completato ? currentUser?.email : null,
      });

      // Chi completa un task ricevuto avvisa chi gliel'ha assegnato.
      if (completato && isAssegnato && !isAutore) {
        const mittente = currentUser?.full_name || currentUser?.email;
        const destinatario = nota.assegnato_da || nota.created_by;
        try {
          await base44.entities.Nota.create({
            testo: `✓ ${mittente} ha completato il task: "${nota.testo}"`,
            tipo: "messaggio",
            privata: false,
            destinatari_email: [destinatario],
            destinatari_nomi: [nota.assegnato_da_nome || destinatario],
            priorita: "media",
            origine: "manuale",
          });
        } catch { /* notifica in app best-effort */ }
        try {
          await base44.functions.invoke("notifica_task", { nota_id: nota.id, evento: "completato" });
        } catch { /* email best-effort */ }
      }

      onChanged?.();
    } catch (e) {
      toast.error("Errore: " + e.message);
    }
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Nota.delete(nota.id);
      toast.success("Task eliminato");
      onChanged?.();
    } catch (e) {
      toast.error("Errore: " + e.message);
    }
  };

  return (
    <Card className={`p-3 space-y-1.5 ${nota.completato ? "opacity-60" : ""} ${isAssegnato && !isLetto ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {nota.priorita === "alta" && <Badge className="bg-rose-100 text-rose-700">Alta</Badge>}
        {nota.priorita === "bassa" && <Badge variant="secondary">Bassa</Badge>}
        {nota.origine === "vocale" && <Badge variant="secondary" className="text-[10px]">vocale</Badge>}
        {isAssegnato && !isLetto && <Badge className="bg-primary text-primary-foreground text-[10px]">Nuovo</Badge>}
        <span className="text-[11px] text-muted-foreground ml-auto">
          {format(new Date(nota.created_date), "d MMM HH:mm", { locale: it })}
        </span>
      </div>

      {isAssegnato && (
        <p className="flex items-center gap-1 text-[11px] text-primary">
          <ArrowDownLeft className="w-3 h-3" /> Assegnato da {nota.assegnato_da_nome || nota.assegnato_da || nota.created_by}
        </p>
      )}
      {assegnatoAdAltri && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ArrowUpRight className="w-3 h-3" /> Assegnato a {(nota.destinatari_nomi || assegnatari).join(", ")}
        </p>
      )}

      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox checked={!!nota.completato} onCheckedChange={toggleComplete} className="mt-0.5" />
        <span className={`text-sm ${nota.completato ? "line-through text-muted-foreground" : ""}`}>{nota.testo}</span>
      </label>

      {nota.data_promemoria && (
        <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
          <Bell className="w-3 h-3" /> Entro {format(new Date(nota.data_promemoria), "d MMM yyyy 'alle' HH:mm", { locale: it })}
        </div>
      )}

      {nota.completato && nota.completato_da && (
        <p className="flex items-center gap-1 text-[11px] text-emerald-700">
          <Users className="w-3 h-3" /> Completato da {nota.completato_da}
        </p>
      )}

      {(isAutore || currentUser?.role === "admin") && (
        <div className="flex items-center gap-1 pt-1 border-t border-border">
          <Button variant="ghost" size="sm" className="gap-1 text-xs ml-auto" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" /> Modifica
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Elimina
          </Button>
        </div>
      )}

      {editing && (
        <TaskFormDialog open={editing} onOpenChange={setEditing} initial={nota} onSaved={() => { setEditing(false); onChanged?.(); }} />
      )}
    </Card>
  );
}