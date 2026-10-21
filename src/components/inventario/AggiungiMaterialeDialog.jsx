import { useState } from "react";
import { toast } from "sonner";
import { Loader2, PackagePlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SheetSelect from "@/components/ui/sheet-select";
import { registraMovimento } from "@/lib/inventario";

// Aggiunge all'inventario un materiale dell'anagrafe oppure uno nuovo.
export default function AggiungiMaterialeDialog({ open, onClose, materialiBase = [], onAdded }) {
  const [materialeId, setMaterialeId] = useState("");
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovaUnita, setNuovaUnita] = useState("");
  const [giacenza, setGiacenza] = useState("");
  const [soglia, setSoglia] = useState("");
  const [salvando, setSalvando] = useState(false);

  const disponibili = materialiBase.filter((m) => !m.gestito_magazzino);
  const nuovo = !materialeId;

  const reset = () => {
    setMaterialeId("");
    setNuovoNome("");
    setNuovaUnita("");
    setGiacenza("");
    setSoglia("");
  };

  const salva = async () => {
    const nome = nuovo ? nuovoNome.trim() : materialiBase.find((m) => m.id === materialeId)?.nome;
    if (!nome) {
      toast.error("Scegli un materiale o scrivine il nome");
      return;
    }
    setSalvando(true);
    try {
      const iniziale = Number(String(giacenza).replace(",", ".")) || 0;
      const sogliaNum = Number(String(soglia).replace(",", ".")) || 0;

      let record;
      if (nuovo) {
        record = await base44.entities.MaterialeBase.create({
          nome,
          unita_misura: nuovaUnita.trim(),
          gestito_magazzino: true,
          giacenza: 0,
          soglia_minima: sogliaNum,
        });
      } else {
        record = await base44.entities.MaterialeBase.update(materialeId, {
          gestito_magazzino: true,
          giacenza: 0,
          soglia_minima: sogliaNum,
        });
      }

      if (iniziale > 0) {
        await registraMovimento({ materialeId: record.id, tipo: "carico", quantita: iniziale, nota: "Giacenza iniziale" });
      }
      toast.success(`${nome} aggiunto all'inventario`);
      reset();
      onAdded?.();
      onClose();
    } catch (err) {
      toast.error("Materiale non aggiunto: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle className="pr-6 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" /> Materiale in inventario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Materiale dall'anagrafe</Label>
            <div className="mt-1">
              <SheetSelect
                value={materialeId}
                onValueChange={setMaterialeId}
                placeholder="Scegli dall'elenco..."
                options={disponibili.map((m) => ({ value: m.id, label: m.unita_misura ? `${m.nome} (${m.unita_misura})` : m.nome }))}
              />
            </div>
          </div>

          {nuovo && (
            <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
              <p className="text-xs text-muted-foreground">Oppure crea un materiale nuovo:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input value={nuovoNome} onChange={(e) => setNuovoNome(e.target.value)} className="mt-1" placeholder="Es. Malta" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unità</Label>
                  <Input value={nuovaUnita} onChange={(e) => setNuovaUnita(e.target.value)} className="mt-1" placeholder="sacco, kg, pz" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Giacenza iniziale</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={giacenza}
                onChange={(e) => setGiacenza(e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Soglia minima</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={soglia}
                onChange={(e) => setSoglia(e.target.value)}
                className="mt-1"
                placeholder="0"
              />
            </div>
          </div>

          <Button className="w-full gap-2" onClick={salva} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Aggiungi all'inventario
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}