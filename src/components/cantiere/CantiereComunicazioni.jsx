import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MessageSquarePlus, Boxes, Wrench, Check } from "lucide-react";
import NotaFormDialog from "@/components/note/NotaFormDialog";

/**
 * Comunicazioni collegate al cantiere: restano visibili nella scheda del
 * cantiere a tutti gli utenti autorizzati, così l'informazione arriva dove serve.
 */
export default function CantiereComunicazioni({ cantiere }) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => ({ cantiere_id: cantiere?.id, cantiere_nome: cantiere?.nome }), [cantiere?.id, cantiere?.nome]);

  const { data: note = [], refetch } = useQuery({
    queryKey: ["note-cantiere", cantiere?.id],
    queryFn: () => base44.entities.Nota.filter({ cantiere_id: cantiere.id, privata: false }, "-created_date", 50),
    enabled: !!cantiere?.id,
  });

  const lista = (note || []).filter((n) => (n.testo || "").trim());
  if (!cantiere) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Comunicazioni collegate ({lista.length})
        </h2>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setOpen(true)}>
          <MessageSquarePlus className="w-3.5 h-3.5" /> Nuova
        </Button>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nessuna comunicazione collegata a questo cantiere</p>
      ) : (
        <div className="space-y-2">
          {lista.map((n) => (
            <div key={n.id} className={`rounded-xl border border-border bg-card p-3 space-y-1.5 ${n.completato ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{n.tipo === "task" ? "Task" : n.tipo}</Badge>
                {n.priorita === "alta" && <Badge className="bg-rose-100 text-rose-700 text-[10px]">Alta</Badge>}
                {n.completato && <Badge variant="secondary" className="text-[10px] gap-1"><Check className="w-3 h-3" />Fatto</Badge>}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {format(new Date(n.created_date), "d MMM HH:mm", { locale: it })}
                </span>
              </div>
              <p className={`text-sm whitespace-pre-wrap ${n.completato ? "line-through text-muted-foreground" : ""}`}>{n.testo}</p>
              {(n.materiali || []).length > 0 || (n.attrezzi || []).length > 0 || n.furgone_nome ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {n.furgone_nome && <Badge variant="secondary" className="text-[10px]">{n.furgone_nome}</Badge>}
                  {(n.materiali || []).map((m) => <Badge key={m.id || m.nome} variant="secondary" className="text-[10px] gap-1"><Boxes className="w-3 h-3" />{m.nome}</Badge>)}
                  {(n.attrezzi || []).map((a) => <Badge key={a.id || a.nome} variant="secondary" className="text-[10px] gap-1"><Wrench className="w-3 h-3" />{a.nome}</Badge>)}
                </div>
              ) : null}
              <p className="text-[11px] text-muted-foreground">
                da {n.created_by}
                {(n.destinatari_nomi || []).length > 0 ? ` · a ${n.destinatari_nomi.join(", ")}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <NotaFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={initial}
        onSaved={() => refetch()}
        mode="comunicazione"
      />
    </div>
  );
}