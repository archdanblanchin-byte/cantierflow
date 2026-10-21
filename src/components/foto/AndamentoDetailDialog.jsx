import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, MessageSquare, Pencil, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import FotoPrivata from "@/components/foto/FotoPrivata";

export default function AndamentoDetailDialog({ sessione, open, onClose, onDelete, onEdit, isAdmin }) {
  const [ingrandita, setIngrandita] = useState(null);
  if (!sessione) return null;
  const foto = sessione.foto || [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto top-4 translate-y-0 p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
          <DialogTitle className="pr-6">{sessione.titolo || sessione.cantiere_nome || "Foto andamento"}</DialogTitle>
          <p className="text-xs text-muted-foreground">{sessione.cantiere_nome}</p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {sessione.data ? format(new Date(sessione.data), "d MMMM yyyy", { locale: it }) : "-"}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {sessione.user_nome || sessione.user_email}
            </span>
            <span>{foto.length} foto</span>
          </div>

          {sessione.nota_generale && (
            <div className="rounded-xl bg-muted/60 p-3 flex gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm">{sessione.nota_generale}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {foto.map((f, i) => (
              <div key={i} className="space-y-1.5">
                <button className="w-full text-left" onClick={() => setIngrandita(f)}>
                  <FotoPrivata
                    file_uri={f.url_annotata || f.file_uri}
                    className="aspect-square rounded-xl border border-border"
                  />
                </button>
                {f.nota && <p className="text-xs text-muted-foreground">{f.nota}</p>}
              </div>
            ))}
          </div>

          {foto.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nessuna foto in questa sessione.</p>}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(sessione)}>
            <Pencil className="w-4 h-4" /> Aggiungi foto o note
          </Button>
          {isAdmin && (
            <Button variant="outline" className="gap-2 text-destructive" onClick={() => onDelete(sessione)}>
              <Trash2 className="w-4 h-4" /> Elimina
            </Button>
          )}
        </div>
      </DialogContent>

      <Dialog open={Boolean(ingrandita)} onOpenChange={(v) => !v && setIngrandita(null)}>
        <DialogContent className="max-w-4xl p-2">
          <FotoPrivata file_uri={ingrandita?.url_annotata || ingrandita?.file_uri} fit="contain" className="h-[70vh] w-full" />
          {ingrandita?.nota && <p className="text-sm text-muted-foreground px-2 pb-1">{ingrandita.nota}</p>}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}