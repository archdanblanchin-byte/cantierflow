import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Users, Clock } from "lucide-react";

export default function Step2Collaboratori({ data, onChange, collaboratoriList }) {
  const collaboratori = data.collaboratori || [];

  const addCollaboratore = (id) => {
    const found = collaboratoriList.find((c) => c.id === id);
    if (!found || collaboratori.some((c) => c.collaboratore_id === id)) return;
    onChange({
      collaboratori: [
        ...collaboratori,
        {
          collaboratore_id: id,
          nome: found.nome,
          ore_lavorate: data.ore_totali_squadra || 0,
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

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Label className="text-xs font-medium uppercase tracking-wider text-primary">Ore Totali Squadra *</Label>
        <div className="flex items-center gap-3 mt-1.5">
          <Clock className="w-5 h-5 text-primary" />
          <Input
            type="number"
            min="0"
            step="0.5"
            value={data.ore_totali_squadra ?? ""}
            onChange={(e) => onChange({ ore_totali_squadra: parseFloat(e.target.value) || 0 })}
            className="w-32 text-lg font-semibold"
            placeholder="0"
          />
          <span className="text-sm text-muted-foreground">ore</span>
        </div>
      </div>

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
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={coll.ore_lavorate ?? ""}
                    onChange={(e) => updateCollaboratore(i, "ore_lavorate", parseFloat(e.target.value) || 0)}
                    className="mt-1"
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