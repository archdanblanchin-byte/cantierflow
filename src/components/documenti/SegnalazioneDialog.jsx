import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Flag } from "lucide-react";

export default function SegnalazioneDialog({ documento, onOpenChange, onCreated }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testo, setTesto] = useState("");
  const [tipo, setTipo] = useState("osservazione");
  const [loading, setLoading] = useState(false);

  useEffect(() => { setTesto(""); setTipo("osservazione"); }, [documento?.id]);

  const submit = async () => {
    if (!documento) return;
    if (!testo.trim()) { toast({ title: "Scrivi la segnalazione", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const rec = await base44.entities.SegnalazioneDocumento.create({
        documento_id: documento.id,
        documento_nome: documento.nome,
        user_email: user?.email,
        user_nome: user?.full_name,
        testo,
        tipo,
      });
      onCreated?.(rec);
      toast({ title: "Segnalazione inviata" });
      setTesto("");
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Errore", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!documento} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Flag className="w-4 h-4" /> Segnala documento</DialogTitle>
          <DialogDescription className="truncate">{documento?.nome}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="osservazione">Osservazione</SelectItem>
                <SelectItem value="problema">Problema</SelectItem>
                <SelectItem value="richiesta">Richiesta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seg-testo">Segnalazione</Label>
            <Textarea id="seg-testo" placeholder="es. Manca il cacciavite a stella nell'inventario, da aggiornare..." value={testo} onChange={(e) => setTesto(e.target.value)} rows={4} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={submit} disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Invia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}