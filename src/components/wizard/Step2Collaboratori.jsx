import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SheetSelect from "@/components/ui/sheet-select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Users, Clock, Pencil, LogIn, LogOut, Coffee, AlertTriangle } from "lucide-react";
import { fmtOre } from "@/lib/timbratureUtils";
import OreInput from "@/components/wizard/OreInput";

// Dati rilevati automaticamente dalle timbrature della giornata
function TimbratureInfo({ coll }) {
  if (!coll.ora_ingresso) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <LogIn className="w-3 h-3" /> {coll.ora_ingresso}
        </span>
        <span className="flex items-center gap-1">
          <LogOut className="w-3 h-3" /> {coll.ora_uscita || "in corso"}
        </span>
        {coll.pausa_minuti > 0 &&
        <span className="flex items-center gap-1">
            <Coffee className="w-3 h-3" /> {coll.pausa_minuti} min pausa
          </span>
        }
        {coll.spostamento_minuti > 0 &&
        <span className="flex items-center gap-1 text-orange-600">
            {coll.spostamento_minuti} min spostamento
          </span>
        }
        <span className="ml-auto font-medium text-foreground">{fmtOre(coll.ore_lavorate)} dalle timbrature</span>
      </div>
      {coll.anomalia &&
      <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[11px] text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{coll.anomalia}</span>
        </div>
      }
    </div>);

}

const NOTE_OPTIONS = [
"Uscita anticipata dal cantiere concordata",
"Arrivo in cantiere posticipato concordato",
"Andato direttamente in cantiere senza passare dal magazzino",
"Andato in cantiere con il proprio veicolo dopo essere passato dal magazzino",
"Altro"];


function NoteImprevisti({ value, onChange }) {
  const isAltro = value && !NOTE_OPTIONS.slice(0, -1).includes(value);
  const selectValue = isAltro ? "Altro" : value || "";

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Dinamica diversa</Label>
      <SheetSelect
        value={selectValue}
        onValueChange={(v) => {
          if (v === "Altro") onChange("Altro");else
          onChange(v);
        }}
        options={NOTE_OPTIONS.map((o) => ({ value: o, label: o }))}
        placeholder="Seleziona..." />
      
      {(selectValue === "Altro" || isAltro) &&
      <Textarea
        value={isAltro ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-[60px] text-xs"
        placeholder="Descrivi l'imprevisto..." />

      }
    </div>);

}

