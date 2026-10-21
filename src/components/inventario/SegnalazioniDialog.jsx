import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Check, Flag } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

// Segnalazioni di materiale mancante da gestire da parte del magazziniere.
export default function SegnalazioniDialog({ open, onClose, onGestita }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: segnalazioni = [], isLoading } = useQuery({
    queryKey: ["segnalazioni-materiale-aperte"],
    queryFn: async () => {
      const page = await base44.entities.SegnalazioneMateriale.filter(
        { stato: "aperta" },
        { sort: "-created_date", limit: 100 }
      );
      return page?.items || [];
    },
    enabled: open,
  });

  const gestisci = async (s) => {
    try {
      await base44.entities.SegnalazioneMateriale.update(s.id, {
        stato: "gestita",
        gestita_da_nome: user?.full_name || user?.email || "",
      });
      toast.success("Segnalazione chiusa");
      queryClient.invalidateQueries({ queryKey: ["segnalazioni-materiale-aperte"] });
      onGestita?.();
    } catch (err) {
      toast.error("Operazione non riuscita: " + (err?.message || "riprova"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle className="pr-6 flex items-center gap-2">
            <Flag className="w-5 h-5 text-rose-600" /> Materiale segnalato mancante
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Caricamento...</p>
        ) : segnalazioni.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nessuna segnalazione aperta</p>
        ) : (
          <div className="space-y-2">
            {segnalazioni.map((s) => (
              <div key={s.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{s.materiale_nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.posizione_scaffale ? `Scaffale ${s.posizione_scaffale} · ` : ""}
                      {s.user_nome || s.user_email} ·{" "}
                      {s.created_date ? format(new Date(s.created_date), "d MMM HH:mm", { locale: it }) : ""}
                    </p>
                  </div>
                </div>
                <p className="text-xs bg-muted/50 rounded-lg p-2">{s.testo}</p>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => gestisci(s)}>
                  <Check className="w-3.5 h-3.5" /> Segna come gestita
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}