import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SheetSelect from "@/components/ui/sheet-select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Zap, Wrench, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import AudioLavorazioniRecorder from "@/components/wizard/AudioLavorazioniRecorder";
import OreInput from "@/components/wizard/OreInput";

const fmtH = (n) => Number(n || 0).toFixed(2).replace(".", ",");

// ─── LAVORAZIONI EXTRA ────────────────────────────────────────────────────────

function LavorazioniExtra({ data, onChange }) {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
        <Switch
          checked={hasExtra}
          onCheckedChange={(checked) => {
            onChange({
              has_lavorazioni_extra: checked,
              lavorazioni_extra: checked && extras.length === 0 ? [{ descrizione: "", ore: 0 }] : extras
            });
          }} />
        
        <span className="text-sm font-medium">Ci sono lavorazioni extra?</span>
      </div>

      {hasExtra &&
      <div className="space-y-2 pl-2 border-l-2 border-amber-200">
          {extras.map((extra, i) =>
        <div key={i} className="rounded-xl border border-border p-3 bg-card">
              <div className="flex items-end gap-2">
                <span className="w-6 h-6 mb-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] text-muted-foreground">Descrizione</Label>
                    <Input
                  value={extra.descrizione || ""}
                  onChange={(e) => updateExtra(i, "descrizione", e.target.value)}
                  className="mt-1"
                  placeholder="Descrivi la lavorazione extra..." />
                
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Ore</Label>
                    <OreInput
                  value={extra.ore ?? 0}
                  onChange={(v) => updateExtra(i, "ore", v)} />
                
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive flex-shrink-0" onClick={() => removeExtra(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
        )}
          <Button variant="outline" size="sm" onClick={addExtra} className="gap-2">
            <Plus className="w-3 h-3" />
            Aggiungi voce extra
          </Button>
        </div>
      }
    </div>);

}

// ─── LAVORAZIONI NORMALI ──────────────────────────────────────────────────────

