import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Truck, Wrench, Hammer, ChevronDown, ChevronUp } from "lucide-react";

const IDROPULITRICI_OPTIONS = [
  "Idropulitrice piccola (proprietà)",
  "Idropulitrice grande (proprietà)",
  "Idropulitrice a noleggio",
  "Altro",
];

const ATTREZZI_OPTIONS = [
  "Trapano",
  "Tassellatore",
  "Avvitatore",
  "Smerigliatrice angolare",
  "Levigatrice",
  "Sega circolare",
  "Martello demolitore",
  "Compressore",
  "Aspiratore industriale",
  "Intonacatrice",
  "Betoniera",
  "Scala",
  "Ponteggio mobile",
  "Altro",
];

function PiattaformeSection({ data, onChange }) {
  const piattaforma = data.piattaforma || { tipo: "", ore: 0 };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Piattaforme</span>
      </div>
      <RadioGroup
        value={piattaforma.tipo || ""}
        onValueChange={(v) => onChange({ piattaforma: { ...piattaforma, tipo: v } })}
        className="flex gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="proprieta" id="piat-prop" />
          <Label htmlFor="piat-prop" className="text-sm cursor-pointer">Di proprietà</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="noleggio" id="piat-nol" />
          <Label htmlFor="piat-nol" className="text-sm cursor-pointer">Noleggiata</Label>
        </div>
      </RadioGroup>
      {piattaforma.tipo && (
        <div className="w-40">
          <Label className="text-xs text-muted-foreground">Ore di utilizzo</Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={piattaforma.ore ?? ""}
            onChange={(e) => onChange({ piattaforma: { ...piattaforma, ore: parseFloat(e.target.value) || 0 } })}
            className="mt-1"
            placeholder="0"
          />
        </div>
      )}
    </div>
  );
}

function IdropulitriciSection({ data, onChange }) {
  const macchinari = data.macchinari || [];

  const add = () => onChange({ macchinari: [...macchinari, { tipo: "", ore: 0, proprieta: "proprieta" }] });
  const remove = (i) => onChange({ macchinari: macchinari.filter((_, idx) => idx !== i) });
  const update = (i, field, val) => {
    const updated = [...macchinari];
    updated[i] = { ...updated[i], [field]: val };
    onChange({ macchinari: updated });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Idropulitrici</span>
      </div>
      {macchinari.map((m, i) => (
        <div key={i} className="rounded-lg border border-border p-3 bg-card space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo idropulitrice</Label>
                <Select value={m.tipo || ""} onValueChange={(v) => update(i, "tipo", v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {IDROPULITRICI_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {m.tipo === "Altro" && (
                  <Input
                    value={m.tipo_custom || ""}
                    onChange={(e) => update(i, "tipo_custom", e.target.value)}
                    className="mt-1 h-8 text-sm"
                    placeholder="Specifica..."
                  />
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ore utilizzo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={m.ore ?? ""}
                  onChange={(e) => update(i, "ore", parseFloat(e.target.value) || 0)}
                  className="mt-1 h-8 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-5 text-destructive flex-shrink-0" onClick={() => remove(i)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <RadioGroup
            value={m.proprieta || "proprieta"}
            onValueChange={(v) => update(i, "proprieta", v)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="proprieta" id={`mac-prop-${i}`} />
              <Label htmlFor={`mac-prop-${i}`} className="text-xs cursor-pointer">Di proprietà</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="noleggio" id={`mac-nol-${i}`} />
              <Label htmlFor={`mac-nol-${i}`} className="text-xs cursor-pointer">Noleggiato</Label>
            </div>
          </RadioGroup>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1.5 text-xs">
        <Plus className="w-3.5 h-3.5" />
        Aggiungi idropulitrice
      </Button>
    </div>
  );
}

function AttrezziSection({ data, onChange }) {
  const attrezzi = data.attrezzi || [];

  const add = () => onChange({ attrezzi: [...attrezzi, { tipo: "", ore: 0, proprieta: "proprieta" }] });
  const remove = (i) => onChange({ attrezzi: attrezzi.filter((_, idx) => idx !== i) });
  const update = (i, field, val) => {
    const updated = [...attrezzi];
    updated[i] = { ...updated[i], [field]: val };
    onChange({ attrezzi: updated });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Hammer className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">Attrezzi</span>
      </div>
      {attrezzi.map((a, i) => (
        <div key={i} className="rounded-lg border border-border p-3 bg-card space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo attrezzo</Label>
                <Select value={a.tipo || ""} onValueChange={(v) => update(i, "tipo", v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTREZZI_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {a.tipo === "Altro" && (
                  <Input
                    value={a.tipo_custom || ""}
                    onChange={(e) => update(i, "tipo_custom", e.target.value)}
                    className="mt-1 h-8 text-sm"
                    placeholder="Specifica..."
                  />
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Ore utilizzo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={a.ore ?? ""}
                  onChange={(e) => update(i, "ore", parseFloat(e.target.value) || 0)}
                  className="mt-1 h-8 text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-5 text-destructive flex-shrink-0" onClick={() => remove(i)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <RadioGroup
            value={a.proprieta || "proprieta"}
            onValueChange={(v) => update(i, "proprieta", v)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="proprieta" id={`att-prop-${i}`} />
              <Label htmlFor={`att-prop-${i}`} className="text-xs cursor-pointer">Di proprietà</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="noleggio" id={`att-nol-${i}`} />
              <Label htmlFor={`att-nol-${i}`} className="text-xs cursor-pointer">Noleggiato</Label>
            </div>
          </RadioGroup>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1.5 text-xs">
        <Plus className="w-3.5 h-3.5" />
        Aggiungi attrezzo
      </Button>
    </div>
  );
}

export default function MezziSection({ data, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Mezzi, Idropulitrici e Attrezzi</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 space-y-6 border-t border-border">
          <PiattaformeSection data={data} onChange={onChange} />
          <div className="border-t border-border pt-4">
            <IdropulitriciSection data={data} onChange={onChange} />
          </div>
          <div className="border-t border-border pt-4">
            <AttrezziSection data={data} onChange={onChange} />
          </div>
        </div>
      )}
    </div>
  );
}