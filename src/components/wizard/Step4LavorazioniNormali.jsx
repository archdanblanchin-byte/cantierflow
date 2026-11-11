import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Wrench, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import OreInput from "@/components/wizard/OreInput";
import NumeroInput from "@/components/wizard/NumeroInput";
import LavorazioneCombobox from "@/components/wizard/LavorazioneCombobox";
import { fmtOre } from "@/lib/timbratureUtils";

export default function Step4LavorazioniNormali({ data, onChange, tipiLavorazione }) {
  const lavorazioni = data.lavorazioni_normali || [];

  // Ore lavoratori: somma ore dei collaboratori (se presenti), altrimenti ore_squadra
  const oreLavoratori = (data.collaboratori || []).reduce((sum, c) => sum + (c.ore_lavorate || 0), 0)
    || (data.ore_totali_squadra || 0);

  // Ore extra
  const oreExtra = data.has_lavorazioni_extra
    ? (data.lavorazioni_extra || []).reduce((sum, l) => sum + (l.ore || 0), 0)
    : 0;

  // Ore normali
  const oreNormali = lavorazioni.reduce((sum, l) => sum + (l.ore_totali || 0), 0);

  // Formula: ore_lavoratori - ore_extra - ore_normali = 0
  const delta = oreLavoratori - oreExtra - oreNormali;
  const isValid = Math.abs(delta) < 0.01;
  const isSforato = delta < -0.01;
  const isMancante = delta > 0.01;

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
          <p className="text-sm text-muted-foreground">Attività svolte durante la giornata (da preventivo)</p>
        </div>
      </div>

      {/* Lista lavorazioni + aggiungi + quadro in fondo */}
      {lavorazioni.map((lav, i) => (
        <div key={i} className="rounded-xl border border-border p-4 bg-card space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              {/* Ricerca lavorazione su tutto il catalogo */}
              <div>
                <Label className="text-xs text-muted-foreground">Lavorazione</Label>
                <LavorazioneCombobox
                  tipiLavorazione={tipiLavorazione}
                  value={lav.tipo_lavorazione_id || ""}
                  isCustom={!lav.tipo_lavorazione_id && (lav.descrizione_custom || "").trim() !== ""}
                  placeholder="Cerca lavorazione..."
                  onSelect={(tipo) => updateLavorazione(i, {
                    tipo_lavorazione_id: tipo.id,
                    tipo_lavorazione_nome: tipo.nome || "",
                    categoria: tipo.categoria || "",
                    descrizione_custom: "",
                  })}
                  onCustom={() => updateLavorazione(i, {
                    tipo_lavorazione_id: "",
                    tipo_lavorazione_nome: "",
                    descrizione_custom: lav.descrizione_custom || "",
                    categoria: "",
                  })}
                />
              </div>

              {/* Campo libero se tipo non trovato nel catalogo */}
              {!lav.tipo_lavorazione_id && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descrizione</Label>
                  <Input
                    value={lav.descrizione_custom || ""}
                    onChange={(e) => updateLavorazione(i, { descrizione_custom: e.target.value, tipo_lavorazione_nome: e.target.value })}
                    className="mt-1"
                    placeholder="Descrivi la lavorazione..."
                  />
                </div>
              )}

              {/* Categoria di provenienza (solo se dal catalogo) */}
              {lav.tipo_lavorazione_id && lav.categoria && (
                <span className="inline-block text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                  {lav.categoria}
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" className="text-destructive mt-6 flex-shrink-0" onClick={() => removeLavorazione(i)}>
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
                <NumeroInput
                  value={lav.numero_persone ?? 0}
                  step={1}
                  onChange={(v) => updateLavorazione(i, { numero_persone: v })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ore/persona</Label>
                <OreInput
                  compact
                  value={lav.ore_per_persona ?? 0}
                  onChange={(v) => updateLavorazione(i, { ore_per_persona: v })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ore totali</Label>
                <Input type="text" value={fmtOre(lav.ore_totali ?? 0)} disabled className="mt-1 bg-muted font-semibold text-center text-xs" />
              </div>
            </div>
          ) : (
            <div className="w-44">
              <Label className="text-xs text-muted-foreground">Ore totali</Label>
              <OreInput
                compact
                value={lav.ore_totali ?? 0}
                onChange={(v) => updateLavorazione(i, { ore_totali: v })}
              />
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" onClick={addLavorazione} className="gap-2">
        <Plus className="w-4 h-4" />
        Aggiungi Lavorazione
      </Button>

      {/* Quadro riepilogativo — sempre in fondo */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/40 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quadro ore</span>
        </div>
        <div className="divide-y divide-border">
          <div className="flex justify-between items-center px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Ore lavoratori</span>
            <span className="font-semibold">{fmtOre(oreLavoratori)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">− Ore extra</span>
            <span className="font-semibold text-amber-600">−{fmtOre(oreExtra)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">− Ore normali (da preventivo)</span>
            <span className="font-semibold text-primary">−{fmtOre(oreNormali)}</span>
          </div>
          <div
            className={cn(
              "flex justify-between items-center px-4 py-3 text-sm font-bold border-t-2",
              isValid && "border-green-300 bg-green-50 text-green-800",
              isMancante && "border-amber-300 bg-amber-50 text-amber-800",
              isSforato && "border-red-300 bg-red-50 text-red-700",
            )}
          >
            <div className="flex items-center gap-2">
              {isValid && <CheckCircle2 className="w-4 h-4" />}
              {isMancante && <AlertTriangle className="w-4 h-4" />}
              {isSforato && <AlertCircle className="w-4 h-4" />}
              <span>
                {isValid && "✅ In pareggio — puoi procedere"}
                {isMancante && `⚠️ Mancano ${fmtOre(Math.abs(delta))} da assegnare`}
                {isSforato && `❌ Sforato di ${fmtOre(Math.abs(delta))}`}
              </span>
            </div>
            <span className={isValid ? "text-green-700" : isSforato ? "text-red-700" : "text-amber-700"}>
              = {delta < 0 ? "−" : ""}{fmtOre(Math.abs(delta))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}