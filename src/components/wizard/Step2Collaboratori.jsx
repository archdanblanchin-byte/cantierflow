import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, Users, Clock } from "lucide-react";

function OreInput({ value, onChange }) {
  const step = 0.25;

  const increment = () => onChange(Math.round((value + step) * 4) / 4);
  const decrement = () => onChange(Math.max(0, Math.round((value - step) * 4) / 4));

  const formatOre = (v) => {
    const intPart = Math.floor(v);
    const frac = Math.round((v - intPart) * 4);
    const fracMap = { 0: "00", 1: "15", 2: "30", 3: "45" };
    return `${intPart}:${fracMap[frac] ?? "00"}`;
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        onClick={decrement}
      >
        <Minus className="w-3 h-3" />
      </Button>
      <div className="flex-1 relative">
        <Input
          type="number"
          min="0"
          step="0.25"
          value={value ?? 0}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(Math.round(v * 4) / 4);
          }}
          className="text-center font-semibold pr-14"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          = {formatOre(value ?? 0)}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 flex-shrink-0"
        onClick={increment}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default function Step2Collaboratori({ data, onChange, collaboratoriList }) {
  const collaboratori = data.collaboratori || [];
  const oreTotali = data.ore_totali_squadra ?? 8;

  // Totale ore sommate dei collaboratori
  const totaleOreLavoratori = collaboratori.reduce((sum, c) => sum + (c.ore_lavorate || 0), 0);

  const addCollaboratore = (id) => {
    const found = collaboratoriList.find((c) => c.id === id);
    if (!found || collaboratori.some((c) => c.collaboratore_id === id)) return;
    onChange({
      collaboratori: [
        ...collaboratori,
        {
          collaboratore_id: id,
          nome: found.nome,
          ore_lavorate: oreTotali,
          note_imprevisti: "",
        },
      ],
    });
  };

  const updateCollaboratore = (index, field, value) => {
    const updated = [...collaboratori];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ collaboratori: updated });
  };

  const removeCollaboratore = (index) => {
    onChange({ collaboratori: collaboratori.filter((_, i) => i !== index) });
  };

  const available = collaboratoriList.filter(
    (c) => c.attivo !== false && !collaboratori.some((sel) => sel.collaboratore_id === c.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Collaboratori</h2>
          <p className="text-sm text-muted-foreground">Gestisci la squadra e le ore lavorate</p>
        </div>
      </div>

      {/* Ore totali squadra */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Label className="text-xs font-medium uppercase tracking-wider text-primary">Ore Totali Squadra *</Label>
        <div className="flex items-center gap-3 mt-1">
          <Clock className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 max-w-xs">
            <OreInput
              value={oreTotali}
              onChange={(v) => onChange({ ore_totali_squadra: v })}
            />
          </div>
          <span className="text-sm text-muted-foreground">ore</span>
        </div>
      </div>

      {/* Aggiungi collaboratore */}
      {available.length > 0 && (
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Aggiungi collaboratore</Label>
          <Select onValueChange={addCollaboratore}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Seleziona collaboratore..." />
            </SelectTrigger>
            <SelectContent>
              {available.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome} {c.ruolo ? `— ${c.ruolo}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Lista collaboratori */}
      {collaboratori.length > 0 && (
        <div className="space-y-3">
          {collaboratori.map((coll, i) => (
            <div key={coll.collaboratore_id} className="rounded-xl border border-border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground">
                    {coll.nome?.charAt(0)}
                  </div>
                  <span className="font-medium text-sm">{coll.nome}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCollaboratore(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Ore lavorate</Label>
                  <OreInput
                    value={coll.ore_lavorate ?? oreTotali}
                    onChange={(v) => updateCollaboratore(i, "ore_lavorate", v)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Note / Imprevisti</Label>
                  <Input
                    value={coll.note_imprevisti || ""}
                    onChange={(e) => updateCollaboratore(i, "note_imprevisti", e.target.value)}
                    className="mt-1"
                    placeholder="Opzionale..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totale ore lavoratori */}
      {collaboratori.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{collaboratori.length} lavorator{collaboratori.length === 1 ? "e" : "i"} × ore inserite</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-foreground">{totaleOreLavoratori.toFixed(2).replace(".", ",")}h</span>
            <p className="text-[10px] text-muted-foreground">Totale ore lavoratori</p>
          </div>
        </div>
      )}

      {collaboratori.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nessun collaboratore aggiunto</p>
          <p className="text-xs mt-1">Seleziona un collaboratore dal menu sopra</p>
        </div>
      )}
    </div>
  );
}