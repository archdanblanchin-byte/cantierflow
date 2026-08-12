import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Package } from "lucide-react";
import AudioMaterialiRecorder from "@/components/wizard/AudioMaterialiRecorder";

export default function Step5Materiali({ data, onChange, materialiBase }) {
  const materiali = data.materiali || [];

  const addMateriale = () => {
    onChange({
      materiali: [
        ...materiali,
        { materiale_id: "", nome: "", descrizione_custom: "", descrizione: "", unita_misura: "", quantita: 0 },
      ],
    });
  };

  const updateMateriale = (index, updates) => {
    const updated = [...materiali];
    updated[index] = { ...updated[index], ...updates };
    onChange({ materiali: updated });
  };

  const removeMateriale = (index) => {
    onChange({ materiali: materiali.filter((_, i) => i !== index) });
  };

  const handleAudioResult = (items) => {
    const mapped = items.map((m) => {
      const match = materialiBase.find(
        (b) => b.nome.toLowerCase() === String(m.nome).toLowerCase()
      );
      if (match) {
        return {
          materiale_id: match.id,
          nome: match.nome,
          unita_misura: m.unita_misura || match.unita_misura || "",
          quantita: m.quantita || 0,
          descrizione_custom: "",
          descrizione: m.descrizione || "",
        };
      }
      return {
        materiale_id: "",
        nome: m.nome,
        unita_misura: m.unita_misura || "",
        quantita: m.quantita || 0,
        descrizione_custom: m.nome,
        descrizione: m.descrizione || "",
      };
    });
    onChange({ materiali: [...materiali, ...mapped] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Materiali</h2>
          <p className="text-sm text-muted-foreground">Materiali utilizzati durante la giornata</p>
        </div>
        <AudioMaterialiRecorder materialiBase={materialiBase} onResult={handleAudioResult} />
      </div>

      {materiali.map((mat, i) => (
        <div key={i} className="rounded-xl border border-border p-4 bg-card space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Materiale</Label>
                <Select
                  value={mat.materiale_id || "custom"}
                  onValueChange={(val) => {
                    if (val === "custom") {
                      updateMateriale(i, { materiale_id: "", nome: "", unita_misura: "" });
                    } else {
                      const m = materialiBase.find((m) => m.id === val);
                      updateMateriale(i, {
                        materiale_id: val,
                        nome: m?.nome || "",
                        unita_misura: m?.unita_misura || "",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona materiale..." />
                  </SelectTrigger>
                  <SelectContent>
                    {materialiBase.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} ({m.unita_misura})
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">✏️ Personalizzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!mat.materiale_id && (
                <div>
                  <Label className="text-xs text-muted-foreground">Nome personalizzato</Label>
                  <Input
                    value={mat.descrizione_custom || ""}
                    onChange={(e) => updateMateriale(i, { descrizione_custom: e.target.value })}
                    className="mt-1"
                    placeholder="Nome materiale..."
                  />
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="mt-5 text-destructive" onClick={() => removeMateriale(i)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Unità di misura</Label>
              <Input
                value={mat.unita_misura || ""}
                onChange={(e) => updateMateriale(i, { unita_misura: e.target.value })}
                className="mt-1"
                placeholder="Es. kg, m, pz..."
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Quantità</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={mat.quantita ?? ""}
                onChange={(e) => updateMateriale(i, { quantita: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Note / specifica (dove preso, dettagli)</Label>
            <Textarea
              value={mat.descrizione || ""}
              onChange={(e) => updateMateriale(i, { descrizione: e.target.value })}
              className="mt-1"
              placeholder="Es. ritirati al capannone, pittura bianca opaca..."
              rows={2}
            />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addMateriale} className="gap-2">
        <Plus className="w-4 h-4" />
        Aggiungi Materiale
      </Button>

      {materiali.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nessun materiale aggiunto</p>
          <p className="text-xs mt-1">Puoi saltare questo step se non sono stati utilizzati materiali</p>
        </div>
      )}
    </div>
  );
}