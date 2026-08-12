import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Zap } from "lucide-react";
import OreInput from "@/components/wizard/OreInput";

export default function Step3LavorazioniExtra({ data, onChange }) {
  const extras = data.lavorazioni_extra || [];
  const hasExtra = data.has_lavorazioni_extra || false;

  const addExtra = () => {
    onChange({ lavorazioni_extra: [...extras, { descrizione: "", ore: 0 }] });
  };

  const updateExtra = (index, field, value) => {
    const updated = [...extras];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ lavorazioni_extra: updated });
  };

  const removeExtra = (index) => {
    onChange({ lavorazioni_extra: extras.filter((_, i) => i !== index) });
  };

  const totaleExtra = extras.reduce((sum, e) => sum + (e.ore || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Lavorazioni Extra</h2>
          <p className="text-sm text-muted-foreground">Attività aggiuntive non previste dal preventivo (Concordato)</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
        <Switch
          checked={hasExtra}
          onCheckedChange={(checked) => {
            onChange({
              has_lavorazioni_extra: checked,
              lavorazioni_extra: checked && extras.length === 0 ? [{ descrizione: "", ore: 0 }] : extras,
            });
          }}
        />
        <span className="text-sm font-medium">Ci sono lavorazioni extra?</span>
      </div>

      {hasExtra && (
        <>
          {extras.map((extra, i) => (
            <div key={i} className="rounded-xl border border-border p-4 bg-card">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Descrizione</Label>
                    <Input
                      value={extra.descrizione || ""}
                      onChange={(e) => updateExtra(i, "descrizione", e.target.value)}
                      className="mt-1"
                      placeholder="Descrivi la lavorazione extra..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Ore</Label>
                    <OreInput
                      value={extra.ore ?? 0}
                      onChange={(v) => updateExtra(i, "ore", v)}
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="mt-5 text-destructive" onClick={() => removeExtra(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addExtra} className="gap-2">
            <Plus className="w-4 h-4" />
            Aggiungi Lavorazione Extra
          </Button>

          {extras.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Totale ore extra</span>
              <span className="text-lg font-bold">{totaleExtra.toFixed(2).replace(".", ",")}h</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}