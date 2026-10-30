import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import MaterialeCombobox from "@/components/wizard/MaterialeCombobox";
import { Plus, Trash2, Package } from "lucide-react";
import AudioMaterialiRecorder from "@/components/wizard/AudioMaterialiRecorder";
import NumeroInput from "@/components/wizard/NumeroInput";
import { Switch } from "@/components/ui/switch";

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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Aggiungi materiale</h2>
          <p className="text-sm text-muted-foreground">Scegli come aggiungere i materiali utilizzati durante la giornata.</p>
        </div>
      </div>

      {/* Controlli di inserimento — uno dopo l'altro, sopra l'elenco */}
      <div className="flex flex-col gap-2 sticky top-0 z-10 -mx-1 px-1 py-1 bg-background/95 backdrop-blur">
        <Button variant="outline" onClick={addMateriale} className="gap-2 h-11 w-full justify-center">
          <Plus className="w-4 h-4" />
          Manualmente
        </Button>
        <AudioMaterialiRecorder materialiBase={materialiBase} onResult={handleAudioResult} />
      </div>

      {/* Istruzioni di compilazione */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground">Cosa segnare per ogni materiale</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li><span className="font-medium text-foreground">Materiale</span>: cosa è stato usato (es. pittura bianca opaca, malta fine).</li>
          <li><span className="font-medium text-foreground">Quantità</span>: quanto ne è stato usato (es. 3, 0,5).</li>
          <li><span className="font-medium text-foreground">Unità / tipo di confezione</span>: secchio, sacco, tanica, kg, m, pz…</li>
          <li><span className="font-medium text-foreground">Provenienza</span>: dove l'avete preso — fornitore o magazzino (capannone).</li>
        </ul>
      </div>

      {materiali.map((mat, i) => (
        <div key={i} className="rounded-xl border border-border p-4 bg-card space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Materiale</Label>
                <MaterialeCombobox
                  materiali={materialiBase}
                  value={mat.materiale_id}
                  onSelect={(m) =>
                    updateMateriale(i, { materiale_id: m.id, nome: m.nome, unita_misura: m.unita_misura || "" })
                  }
                />
                {mat.materiale_id ? (
                  <button
                    type="button"
                    onClick={() => updateMateriale(i, { materiale_id: "", nome: "", unita_misura: "" })}
                    className="text-[11px] text-muted-foreground underline mt-1"
                  >
                    Usa un materiale personalizzato
                  </button>
                ) : null}
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
              <NumeroInput
                compact
                value={mat.quantita ?? 0}
                onChange={(v) => updateMateriale(i, { quantita: v })}
              />
            </div>
          </div>
          {(() => {
            const base = materialiBase.find((b) => b.id === mat.materiale_id);
            if (!base?.gestito_magazzino) return null;
            return (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-amber-900">Preso dal capannone</p>
                  <p className="text-[11px] text-amber-800">
                    Giacenza magazzino: {Number(base.giacenza || 0)} {base.unita_misura || ""}
                  </p>
                </div>
                <Switch
                  checked={!!mat.da_capannone}
                  onCheckedChange={(v) => updateMateriale(i, { da_capannone: v })}
                />
              </div>
            );
          })()}
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