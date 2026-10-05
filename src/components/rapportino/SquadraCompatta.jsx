import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import SheetSelect from "@/components/ui/sheet-select";
import OreInput from "@/components/wizard/OreInput";
import { fmtOre } from "@/lib/timbratureUtils";
import { cn } from "@/lib/utils";
import {
  Users, ChevronDown, LogIn, LogOut, Coffee, AlertTriangle, MapPin,
  Trash2, Plus, Pencil, Clock,
} from "lucide-react";

const NOTE_OPTIONS = [
  "Uscita anticipata dal cantiere concordata",
  "Arrivo in cantiere posticipato concordato",
  "Andato direttamente in cantiere senza passare dal magazzino",
  "Andato in cantiere con il proprio veicolo dopo essere passato dal magazzino",
  "Altro",
];

function Dinamica({ value, onChange }) {
  const isAltro = value && !NOTE_OPTIONS.slice(0, -1).includes(value);
  const selectValue = isAltro ? "Altro" : value || "";
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">Trasferta / dinamica particolare</Label>
      <SheetSelect
        value={selectValue}
        onValueChange={(v) => onChange(v)}
        options={NOTE_OPTIONS.map((o) => ({ value: o, label: o }))}
        placeholder="Nessuna"
      />
      {(selectValue === "Altro" || isAltro) && (
        <Textarea
          value={isAltro ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 min-h-[56px] text-xs"
          placeholder="Descrivi la dinamica..."
        />
      )}
    </div>
  );
}