function LavorazioniNormali({ data, onChange, tipiLavorazione }) {
  const lavorazioni = data.lavorazioni_normali || [];
  const oreLavoratori = (data.collaboratori || []).reduce((sum, c) => sum + (c.ore_lavorate || 0), 0) ||
  data.ore_totali_squadra || 0;
  const oreExtra = data.has_lavorazioni_extra ?
  (data.lavorazioni_extra || []).reduce((sum, l) => sum + (l.ore || 0), 0) : 0;
  const oreNormali = lavorazioni.reduce((sum, l) => sum + (l.ore_totali || 0), 0);
  const delta = oreLavoratori - oreExtra - oreNormali;
  const isValid = Math.abs(delta) < 0.01;
  const isSforato = delta < -0.01;
  const isMancante = delta > 0.01;

  const addLavorazione = () => {
    onChange({
      lavorazioni_normali: [
      ...lavorazioni,
      { tipo_lavorazione_id: "", tipo_lavorazione_nome: "", descrizione_custom: "", ore_totali: 0, modalita_calcolo: "manuale", numero_persone: 0, ore_per_persona: 0 }]

    });
  };

  const updateLav = (index, updates) => {
    const updated = [...lavorazioni];
    updated[index] = { ...updated[index], ...updates };
    if (updated[index].modalita_calcolo === "per_persone") {
      updated[index].ore_totali = (updated[index].numero_persone || 0) * (updated[index].ore_per_persona || 0);
    }
    onChange({ lavorazioni_normali: updated });
  };

  const removeLav = (index) => {
    onChange({ lavorazioni_normali: lavorazioni.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      {lavorazioni.map((lav, i) =>
      <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Riga 1 — numero, categoria, tipo, ore voci, elimina */}
          <div className="flex items-start gap-2 p-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Categoria */}
              <div>
                <Label className="text-[11px] text-muted-foreground">Categoria</Label>
                <SheetSelect
                value={lav.categoria || ""}
                onValueChange={(val) => updateLav(i, { categoria: val, tipo_lavorazione_id: "", tipo_lavorazione_nome: "", descrizione_custom: "" })}
                options={[
                ...[...new Set(tipiLavorazione.map((t) => t.categoria).filter(Boolean))].map((cat) => ({ value: cat, label: cat })),
                { value: "__custom__", label: "✏️ Personalizzata" }]
                }
                placeholder="Seleziona categoria..." />
              
              </div>

              {/* Tipo (filtrato per categoria) oppure descrizione libera */}
              {lav.categoria && lav.categoria !== "__custom__" &&
            <div>
                  <Label className="text-[11px] text-muted-foreground">Tipo lavorazione</Label>
                  <SheetSelect
                value={lav.tipo_lavorazione_id || ""}
                onValueChange={(val) => {
                  if (val === "__custom_tipo__") {
                    updateLav(i, { tipo_lavorazione_id: "", tipo_lavorazione_nome: "", descrizione_custom: "" });
                  } else {
                    const tipo = tipiLavorazione.find((t) => t.id === val);
                    updateLav(i, { tipo_lavorazione_id: val, tipo_lavorazione_nome: tipo?.nome || "", descrizione_custom: "" });
                  }
                }}
                options={[
                ...tipiLavorazione.filter((t) => t.categoria === lav.categoria).map((t) => ({ value: t.id, label: t.nome })),
                { value: "__custom_tipo__", label: "✏️ Non trovata — scrivi manualmente" }]
                }
                placeholder="Seleziona tipo..." />
              
                  {!lav.tipo_lavorazione_id &&
              <Input
                value={lav.descrizione_custom || ""}
                onChange={(e) => updateLav(i, { descrizione_custom: e.target.value, tipo_lavorazione_nome: e.target.value })}
                className="mt-1"
                placeholder="Scrivi il tipo di lavorazione..." />

              }
                </div>
            }

              {lav.categoria === "__custom__" &&
            <div>
                  <Label className="text-[11px] text-muted-foreground">Descrizione</Label>
                  <Input
                value={lav.descrizione_custom || ""}
                onChange={(e) => updateLav(i, { descrizione_custom: e.target.value, tipo_lavorazione_id: "", tipo_lavorazione_nome: e.target.value })}
                className="mt-1"
                placeholder="Descrivi la lavorazione..." />
              
                </div>
            }
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {Number(lav.ore_totali) > 0 &&
            <span className="text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 tabular-nums">
                  {fmtH(lav.ore_totali)}h
                </span>
            }
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLav(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Riga 2 — cosa / dove */}
          <div className="px-3">
            <Textarea
            value={lav.descrizione || ""}
            onChange={(e) => updateLav(i, { descrizione: e.target.value })}
            className="min-h-[38px] resize-y text-sm"
            placeholder="Descrizione (cosa / dove) — es. facciata nord, prime due stanze..." />
          
          </div>

          {/* Riga 3 — modalità ore + ore */}
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2 p-3 pt-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Modalità ore</Label>
              <RadioGroup
              value={lav.modalita_calcolo || "manuale"}
              onValueChange={(val) => updateLav(i, { modalita_calcolo: val })}
              className="flex items-center gap-3 h-9">
              
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="manuale" id={`man-${i}`} />
                  <Label htmlFor={`man-${i}`} className="text-sm cursor-pointer">Manuale</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="per_persone" id={`pp-${i}`} />
                  <Label htmlFor={`pp-${i}`} className="text-sm cursor-pointer">Per persone</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-end gap-2 ml-auto">
              {lav.modalita_calcolo === "per_persone" ?
            <>
                  <div className="w-[4.5rem] mx-8">
                    <Label className="text-[11px] text-muted-foreground">Persone</Label>
                    <OreInput
                  value={lav.numero_persone ?? 0}
                  step={1}
                  onChange={(v) => updateLav(i, { numero_persone: v })} />
                
                  </div>
                  <div className="w-24">
                    <Label className="text-[11px] text-muted-foreground">Ore/persona</Label>
                    <OreInput
                  value={lav.ore_per_persona ?? 0}
                  onChange={(v) => updateLav(i, { ore_per_persona: v })} />
                
                  </div>
                  <div className="w-[4.5rem]">
                    <Label className="text-[11px] text-muted-foreground">Totale</Label>
                    <Input type="text" inputMode="decimal" value={lav.ore_totali ?? 0} disabled className="mt-1 bg-muted font-semibold text-center tabular-nums" />
                  </div>
                </> :

            <div className="w-28">
                  <Label className="text-[11px] text-muted-foreground">Ore totali</Label>
                  <OreInput
                value={lav.ore_totali ?? 0}
                onChange={(v) => updateLav(i, { ore_totali: v })} />
              
                </div>
            }
            </div>
          </div>
        </div>
      )}

      <Button variant="outline" onClick={addLavorazione} className="gap-2 w-full border-dashed">
        <Plus className="w-4 h-4" />
        Aggiungi Lavorazione
      </Button>

      {/* Quadro ore */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 bg-muted/40 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quadro ore</span>
        </div>
        <div className="divide-y divide-border">
          <div className="flex justify-between items-center px-4 py-2 text-sm">
            <span className="text-muted-foreground">Ore lavoratori</span>
            <span className="font-semibold">{fmtH(oreLavoratori)}h</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2 text-sm">
            <span className="text-muted-foreground">− Ore extra</span>
            <span className="font-semibold text-amber-600">−{fmtH(oreExtra)}h</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2 text-sm">
            <span className="text-muted-foreground">− Ore normali</span>
            <span className="font-semibold text-primary">−{fmtH(oreNormali)}h</span>
          </div>
          <div className={cn(
            "flex justify-between items-center px-4 py-3 text-sm font-bold border-t-2",
            isValid && "border-green-300 bg-green-50 text-green-800",
            isMancante && "border-amber-300 bg-amber-50 text-amber-800",
            isSforato && "border-red-300 bg-red-50 text-red-700"
          )}>
            <div className="flex items-center gap-2">
              {isValid && <CheckCircle2 className="w-4 h-4" />}
              {isMancante && <AlertTriangle className="w-4 h-4" />}
              {isSforato && <AlertCircle className="w-4 h-4" />}
              <span>
                {isValid && "In pareggio"}
                {isMancante && `Mancano ${fmtH(Math.abs(delta))}h`}
                {isSforato && `Sforato di ${fmtH(Math.abs(delta))}h`}
              </span>
            </div>
            <span>= {fmtH(delta)}h</span>
          </div>
        </div>
      </div>
    </div>);

}

// ─── STEP UNIFICATO ───────────────────────────────────────────────────────────

export default function Step3Lavorazioni({ data, onChange, tipiLavorazione }) {
  const handleExtraResult = (items) => {
    onChange({
      lavorazioni_extra: [
      ...(data.lavorazioni_extra || []),
      ...items.map((e) => ({ descrizione: e.descrizione, ore: e.ore || 0 }))]

    });
  };

  const handleNormaliResult = (items) => {
    const availableCats = [...new Set(tipiLavorazione.map((t) => t.categoria).filter(Boolean))];
    const matched = items.map((n) => {
      const descrizione = n.descrizione || "";
      const modalita_calcolo = n.modalita_calcolo === "per_persone" ? "per_persone" : "manuale";
      const numero_persone = n.numero_persone || 0;
      const ore_per_persona = n.ore_per_persona || 0;
      const ore_totali = modalita_calcolo === "per_persone" ?
      Math.round(numero_persone * ore_per_persona * 100) / 100 :
      n.ore_totali || 0;
      const base = { ore_totali, modalita_calcolo, numero_persone, ore_per_persona };
      const catMatch = availableCats.find((c) => c.toLowerCase() === String(n.categoria).toLowerCase());
      if (catMatch) {
        const tipoMatch = tipiLavorazione.find(
          (t) => t.categoria === catMatch && t.nome.toLowerCase() === String(n.tipo).toLowerCase()
        );
        if (tipoMatch) {
          return { ...base, categoria: catMatch, tipo_lavorazione_id: tipoMatch.id, tipo_lavorazione_nome: tipoMatch.nome, descrizione_custom: "", descrizione };
        }
        return { ...base, categoria: catMatch, tipo_lavorazione_id: "", tipo_lavorazione_nome: n.tipo, descrizione_custom: n.tipo, descrizione };
      }
      return { ...base, categoria: "__custom__", tipo_lavorazione_id: "", tipo_lavorazione_nome: n.tipo, descrizione_custom: `${n.categoria} - ${n.tipo}`, descrizione };
    });
    onChange({ lavorazioni_normali: [...(data.lavorazioni_normali || []), ...matched] });
  };

  const hasExtra = data.has_lavorazioni_extra || false;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Lavorazioni</h2>
          <p className="text-sm text-muted-foreground">Inserisci le lavorazioni extra e quelle preventivate</p>
        </div>
      </div>

      {/* Sezione 1 — Lavorazioni Extra */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
        <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-amber-200">
          <Zap className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-amber-900 text-sm">Lavorazioni Extra</h3>
          <span className="text-xs text-amber-700 ml-1">(concordate, non in preventivo)</span>
        </div>
        <LavorazioniExtra data={data} onChange={onChange} />
        {hasExtra &&
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <AudioLavorazioniRecorder mode="extra" tipiLavorazione={tipiLavorazione} onResult={handleExtraResult} />
            <span className="text-xs text-muted-foreground">Parla: l'IA aggiunge le voci extra e compila le ore che dici. Puoi rivederle e modificarle dopo.</span>
          </div>
        }
      </div>

      {/* Sezione 2 — Lavorazioni Preventivate */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-primary/20">
          <Wrench className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-primary text-sm">Lavorazioni Preventivate</h3>
          <span className="text-xs text-primary/70 ml-1">(da preventivo)</span>
        </div>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <AudioLavorazioniRecorder mode="normali" tipiLavorazione={tipiLavorazione} onResult={handleNormaliResult} />
          <span className="text-xs text-muted-foreground">Parla: l'IA aggiunge le voci, le mappa al catalogo e compila le ore che dici. Puoi rivederle e modificarle dopo.</span>
        </div>
        <LavorazioniNormali data={data} onChange={onChange} tipiLavorazione={tipiLavorazione} />
      </div>
    </div>);

}