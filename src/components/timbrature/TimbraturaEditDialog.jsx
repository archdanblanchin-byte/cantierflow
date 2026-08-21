import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const TIPI = [
  { value: "ingresso", label: "Ingresso" },
  { value: "pausa_inizio", label: "Inizio pausa" },
  { value: "pausa_fine", label: "Riprendi lavoro" },
  { value: "uscita", label: "Uscita" },
  { value: "spostamento", label: "Spostamento" },
];

// Converte un ISO in valore per datetime-local (senza timezone drift)
function toLocalInput(iso) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TimbraturaEditDialog({ open, timbratura, onOpenChange, onSave }) {
  const [tipo, setTipo] = useState("ingresso");
  const [dataOra, setDataOra] = useState("");
  const [cantiereNome, setCantiereNome] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (timbratura) {
      setTipo(timbratura.tipo_evento || "ingresso");
      setDataOra(toLocalInput(timbratura.data_ora));
      setCantiereNome(timbratura.cantiere_nome || "");
      setNote(timbratura.note || "");
    }
  }, [timbratura]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        tipo_evento: tipo,
        data_ora: new Date(dataOra).toISOString(),
        cantiere_nome: cantiereNome,
        note,
      };
      await onSave(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica timbratura</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {TIPI.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Data e ora</Label>
            <Input
              type="datetime-local"
              value={dataOra}
              onChange={(e) => setDataOra(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cantiere</Label>
            <Input value={cantiereNome} onChange={(e) => setCantiereNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || !dataOra}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}