export default function Step2Collaboratori({ data, onChange, collaboratoriList, showErrors, canEditOre = true, canEditCollab = false }) {
  const [selected, setSelected] = useState([]);
  const collaboratori = data.collaboratori || [];
  const oreTotali = data.ore_totali_squadra ?? 8;
  const totaleOreLavoratori = collaboratori.reduce((sum, c) => sum + (c.ore_lavorate || 0), 0);

  const toggleSelected = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const confirmAdd = () => {
    const nuovi = selected.
    filter((id) => !collaboratori.some((c) => c.collaboratore_id === id)).
    map((id) => {
      const found = collaboratoriList.find((c) => c.id === id);
      return { collaboratore_id: id, nome: found.nome, ore_lavorate: oreTotali, note_imprevisti: "" };
    });
    onChange({ collaboratori: [...collaboratori, ...nuovi] });
    setSelected([]);
  };

  const updateCollaboratore = (index, field, value) => {
    const updated = [...collaboratori];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ collaboratori: updated });
  };

  const removeCollaboratore = (index) => {
    onChange({ collaboratori: collaboratori.filter((_, i) => i !== index) });
  };

  // Solo admin: sostituisce il collaboratore di una riga con un altro (mantiene ore/note)
  const changePersona = (index, newId) => {
    const found = collaboratoriList.find((c) => c.id === newId);
    if (!found) return;
    const updated = [...collaboratori];
    updated[index] = { ...updated[index], collaboratore_id: newId, nome: found.nome };
    onChange({ collaboratori: updated });
  };
  const [editingPersona, setEditingPersona] = useState(null);

  const available = collaboratoriList.
  filter((c) => c.attivo !== false && !collaboratori.some((sel) => sel.collaboratore_id === c.id)).
  sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Squadra del cantiere</h2>
          <p className="text-sm text-muted-foreground">Compilata dalle timbrature: controlla ore e anomalie</p>
        </div>
      </div>

      {/* Ore squadra */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Label className="text-xs font-medium uppercase tracking-wider text-primary">Ore Squadra *</Label>
        <div className="flex items-center gap-3 mt-1">
          <Clock className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 max-w-xs">
            {canEditOre ?
            <OreInput value={oreTotali} onChange={(v) => onChange({ ore_totali_squadra: v })} /> :

            <div className="flex items-center gap-2 h-9 px-3 rounded-md bg-muted border border-border">
                <span className="font-semibold">{fmtOre(oreTotali)}</span>
                <span className="text-[11px] text-muted-foreground ml-auto">calcolate dalle timbrature</span>
              </div>
            }
          </div>
        </div>
        {!canEditOre &&
        <p className="text-[11px] text-muted-foreground mt-2">Le ore sono determinate dalle timbrature: solo un amministratore può modificarle manualmente.</p>
        }
      </div>

      {/* Lista collaboratori */}
      {collaboratori.length === 0 &&
      <div className={`rounded-xl border-2 border-dashed p-8 text-center hidden ${showErrors ? "border-destructive bg-destructive/5" : "border-border"}`}>
          <Users className={`w-8 h-8 mx-auto mb-2 ${showErrors ? "text-destructive/50" : "opacity-40"}`} />
          <p className={`text-sm font-medium ${showErrors ? "text-destructive" : "text-muted-foreground"}`}>
            {showErrors ? "⚠️ Devi aggiungere o confermare almeno un collaboratore per continuare" : "Nessun collaboratore aggiunto"}
          </p>
          <p className="text-xs mt-1 text-muted-foreground">Seleziona qui sotto i collaboratori presenti in cantiere</p>
        </div>
      }

      {collaboratori.length > 0 &&
      <div className="space-y-3">
          {collaboratori.map((coll, i) =>
        <div key={coll.collaboratore_id} className="rounded-xl border border-border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-secondary-foreground">
                    {coll.nome?.charAt(0)}
                  </div>
                  <span className="font-medium text-sm">{coll.nome}</span>
                </div>
                <div className="flex items-center gap-1">
                  {canEditCollab &&
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingPersona(editingPersona === i ? null : i)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
              }
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCollaboratore(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {canEditCollab && editingPersona === i &&
          <SheetSelect
            value={coll.collaboratore_id}
            onValueChange={(v) => {
              if (v !== coll.collaboratore_id) changePersona(i, v);
              setEditingPersona(null);
            }}
            options={[
            { value: coll.collaboratore_id, label: coll.nome },
            ...available.map((c) => ({ value: c.id, label: c.nome }))]
            }
            placeholder="Scegli il nuovo collaboratore..." />

          }
              <TimbratureInfo coll={coll} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Ore lavorate</Label>
                  <OreInput
                value={coll.ore_lavorate ?? oreTotali}
                onChange={(v) => updateCollaboratore(i, "ore_lavorate", v)} />
              
                </div>
                <div>
                  <NoteImprevisti
                value={coll.note_imprevisti || ""}
                onChange={(v) => updateCollaboratore(i, "note_imprevisti", v)} />
              
                </div>
              </div>
            </div>
        )}
        </div>
      }

      {/* Selezione collaboratori — lista sempre visibile */}
      {available.length > 0 &&
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-medium">Seleziona altri collaboratori</p>
          <div className="grid grid-cols-2 gap-2">
            {available.map((c) => {
            const isChosen = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleSelected(c.id)}
                className={`h-11 rounded-lg border-2 flex items-center gap-2 px-3 text-sm font-medium transition-all ${
                isChosen ?
                "border-primary bg-primary text-primary-foreground shadow-md" :
                "border-border bg-card text-foreground hover:border-primary/50"}`
                }>
                
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isChosen ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-secondary-foreground"}`
                }>
                    {c.nome.charAt(0)}
                  </div>
                  <span className="truncate">{c.nome}</span>
                </button>);

          })}
          </div>
          {selected.length > 0 &&
        <Button className="w-full gap-2" onClick={confirmAdd}>
              <Plus className="w-4 h-4" />
              Aggiungi {selected.length} collaborator{selected.length === 1 ? "e" : "i"}
            </Button>
        }
        </div>
      }

      {/* Totale */}
      {collaboratori.length > 0 &&
      <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{collaboratori.length} lavorator{collaboratori.length === 1 ? "e" : "i"}</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-foreground">{fmtOre(totaleOreLavoratori)}</span>
            <p className="text-[10px] text-muted-foreground">Totale ore lavoratori</p>
          </div>
        </div>
      }

      {/* Banner promemoria — solo se ci sono collaboratori */}
      {collaboratori.length > 0 &&
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">💡</span>
          <span>Le presenze e le ore arrivano dalle <strong>timbrature</strong>: controlla solo le <strong>anomalie</strong> segnalate e le dinamiche particolari.</span>
        </div>
      }
    </div>);

}