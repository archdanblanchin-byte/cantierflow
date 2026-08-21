import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MapPin, Car, Trash2, CheckCheck, Bell, Users } from "lucide-react";
import { toast } from "sonner";

const TIPO_LABEL = { personale: "Personale", promemoria: "Promemoria", lista: "Lista", messaggio: "Messaggio" };
const TIPO_COLOR = {
  personale: "bg-slate-100 text-slate-700 border-slate-300",
  promemoria: "bg-amber-100 text-amber-700 border-amber-300",
  lista: "bg-sky-100 text-sky-700 border-sky-300",
  messaggio: "bg-violet-100 text-violet-700 border-violet-300",
};

export default function NotaCard({ nota, currentUser }) {
  const queryClient = useQueryClient();
  const isAuthor = nota.created_by === currentUser?.email;
  const isRecipient = (nota.destinatari_email || []).includes(currentUser?.email);
  const isRead = (nota.letto_da || []).includes(currentUser?.email);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["note"] });
    queryClient.invalidateQueries({ queryKey: ["note-ricevute"] });
  };

  // Segna come letto se sono destinatario e non l'ho ancora letto
  useEffect(() => {
    if (!currentUser || !isRecipient || isRead) return;
    base44.entities.Nota.update(nota.id, { letto_da: [...(nota.letto_da || []), currentUser.email] })
      .then(() => queryClient.invalidateQueries({ queryKey: ["note-ricevute"] }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nota.id, currentUser?.email]);

  const toggleItem = async (idx) => {
    const items = (nota.items || []).map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
    await base44.entities.Nota.update(nota.id, { items });
    refresh();
  };

  const toggleComplete = async () => {
    const willComplete = !nota.completato;
    await base44.entities.Nota.update(nota.id, { completato: willComplete, completato_da: willComplete ? currentUser?.email : null });
    // Notifica di completamento agli altri coinvolti (autore + destinatari tranne chi completa)
    if (willComplete && (nota.destinatari_email || []).length > 0 && !(nota.testo || "").startsWith("✓")) {
      const nome = currentUser?.full_name || currentUser?.email || "Qualcuno";
      const others = Array.from(new Set([nota.created_by, ...(nota.destinatari_email || [])])).filter((e) => e && e !== currentUser?.email);
      if (others.length > 0) {
        try {
          await base44.entities.Nota.create({
            testo: `✓ ${nome} ha completato il task: "${nota.testo}"`,
            tipo: "messaggio",
            destinatari_email: others,
            destinatari_nomi: others,
            cantiere_id: nota.cantiere_id || null,
            cantiere_nome: nota.cantiere_nome || null,
            furgone_id: nota.furgone_id || null,
            furgone_nome: nota.furgone_nome || null,
            priorita: "media",
            origine: "manuale",
          });
        } catch { /* notifica best-effort */ }
      }
    }
    refresh();
  };

  const handleDelete = async () => {
    try {
      await base44.entities.Nota.delete(nota.id);
      toast.success("Nota eliminata");
      refresh();
    } catch (e) {
      toast.error("Errore: " + e.message);
    }
  };

  return (
    <Card className={`p-4 space-y-2 ${nota.completato ? "opacity-60" : ""} ${isRecipient && !isRead ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={TIPO_COLOR[nota.tipo] || TIPO_COLOR.personale}>{TIPO_LABEL[nota.tipo] || nota.tipo}</Badge>
        {nota.priorita === "alta" && <Badge className="bg-rose-100 text-rose-700">Alta</Badge>}
        {nota.origine === "vocale" && <Badge variant="secondary" className="text-[10px]">vocale</Badge>}
        {isRecipient && !isRead && <Badge className="bg-primary text-primary-foreground text-[10px]">Nuova</Badge>}
        <span className="text-[11px] text-muted-foreground ml-auto">
          {format(new Date(nota.created_date), "d MMM HH:mm", { locale: it })}
        </span>
      </div>

      <p className={`text-sm ${nota.completato ? "line-through" : ""}`}>{nota.testo}</p>

      {nota.tipo === "lista" && (nota.items || []).length > 0 && (
        <div className="space-y-1 pt-1">
          {nota.items.map((it, i) => (
            <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={!!it.done} onCheckedChange={() => toggleItem(i)} />
              <span className={it.done ? "line-through text-muted-foreground" : ""}>{it.text}</span>
            </label>
          ))}
        </div>
      )}

      {(nota.cantiere_nome || nota.furgone_nome) && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {nota.cantiere_nome && <Badge variant="secondary" className="text-[10px] gap-1"><MapPin className="w-3 h-3" />{nota.cantiere_nome}</Badge>}
          {nota.furgone_nome && <Badge variant="secondary" className="text-[10px] gap-1"><Car className="w-3 h-3" />{nota.furgone_nome}</Badge>}
        </div>
      )}

      {(nota.destinatari_nomi || []).length > 0 && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Users className="w-3 h-3" /> A: {nota.destinatari_nomi.join(", ")}
        </div>
      )}

      {nota.data_promemoria && (
        <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
          <Bell className="w-3 h-3" /> Promemoria: {format(new Date(nota.data_promemoria), "d MMM yyyy 'alle' HH:mm", { locale: it })}
        </div>
      )}

      <div className="flex items-center gap-1 pt-1 border-t border-border">
        {(isAuthor || isRecipient || currentUser?.role === "admin") && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={toggleComplete}>
            <CheckCheck className="w-3.5 h-3.5" /> {nota.completato ? "Riapri" : "Completa"}
          </Button>
        )}
        {(isAuthor || currentUser?.role === "admin") && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive ml-auto" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Elimina
          </Button>
        )}
      </div>
    </Card>
  );
}