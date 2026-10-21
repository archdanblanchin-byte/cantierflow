import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { caricaCantieri } from "@/lib/campioni";
import CantiereSelect from "@/components/campioni/CantiereSelect";

// Registra dove è stato usato un campione: su un cantiere oppure con una nota libera.
export default function UsaCampioneDialog({ campione, open, onClose, onDone }) {
  const { user } = useAuth();
  const [modo, setModo] = useState("cantiere");
  const [cantiere, setCantiere] = useState(null);
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-campioni"],
    queryFn: caricaCantieri,
    enabled: open,
  });

  const registra = async () => {
    if (modo === "cantiere" && !cantiere) {
      toast.error("Scegli il cantiere dove è stato utilizzato");
      return;
    }
    if (modo === "nota" && !nota.trim()) {
      toast.error("Scrivi dove è stato utilizzato");
      return;
    }
    setSalvando(true);
    try {
      await base44.entities.Campione.update(campione.id, {
        stato: "utilizzato",
        usato_cantiere_id: modo === "cantiere" ? cantiere.id : "",
        usato_cantiere_nome: modo === "cantiere" ? cantiere.nome : "",
        usato_nota: modo === "nota" ? nota.trim() : "",
        usato_da_nome: user?.full_name || user?.email || "",
        data_utilizzo: new Date().toISOString(),
      });
      toast.success("Utilizzo registrato");
      onDone();
      onClose();
    } catch (err) {
      toast.error("Registrazione non riuscita: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle className="pr-6">Segna come utilizzato</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          {campione?.nome}
          {campione?.colore_nome ? ` · ${campione.colore_nome}` : ""}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModo("cantiere")}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              modo === "cantiere" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Su un cantiere
          </button>
          <button
            type="button"
            onClick={() => setModo("nota")}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              modo === "nota" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            Nota libera
          </button>
        </div>

        {modo === "cantiere" ? (
          <div>
            <Label>Cantiere</Label>
            <CantiereSelect cantieri={cantieri} value={cantiere?.id || ""} onChange={setCantiere} />
          </div>
        ) : (
          <div>
            <Label>Dove è stato utilizzato</Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Es. ritocchi in officina, uso personale, piccola riparazione..."
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Annulla
          </Button>
          <Button className="flex-1 gap-2" onClick={registra} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Registra utilizzo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}