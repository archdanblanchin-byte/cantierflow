import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import SheetSelect from "@/components/ui/sheet-select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { TIPI, PRIORITA } from "@/lib/notaResolve";

/**
 * Campi editabili di una singola nota (controllato).
 * value = { tipo, testo, items, cantiere_id, furgone_id, destinatari_email, data_promemoria, priorita }
 */
export default function NotaEditableFields({ value, onChange, cantieri = [], furgoni = [], destOptions = [] }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const [revealCantiere, setRevealCantiere] = useState(false);
  const [revealFurgone, setRevealFurgone] = useState(false);
  const [revealDest, setRevealDest] = useState(false);

  const toggleDest = (email) =>
    set({ destinatari_email: (value.destinatari_email || []).includes(email)
      ? (value.destinatari_email || []).filter((x) => x !== email)
      : [...(value.destinatari_email || []), email] });

  const addItem = () => set({ items: [...(value.items || []), { text: "", done: false }] });
  const updateItem = (i, text) => set({ items: (value.items || []).map((x, idx) => (idx === i ? { ...x, text } : x)) });
  const removeItem = (i) => set({ items: (value.items || []).filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Contenuto</Label>
        <Textarea rows={2} value={value.testo} onChange={(e) => set({ testo: e.target.value })} placeholder="Cosa deve essere fatto / ricordato..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <SheetSelect value={value.tipo} onValueChange={(v) => set({ tipo: v })} options={TIPI} placeholder="Tipo" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Priorità</Label>
          <SheetSelect value={value.priorita} onValueChange={(v) => set({ priorita: v })} options={PRIORITA} placeholder="Priorità" />
        </div>
      </div>

      {value.tipo === "lista" && (
        <div className="space-y-2">
          <Label className="text-xs">Voci lista</Label>
          {(value.items || []).map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={it.text} onChange={(e) => updateItem(i, e.target.value)} placeholder="es. Trapano" />
              <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1" onClick={addItem}><Plus className="w-4 h-4" />Aggiungi voce</Button>
        </div>
      )}

      {value.tipo === "promemoria" && (
        <div className="space-y-1">
          <Label className="text-xs">Quando ricordare</Label>
          <Input type="datetime-local" value={value.data_promemoria || ""} onChange={(e) => set({ data_promemoria: e.target.value })} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(value.cantiere_id || revealCantiere) ? (
          <div className="space-y-1 flex-1 min-w-[140px]">
            <Label className="text-xs flex items-center justify-between">
              Cantiere
              {value.cantiere_id && <button type="button" onClick={() => set({ cantiere_id: "" })} className="text-[10px] font-normal text-muted-foreground hover:text-destructive">rimuovi</button>}
            </Label>
            <SheetSelect value={value.cantiere_id || ""} onValueChange={(v) => set({ cantiere_id: v })} options={cantieri.filter((c) => c.attivo !== false).map((c) => ({ value: c.id, label: c.nome }))} placeholder="Nessuno" />
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setRevealCantiere(true)}><Plus className="w-3 h-3" /> Cantiere</Button>
        )}
        {(value.furgone_id || revealFurgone) ? (
          <div className="space-y-1 flex-1 min-w-[140px]">
            <Label className="text-xs flex items-center justify-between">
              Furgone
              {value.furgone_id && <button type="button" onClick={() => set({ furgone_id: "" })} className="text-[10px] font-normal text-muted-foreground hover:text-destructive">rimuovi</button>}
            </Label>
            <SheetSelect value={value.furgone_id || ""} onValueChange={(v) => set({ furgone_id: v })} options={furgoni.filter((f) => f.attivo !== false).map((f) => ({ value: f.id, label: f.nome }))} placeholder="Nessuno" />
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setRevealFurgone(true)}><Plus className="w-3 h-3" /> Furgone</Button>
        )}
      </div>

      {(value.tipo === "messaggio" || (value.destinatari_email || []).length > 0 || revealDest) ? (
        <div className="space-y-1">
          <Label className="text-xs flex items-center justify-between">
            Destinatari
            {value.tipo !== "messaggio" && <button type="button" onClick={() => { setRevealDest(false); set({ destinatari_email: [] }); }} className="text-[10px] font-normal text-muted-foreground hover:text-destructive">rimuovi</button>}
          </Label>
          <div className="max-h-32 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
            {destOptions.length === 0 && <p className="text-xs text-muted-foreground p-2">Nessun utente/collega con email.</p>}
            {destOptions.map((o) => (
              <label key={o.email} className="flex items-center gap-2 p-1 rounded hover:bg-accent cursor-pointer">
                <Checkbox checked={(value.destinatari_email || []).includes(o.email)} onCheckedChange={() => toggleDest(o.email)} />
                <span className="text-xs">{o.nome} <span className="text-muted-foreground">({o.email})</span></span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Senza destinatari la nota è personale (solo tu la vedi).</p>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setRevealDest(true)}><Plus className="w-3 h-3" /> Invia a qualcuno</Button>
      )}
    </div>
  );
}