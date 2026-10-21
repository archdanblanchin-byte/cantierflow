import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Pencil, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import FotoPrivata from "@/components/foto/FotoPrivata";
import ConfrontoPrimaDopo from "@/components/foto/ConfrontoPrimaDopo";

export default function MarketingDetailDialog({ confronto, open, onClose, onEdit, onDelete, isAdmin }) {
  if (!confronto) return null;
  const haEntrambe = Boolean(confronto.foto_prima && confronto.foto_dopo);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[94vh] overflow-y-auto top-4 translate-y-0 p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
          <DialogTitle className="pr-6">{confronto.titolo || "Confronto prima/dopo"}</DialogTitle>
          <p className="text-xs text-muted-foreground">{confronto.cantiere_nome}</p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {confronto.data_prima && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Prima: {format(new Date(confronto.data_prima), "d MMM yyyy", { locale: it })}
              </span>
            )}
            {confronto.data_dopo && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Dopo: {format(new Date(confronto.data_dopo), "d MMM yyyy", { locale: it })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {confronto.user_nome || confronto.user_email}
            </span>
          </div>

          {haEntrambe ? (
            <ConfrontoPrimaDopo
              prima_uri={confronto.foto_prima}
              dopo_uri={confronto.foto_dopo}
              className="aspect-[4/3]"
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FotoPrivata file_uri={confronto.foto_prima} className="aspect-[4/3] rounded-xl border border-border" />
                <p className="text-[11px] text-muted-foreground text-center mt-1">Prima</p>
              </div>
              <div>
                <FotoPrivata file_uri={confronto.foto_dopo} className="aspect-[4/3] rounded-xl border border-border" />
                <p className="text-[11px] text-muted-foreground text-center mt-1">Dopo (da scattare)</p>
              </div>
            </div>
          )}

          {haEntrambe && <p className="text-[11px] text-muted-foreground">Trascina il cursore per confrontare prima e dopo.</p>}

          {confronto.nota_prima && (
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Prima</p>
              <p className="text-sm">{confronto.nota_prima}</p>
            </div>
          )}
          {confronto.nota_dopo && (
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Dopo</p>
              <p className="text-sm">{confronto.nota_dopo}</p>
            </div>
          )}
        </div>

        {(onEdit || isAdmin) && (
          <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex gap-2">
            {onEdit && (
              <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(confronto)}>
                <Pencil className="w-4 h-4" /> {confronto.foto_dopo ? "Modifica" : "Scatta il dopo"}
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" className="gap-2 text-destructive" onClick={() => onDelete(confronto)}>
                <Trash2 className="w-4 h-4" /> Elimina
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}