import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// Pallina rosa che segnala note di cantiere non lette collegate al cantiere
// della programmazione. Al click apre le note e le segna come lette (letto_da).
export default function CantiereNoteDot({ cantiereNome, notes, currentUser }) {
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  // La nota di cantiere resta visibile a TUTTI per tutta la giornata:
  // non viene più segnata come letta al primo click, così ogni collega la vede.
  const today = new Date().toDateString();
  const attive = (notes || []).filter((n) => {
    if (n.completato) return false;
    return new Date(n.created_date).toDateString() === today;
  });
  if (attive.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="relative inline-flex items-center gap-1.5"
        title={`${attive.length} nota/e di cantiere`}
        aria-label={`${attive.length} nota/e di cantiere`}
      >
        <span className="w-3 h-3 rounded-full bg-pink-500 ring-2 ring-card animate-pulse shrink-0" />
        <span className="text-[11px] leading-tight text-pink-700 dark:text-pink-300 max-w-[150px] truncate text-left">
          {attive[0]?.testo}{attive.length > 1 ? ` (+${attive.length - 1})` : ""}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-pink-500" /> Note cantiere: {cantiereNome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(notes || []).map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{n.tipo}</Badge>
                  {n.priorita === "alta" && <Badge className="bg-rose-100 text-rose-700 text-[10px]">Alta</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {format(new Date(n.created_date), "d MMM HH:mm", { locale: it })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{n.testo}</p>
                <p className="text-[11px] text-muted-foreground">da {n.created_by}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}