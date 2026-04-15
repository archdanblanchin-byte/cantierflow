import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Wrench, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Step4LavorazioniNormali({ data, onChange, tipiLavorazione }) {
  const lavorazioni = data.lavorazioni_normali || [];
  const oreTotaliSquadra = data.ore_totali_squadra || 0;

  const sommaOreLavorazioni = lavorazioni.reduce((sum, l) => sum + (l.ore_totali || 0), 0);
  const delta = oreTotaliSquadra - sommaOreLavorazioni;
  const isValid = Math.abs(delta) < 0.01;

  const addLavorazione = () => {
    onChange({
      lavorazioni_normali: [
        ...lavorazioni,
        {
          tipo_lavorazione_id: "",
          tipo_lavorazione_nome: "",
          descrizione_custom: "",
          ore_totali: 0,
          modalita_calcolo: "manuale",
          numero_persone: 0,
          ore_per_persona: 0,
        },
      ],
    });
  };

  const updateLavorazione = (index, updates) => {
    const updated = [...lavorazioni];
    updated[index] = { ...updated[index], ...updates };
    // Auto-calc when "per_persone" mode
    if (updated[index].modalita_calcolo === "per_persone") {
      updated[index].ore_totali =
        (updated[index].numero_persone || 0) * (updated[index].ore_per_persona || 0);
    }
    onChange({ lavorazioni_normali: updated });
  };

  const removeLavorazione = (index) => {
    onChange({ lavorazioni_normali: lavorazioni.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Lavorazioni Normali</h2>
          <p className="text-sm text-muted-foreground">Attività svolte durante la giornata</p>
        </div>
      </div>

      {/* Validation indicator */}
      <div
        className={cn(
          "rounded-xl p-4 border flex items-center gap-3 transition-colors",
          isValid
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-destructive/30 bg-destructive/5 text-destructive"
        )}
      >
        {isValid ? (
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
        )}
        <div className="text-sm">
          <span className="font-medium">Ore squadra: {oreTotaliSquadra}h</span>
          <span className="mx-2">|</span>
          <span>Ore distribuite: {sommaOreLavorazioni.toFixed(1)}h</span>
          {!isValid && (
            <span className="ml-2 font-semibold">
              (Delta: {delta > 0 ? "+" : ""}{delta.toFixed(1)}h)
            </span>
          )}
        </div>
      </div>

      {lavorazioni.map((lav, i) => (
        <div key={i} className="rounded-xl border border-border p-4 bg-card space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo lavorazione</Label>
                <Select
                  value={lav.tipo_lavorazione_id || "custom"}
                  onValueChange={(val) => {
                    if (val === "custom") {
                      updateLavorazione(i, { tipo_lavorazione_id: "", tipo_lavorazione_nome: "" });
                    } else {
                      const tipo = tipiLavorazione.find((t) => t.id === val);
                      updateLavorazione(i, {
                        tipo_lavorazione_id: val,
                        tipo_lavorazione_nome: tipo?.nome || "",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tipiLavorazione.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                    <SelectItem value="custom">✏️ Personalizzata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!lav.tipo_lavorazione_id && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descrizione personalizzata</Label>
                  <Input
                    value={lav.descrizione_custom || ""}
                    onChange={(e) => updateLavorazione(i, { descrizione_custom: e.target.value })}
                    className="mt-1"
                    placeholder="Descrivi..."
                  />
                </div>
              )}
            </div>
            <Button variant="ghost" size="icon" className="ml-2 text-destructive" onClick={() => removeLavorazione(i)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Modalità inserimento ore</Label>
            <RadioGroup
              value={lav.modalita_calcolo || "manuale"}
              onValueChange={(val) => updateLavorazione(i, { modalita_calcolo: val })}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manuale" id={`man-${i}`} />
                <Label htmlFor={`man-${i}`} className="text-sm cursor-pointer">Manuale</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="per_persone" id={`pp-${i}`} />
                <Label htmlFor={`pp-${i}`} className="text-sm cursor-pointer">Per persone</Label>
              </div>
            </RadioGroup>
          </div>

          {lav.modalita_calcolo === "per_persone" ? (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">N° persone</Label>
                <Input
                  type="number"
                  min="0"
                  value={lav.numero_persone ?? ""}
                  onChange={(e) => updateLavorazione(i, { numero_persone: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ore/persona</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={lav.ore_per_persona ?? ""}
                  onChange={(e) => updateLavorazione(i, { ore_per_persona: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ore totali</Label>
                <Input
                  type="number"
                  value={lav.ore_totali ?? 0}
                  disabled
                  className="mt-1 bg-muted font-semibold"
                />
              </div>
            </div>
          ) : (
            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Ore totali</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={lav.ore_totali ?? ""}
                onChange={(e) => updateLavorazione(i, { ore_totali: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addLavorazione} className="gap-2">
        <Plus className="w-4 h-4" />
        Aggiungi Lavorazione
      </Button>
    </div>
  );
}