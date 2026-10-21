import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MovimentoForm from "@/components/inventario/MovimentoForm";
import MovimentiStorico from "@/components/inventario/MovimentiStorico";
import { sottoSoglia } from "@/lib/inventario";

export default function MaterialeDialog({ materiale, open, onClose, isGestore, onChanged }) {
  const [soglia, setSoglia] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (materiale) setSoglia(String(materiale.soglia_minima ?? 0));
  }, [materiale]);

  if (!materiale) return null;
  const basso = sottoSoglia(materiale);

  const salvaSoglia = async () => {
    setSalvando(true);
    try {
      await base44.entities.MaterialeBase.update(materiale.id, { soglia_minima: Number(soglia.replace(",", ".")) || 0 });
      toast.success("Soglia aggiornata");
      onChanged?.();
      onClose();
    } catch (err) {
      toast.error("Soglia non salvata: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  const rimuovi = async () => {
    setSalvando(true);
    try {
      await base44.entities.MaterialeBase.update(materiale.id, { gestito_magazzino: false });
      toast.success("Materiale rimosso dall'inventario");
      onChanged?.();
      onClose();
    } catch (err) {
      toast.error("Operazione non riuscita: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle className="pr-6">{materiale.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${basso ? "border-amber-400 bg-amber-50" : "border-border bg-card"}`}>
            <p className="text-3xl font-bold tracking-tight">
              {Number(materiale.giacenza || 0)}
              <span className="text-base font-medium text-muted-foreground ml-1.5">{materiale.unita_misura || ""}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Soglia minima: {Number(materiale.soglia_minima || 0)} {materiale.unita_misura || ""}
            </p>
            {basso && (
              <p className="text-xs font-semibold text-amber-800 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Scorta sotto la soglia: avvisa il magazziniere
              </p>
            )}
          </div>

          <MovimentoForm
            materiale={materiale}
            onDone={() => {
              onChanged?.();
              onClose();
            }}
          />

          {isGestore && (
            <div className="rounded-xl border border-border p-3 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Soglia minima</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={soglia}
                    onChange={(e) => setSoglia(e.target.value)}
                  />
                  <Button variant="outline" onClick={salvaSoglia} disabled={salvando}>
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive gap-1.5 px-0" onClick={rimuovi} disabled={salvando}>
                <Trash2 className="w-3.5 h-3.5" /> Rimuovi dall'inventario
              </Button>
            </div>
          )}

          <MovimentiStorico materialeId={materiale.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}