// Riga compatta: CHI → QUANTE ORE → eventuale trasferta/dinamica
export default function SquadraCompatta({ data, onChange, collaboratoriList = [], canEdit = false }) {
  const [aperto, setAperto] = useState(null);
  const [aggiunta, setAggiunta] = useState(false);
  const [selected, setSelected] = useState([]);
  const [editingPersona, setEditingPersona] = useState(null);

  const collaboratori = data.collaboratori || [];
  const oreTotali = data.ore_totali_squadra ?? 0;
  const totale = collaboratori.reduce((s, c) => s + (c.ore_lavorate || 0), 0);

  const updateCollab = (index, updates) => {
    const updated = [...collaboratori];
    updated[index] = { ...updated[index], ...updates };
    onChange({ collaboratori: updated });
  };
  const removeCollab = (index) => {
    onChange({ collaboratori: collaboratori.filter((_, i) => i !== index) });
    setAperto(null);
  };
  const changePersona = (index, newId) => {
    const found = collaboratoriList.find((c) => c.id === newId);
    if (!found) return;
    updateCollab(index, { collaboratore_id: newId, nome: found.nome });
    setEditingPersona(null);
  };

  const available = collaboratoriList
    .filter((c) => c.attivo !== false && !collaboratori.some((sel) => sel.collaboratore_id === c.id))
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "it"));

  const confirmAdd = () => {
    const nuovi = selected
      .filter((id) => !collaboratori.some((c) => c.collaboratore_id === id))
      .map((id) => {
        const found = collaboratoriList.find((c) => c.id === id);
        return { collaboratore_id: id, nome: found?.nome || "", ore_lavorate: 0, note_imprevisti: "" };
      });
    onChange({ collaboratori: [...collaboratori, ...nuovi] });
    setSelected([]);
    setAggiunta(false);
  };

  // Testo breve mostrato sotto il nome: solo se c'è qualcosa da segnalare
  const dinamicaBreve = (c) => {
    const parti = [];
    if (c.in_sede) parti.push("In sede — nessuna trasferta");
    if (c.note_imprevisti) parti.push(c.note_imprevisti);
    if (c.spostamento_minuti > 0) parti.push(`${c.spostamento_minuti} min spostamento`);
    if (c.note_timbrature) parti.push(c.note_timbrature);
    if (!parti.length && c.anomalia) parti.push(c.anomalia);
    return parti.join(" · ");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Squadra</h2>
          <p className="text-sm text-muted-foreground">Presenze e ore rilevate dalle timbrature</p>
        </div>
      </div>

      {collaboratori.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-5 text-center text-muted-foreground">
          <Users className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
          <p className="text-sm">Nessuna presenza rilevata per questo cantiere</p>
          <p className="text-xs mt-0.5">La squadra si compila automaticamente dalle timbrature</p>
        </div>
      )}

      {collaboratori.length > 0 && (
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {collaboratori.map((coll, i) => {
            const espanso = aperto === i;
            const breve = dinamicaBreve(coll);
            return (
              <div key={coll.collaboratore_id || coll.user_email || i}>
                <button
                  type="button"
                  onClick={() => setAperto(espanso ? null : i)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground shrink-0">
                    {coll.nome?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{coll.nome}</p>
                    {breve && (
                      <p className={cn("text-[11px] truncate", coll.in_sede ? "text-slate-600" : "text-muted-foreground")}>
                        {breve}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {fmtOre(coll.ore_lavorate ?? 0)}
                  </span>
                  <ChevronDown
                    className={cn("w-4 h-4 shrink-0 text-muted-foreground transition-transform", espanso && "rotate-180")}
                  />
                </button>

                {espanso && (
                  <div className="px-3 pb-3 space-y-2.5">
                    {coll.ora_ingresso && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <LogIn className="w-3 h-3" /> {coll.ora_ingresso}
                        </span>
                        <span className="flex items-center gap-1">
                          <LogOut className="w-3 h-3" /> {coll.ora_uscita || "in corso"}
                        </span>
                        {coll.pausa_minuti > 0 && (
                          <span className="flex items-center gap-1">
                            <Coffee className="w-3 h-3" /> {coll.pausa_minuti} min pausa
                          </span>
                        )}
                        {coll.spostamento_minuti > 0 && (
                          <span className="flex items-center gap-1 text-orange-600">
                            {coll.spostamento_minuti} min spostamento
                          </span>
                        )}
                      </div>
                    )}

                    {coll.in_sede && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-slate-50 border border-slate-200 p-2 text-[11px] text-slate-700">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span><strong>In sede:</strong> nessuna trasferta per questa giornata.</span>
                      </div>
                    )}

                    {coll.note_timbrature && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-primary/5 border border-primary/20 p-2 text-[11px]">
                        <span className="shrink-0">📝</span>
                        <span><strong>Nota dalle timbrature:</strong> {coll.note_timbrature}</span>
                      </div>
                    )}

                    {coll.anomalia && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{coll.anomalia}</span>
                      </div>
                    )}

                    {canEdit && (
                      <div className="flex items-end gap-2">
                        <div className="w-32">
                          <Label className="text-[11px] text-muted-foreground">Ore lavorate</Label>
                          <OreInput
                            compact
                            value={coll.ore_lavorate ?? 0}
                            onChange={(v) => updateCollab(i, { ore_lavorate: v })}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive ml-auto"
                          onClick={() => removeCollab(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {canEdit && editingPersona === i ? (
                      <SheetSelect
                        value={coll.collaboratore_id}
                        onValueChange={(v) => v !== coll.collaboratore_id && changePersona(i, v)}
                        options={[
                          { value: coll.collaboratore_id, label: coll.nome },
                          ...available.map((c) => ({ value: c.id, label: c.nome })),
                        ]}
                        placeholder="Scegli il nuovo collaboratore..."
                      />
                    ) : canEdit ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => setEditingPersona(i)}
                      >
                        <Pencil className="w-3 h-3" /> Cambia persona
                      </Button>
                    ) : null}

                    <Dinamica
                      value={coll.note_imprevisti || ""}
                      onChange={(v) => updateCollab(i, { note_imprevisti: v })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{collaboratori.length} lavorator{collaboratori.length === 1 ? "e" : "i"}</span>
        </div>
        <div className="flex items-center gap-3">
          {canEdit ? (
            <div className="w-28">
              <OreInput compact value={oreTotali} onChange={(v) => onChange({ ore_totali_squadra: v })} />
            </div>
          ) : (
            <span className="text-lg font-bold">{fmtOre(oreTotali)}</span>
          )}
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {canEdit && available.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setAggiunta((v) => !v)}
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi collaboratori
          </Button>
          {aggiunta && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {available.map((c) => {
                  const scelto = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setSelected((prev) => (scelto ? prev.filter((x) => x !== c.id) : [...prev, c.id]))
                      }
                      className={cn(
                        "h-10 rounded-lg border-2 flex items-center gap-2 px-2 text-sm font-medium transition-all",
                        scelto ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                      )}
                    >
                      <span className="truncate">{c.nome}</span>
                    </button>
                  );
                })}
              </div>
              {selected.length > 0 && (
                <Button className="w-full gap-2 h-9" onClick={confirmAdd}>
                  <Plus className="w-4 h-4" />
                  Aggiungi {selected.length}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {collaboratori.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Totale ore lavoratori: <strong>{fmtOre(totale)}</strong>. Le presenze arrivano dalle timbrature: controlla solo le anomalie e le dinamiche particolari.
        </p>
      )}
    </div>
  );
}