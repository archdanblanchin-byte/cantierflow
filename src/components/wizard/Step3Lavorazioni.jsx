import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Zap, Wrench, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import AudioLavorazioniRecorder from "@/components/wizard/AudioLavorazioniRecorder";
import OreInput from "@/components/wizard/OreInput";

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
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
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
        <div className="space-y-3 pl-2 border-l-2 border-amber-200">
          {extras.map((extra, i) => (
            <div key={i} className="rounded-xl border border-border p-3 bg-card">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                <Button variant="ghost" size="icon" className="mt-5 text-destructive flex-shrink-0" onClick={() => removeExtra(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addExtra} className="gap-2">
            <Plus className="w-3 h-3" />
            Aggiungi voce extra
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── LAVORAZIONI NORMALI ──────────────────────────────────────────────────────

function LavorazioniNormali({ data, onChange, tipiLavorazione }) {
  const lavorazioni = data.lavorazioni_normali || [];
  const oreLavoratori = (data.collaboratori || []).reduce((sum, c) => sum + (c.ore_lavorate || 0), 0)
    || (data.ore_totali_squadra || 0);
  const oreExtra = data.has_lavorazioni_extra
    ? (data.lavorazioni_extra || []).reduce((sum, l) => sum + (l.ore || 0), 0) : 0;
  const oreNormali = lavorazioni.reduce((sum, l) => sum + (l.ore_totali || 0), 0);
  const delta = oreLavoratori - oreExtra - oreNormali;
  const isValid = Math.abs(delta) < 0.01;
  const isSforato = delta < -0.01;
  const isMancante = delta > 0.01;

  const addLavorazione = () => {
    onChange({
      lavorazioni_normali: [
        ...lavorazioni,
        { tipo_lavorazione_id: "", tipo_lavorazione_nome: "", descrizione_custom: "", ore_totali: 0, modalita_calcolo: "manuale", numero_persone: 0, ore_per_persona: 0 },
      ],
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
    <div className="space-y-4">
      <div className="space-y-3">
        {lavorazioni.map((lav, i) => (
          <div key={i} className="rounded-xl border border-border p-3 bg-card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                {/* Categoria */}
                <div>
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <Select
                    value={lav.categoria || ""}
                    onValueChange={(val) => updateLav(i, { categoria: val, tipo_lavorazione_id: "", tipo_lavorazione_nome: "", descrizione_custom: "" })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleziona categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Set(tipiLavorazione.map(t => t.categoria).filter(Boolean))].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">✏️ Personalizzata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo (filtrato) */}
                {lav.categoria && lav.categoria !== "__custom__" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo lavorazione</Label>
                    <Select
                      value={lav.tipo_lavorazione_id || ""}
                      onValueChange={(val) => {
                        if (val === "__custom_tipo__") {
                          updateLav(i, { tipo_lavorazione_id: "", tipo_lavorazione_nome: "", descrizione_custom: "" });
                        } else {
                          const tipo = tipiLavorazione.find((t) => t.id === val);
                          updateLav(i, { tipo_lavorazione_id: val, tipo_lavorazione_nome: tipo?.nome || "", descrizione_custom: "" });
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleziona tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tipiLavorazione.filter(t => t.categoria === lav.categoria).map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                        ))}
                        <SelectItem value="__custom_tipo__">✏️ Non trovata — scrivi manualmente</SelectItem>
                      </SelectContent>
                    </Select>
                    {!lav.tipo_lavorazione_id && (
                      <Input
                        value={lav.descrizione_custom || ""}
                        onChange={(e) => updateLav(i, { descrizione_custom: e.target.value, tipo_lavorazione_nome: e.target.value })}
                        className="mt-2"
                        placeholder="Scrivi il tipo di lavorazione..."
                      />
                    )}
                  </div>
                )}

                {/* Campo libero personalizzata */}
                {lav.categoria === "__custom__" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrizione</Label>
                    <Input
                      value={lav.descrizione_custom || ""}
                      onChange={(e) => updateLav(i, { descrizione_custom: e.target.value, tipo_lavorazione_id: "", tipo_lavorazione_nome: e.target.value })}
                      className="mt-1"
                      placeholder="Descrivi la lavorazione..."
                    />
                  </div>
                )}
              </div>
              <Button variant="ghost" size="icon" className="text-destructive mt-6 flex-shrink-0" onClick={() => removeLav(i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Descrizione (cosa/dove) */}
            <div>
              <Label className="text-xs text-muted-foreground">Descrizione (cosa / dove)</Label>
              <Textarea
                value={lav.descrizione || ""}
                onChange={(e) => updateLav(i, { descrizione: e.target.value })}
                className="mt-1 min-h-[44px] resize-y"
                placeholder="Es. nelle prime due stanze, facciata nord..."
              />
            </div>

            {/* Modalità ore */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Modalità ore</Label>
              <RadioGroup
                value={lav.modalita_calcolo || "manuale"}
                onValueChange={(val) => updateLav(i, { modalita_calcolo: val })}
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
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">N° persone</Label>
                  <OreInput
                    value={lav.numero_persone ?? 0}
                    step={1}
                    onChange={(v) => updateLav(i, { numero_persone: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ore/persona</Label>
                  <OreInput
                    value={lav.ore_per_persona ?? 0}
                    onChange={(v) => updateLav(i, { ore_per_persona: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Totale</Label>
                  <Input type="text" inputMode="decimal" value={lav.ore_totali ?? 0} disabled className="mt-1 bg-muted font-semibold text-center font-semibold" />
                </div>
              </div>
            ) : (
              <div className="w-44">
                <Label className="text-xs text-muted-foreground">Ore totali</Label>
                <OreInput
                  value={lav.ore_totali ?? 0}
                  onChange={(v) => updateLav(i, { ore_totali: v })}
                />
              </div>
            )}
          </div>
        ))}
      </div>

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
            <span className="font-semibold">{oreLavoratori.toFixed(2).replace(".", ",")}h</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2 text-sm">
            <span className="text-muted-foreground">− Ore extra</span>
            <span className="font-semibold text-amber-600">−{oreExtra.toFixed(2).replace(".", ",")}h</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2 text-sm">
            <span className="text-muted-foreground">− Ore normali</span>
            <span className="font-semibold text-primary">−{oreNormali.toFixed(2).replace(".", ",")}h</span>
          </div>
          <div className={cn(
            "flex justify-between items-center px-4 py-3 text-sm font-bold border-t-2",
            isValid && "border-green-300 bg-green-50 text-green-800",
            isMancante && "border-amber-300 bg-amber-50 text-amber-800",
            isSforato && "border-red-300 bg-red-50 text-red-700",
          )}>
            <div className="flex items-center gap-2">
              {isValid && <CheckCircle2 className="w-4 h-4" />}
              {isMancante && <AlertTriangle className="w-4 h-4" />}
              {isSforato && <AlertCircle className="w-4 h-4" />}
              <span>
                {isValid && "In pareggio"}
                {isMancante && `Mancano ${Math.abs(delta).toFixed(2).replace(".", ",")}h`}
                {isSforato && `Sforato di ${Math.abs(delta).toFixed(2).replace(".", ",")}h`}
              </span>
            </div>
            <span>= {delta.toFixed(2).replace(".", ",")}h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STEP UNIFICATO ───────────────────────────────────────────────────────────

export default function Step3Lavorazioni({ data, onChange, tipiLavorazione }) {
  const handleExtraResult = (items) => {
    onChange({
      lavorazioni_extra: [
        ...(data.lavorazioni_extra || []),
        ...items.map((e) => ({ descrizione: e.descrizione, ore: e.ore || 0 })),
      ],
    });
  };

  const handleNormaliResult = (items) => {
    const availableCats = [...new Set(tipiLavorazione.map((t) => t.categoria).filter(Boolean))];
    const matched = items.map((n) => {
      const descrizione = n.descrizione || "";
      const modalita_calcolo = n.modalita_calcolo === "per_persone" ? "per_persone" : "manuale";
      const numero_persone = n.numero_persone || 0;
      const ore_per_persona = n.ore_per_persona || 0;
      const ore_totali = modalita_calcolo === "per_persone"
        ? Math.round((numero_persone * ore_per_persona) * 100) / 100
        : (n.ore_totali || 0);
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
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Lavorazioni</h2>
          <p className="text-sm text-muted-foreground">Inserisci le lavorazioni extra e quelle preventivate</p>
        </div>
      </div>

      {/* Sezione 1 — Lavorazioni Extra */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-amber-200">
          <Zap className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-amber-900">Lavorazioni Extra</h3>
          <span className="text-xs text-amber-700 ml-1">(concordate, non in preventivo)</span>
        </div>
        <LavorazioniExtra data={data} onChange={onChange} />
        {hasExtra && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AudioLavorazioniRecorder mode="extra" tipiLavorazione={tipiLavorazione} onResult={handleExtraResult} />
            <span className="text-xs text-muted-foreground">Parla: l'IA aggiunge le voci extra e compila le ore che dici. Puoi rivederle e modificarle dopo.</span>
          </div>
        )}
      </div>

      {/* Sezione 2 — Lavorazioni Preventivate */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-primary/20">
          <Wrench className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-primary">Lavorazioni Preventivate</h3>
          <span className="text-xs text-primary/70 ml-1">(da preventivo)</span>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <AudioLavorazioniRecorder mode="normali" tipiLavorazione={tipiLavorazione} onResult={handleNormaliResult} />
          <span className="text-xs text-muted-foreground">Parla: l'IA aggiunge le voci, le mappa al catalogo e compila le ore che dici. Puoi rivederle e modificarle dopo.</span>
        </div>
        <LavorazioniNormali data={data} onChange={onChange} tipiLavorazione={tipiLavorazione} />
      </div>
    </div>
  );
}