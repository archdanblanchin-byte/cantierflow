import { useState } from "react";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { segnalaMaterialeMancante } from "@/lib/inventario";

// Chiunque in squadra può segnalare che un prodotto non c'è più:
// la segnalazione arriva al magazziniere e all'amministratore.
export default function SegnalaMancanteDialog({ materiale, open, onClose, onInviata }) {
  const { user } = useAuth();
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);

  if (!materiale) return null;

  const invia = async () => {
    setInvio(true);
    try {
      await segnalaMaterialeMancante({ materiale, testo, user });
      toast.success("Segnalazione inviata al magazziniere");
      setTesto("");
      onInviata?.();
      onClose();
    } catch (err) {
      toast.error("Segnalazione non inviata: " + (err?.message || "riprova"));
    } finally {
      setInvio(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle className="pr-6 flex items-center gap-2">
            <Flag className="w-5 h-5 text-rose-600" /> Segnala materiale mancante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-sm font-semibold">{materiale.nome}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {materiale.posizione_scaffale ? `Scaffale ${materiale.posizione_scaffale} · ` : ""}
              giacenza {Number(materiale.giacenza || 0)} {materiale.unita_misura || ""}
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Cosa manca o cosa hai notato</Label>
            <Textarea
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Es. non c'è più, ho preso l'ultimo secchio..."
            />
          </div>

          <Button className="w-full gap-2" onClick={invia} disabled={invio}>
            {invio && <Loader2 className="w-4 h-4 animate-spin" />}
            Invia segnalazione
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}