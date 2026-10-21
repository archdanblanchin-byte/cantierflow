import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registraMovimento } from "@/lib/inventario";
import { cn } from "@/lib/utils";

const AZIONI = [
  { key: "carico", label: "Carico", icon: Plus, color: "bg-emerald-600" },
  { key: "scarico", label: "Scarico", icon: Minus, color: "bg-rose-600" },
  { key: "rettifica", label: "Rettifica", icon: Scale, color: "bg-slate-600" },
];

export default function MovimentoForm({ materiale, onDone, onCancel }) {
  const [tipo, setTipo] = useState("carico");
  const [quantita, setQuantita] = useState("");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  const salva = async () => {
    const valore = Number(String(quantita).replace(",", "."));
    if (!Number.isFinite(valore) || valore < 0 || quantita === "") {
      toast.error("Inserisci una quantità valida");
      return;
    }
    setSalvando(true);
    try {
      const esito = await registraMovimento({
        materialeId: materiale.id,
        tipo,
        quantita: valore,
        nota: nota.trim(),
      });
      if (esito?.error) throw new Error(esito.error);
      toast.success(
        tipo === "rettifica"
          ? `Giacenza impostata a ${esito.giacenza} ${materiale.unita_misura || ""}`
          : `${AZIONI.find((a) => a.key === tipo).label} registrato: ${esito.giacenza} ${materiale.unita_misura || ""}`
      );
      onDone?.();
    } catch (err) {
      toast.error("Movimento non registrato: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {AZIONI.map((a) => (
          <button
            key={a.key}
            onClick={() => setTipo(a.key)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border py-2.5 transition-colors",
              tipo === a.key ? "border-primary bg-card shadow-sm" : "border-transparent bg-card/60"
            )}
          >
            <span className={cn("w-7 h-7 rounded-full flex items-center justify-center", a.color)}>
              <a.icon className="w-4 h-4 text-white" />
            </span>
            <span className="text-[11px] font-semibold">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">
            {tipo === "rettifica" ? "Nuova giacenza" : "Quantità"} {materiale.unita_misura ? `(${materiale.unita_misura})` : ""}
          </Label>
          <Input
            type="number"
            inputMode="decimal"
            value={quantita}
            onChange={(e) => setQuantita(e.target.value)}
            placeholder="0"
            className="mt-1 bg-card"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Nota (facoltativa)</Label>
          <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Es. consegna fornitore" className="mt-1 bg-card" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={salva} disabled={salvando} className="flex-1 gap-2">
          {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
          Registra movimento
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={salvando}>
            Annulla
          </Button>
        )}
      </div>
    </div>
  );
}