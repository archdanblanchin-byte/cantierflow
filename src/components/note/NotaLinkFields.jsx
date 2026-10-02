import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import SheetSelect from "@/components/ui/sheet-select";
import { Plus, X, Search } from "lucide-react";

/** Lista a selezione multipla (materiali / attrezzi) con ricerca. */
function MultiPick({ titolo, options, selected, onToggle, emptyText }) {
  const [q, setQ] = useState("");
  const low = q.toLowerCase();
  const filtrati = options.filter((o) => (o.nome || "").toLowerCase().includes(low));
  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Cerca ${titolo.toLowerCase()}…`} className="h-9 pl-7 text-base sm:h-8 sm:text-xs" />
      </div>
      <div className="max-h-32 overflow-y-auto rounded-lg border border-border p-1.5 space-y-0.5">
        {filtrati.length === 0 && <p className="text-xs text-muted-foreground p-2">{emptyText}</p>}
        {filtrati.slice(0, 60).map((o) => (
          <label key={o.id} className="flex items-center gap-2 p-1 rounded hover:bg-accent cursor-pointer">
            <Checkbox checked={selected.some((s) => s.id === o.id)} onCheckedChange={() => onToggle(o)} />
            <span className="text-xs truncate">{o.nome}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Collegamenti di una nota/task/comunicazione agli elementi dell'app:
 * cantiere, furgone, materiali, attrezzi.
 * value = { cantiere_id, furgone_id, materiali: [{id,nome}], attrezzi: [{id,nome}] }
 */
export default function NotaLinkFields({ value, onChange, cantieri = [], furgoni = [], materialiList = [], attrezziList = [] }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const [reveal, setReveal] = useState({ cantiere: false, furgone: false, materiali: false, attrezzi: false });
  const mostra = (k) => setReveal((r) => ({ ...r, [k]: true }));

  const materiali = value.materiali || [];
  const attrezzi = value.attrezzi || [];

  const toggle = (key, lista, o) =>
    set({ [key]: lista.some((x) => x.id === o.id) ? lista.filter((x) => x.id !== o.id) : [...lista, { id: o.id, nome: o.nome }] });

  const chips = (key, lista) =>
    lista.map((x) => (
      <span key={x.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
        {x.nome}
        <button type="button" onClick={() => set({ [key]: lista.filter((y) => y.id !== x.id) })} aria-label={`Rimuovi ${x.nome}`}>
          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
        </button>
      </span>
    ));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(value.cantiere_id || reveal.cantiere) ? (
          <div className="space-y-1 flex-1 min-w-[140px]">
            <Label className="text-xs flex items-center justify-between">
              Cantiere
              {value.cantiere_id && <button type="button" onClick={() => set({ cantiere_id: "" })} className="text-[10px] font-normal text-muted-foreground hover:text-destructive">rimuovi</button>}
            </Label>
            <SheetSelect value={value.cantiere_id || ""} onValueChange={(v) => set({ cantiere_id: v })} options={cantieri.filter((c) => c.attivo !== false).map((c) => ({ value: c.id, label: c.nome }))} placeholder="Nessuno" />
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => mostra("cantiere")}><Plus className="w-3 h-3" /> Cantiere</Button>
        )}
        {(value.furgone_id || reveal.furgone) ? (
          <div className="space-y-1 flex-1 min-w-[140px]">
            <Label className="text-xs flex items-center justify-between">
              Furgone
              {value.furgone_id && <button type="button" onClick={() => set({ furgone_id: "" })} className="text-[10px] font-normal text-muted-foreground hover:text-destructive">rimuovi</button>}
            </Label>
            <SheetSelect value={value.furgone_id || ""} onValueChange={(v) => set({ furgone_id: v })} options={furgoni.filter((f) => f.attivo !== false).map((f) => ({ value: f.id, label: f.nome }))} placeholder="Nessuno" />
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => mostra("furgone")}><Plus className="w-3 h-3" /> Furgone</Button>
        )}
        {(materiali.length > 0 || reveal.materiali) ? (
          <div className="space-y-1 w-full">
            <Label className="text-xs flex items-center justify-between">
              Materiali
              <button type="button" onClick={() => set({ materiali: [] })} className="text-[10px] font-normal text-muted-foreground hover:text-destructive">rimuovi</button>
            </Label>
            {materiali.length > 0 && <div className="flex flex-wrap gap-1">{chips("materiali", materiali)}</div>}
            <MultiPick titolo="Materiali" options={materialiList} selected={materiali} onToggle={(o) => toggle("materiali", materiali, o)} emptyText="Nessun materiale in anagrafica" />
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => mostra("materiali")}><Plus className="w-3 h-3" /> Materiali</Button>
        )}
        {(attrezzi.length > 0 || reveal.attrezzi) ? (
          <div className="space-y-1 w-full">
            <Label className="text-xs flex items-center justify-between">
              Attrezzi
              <button type="button" onClick={() => set({ attrezzi: [] })} className="text-[10px] font-normal text-muted-foreground hover:text-destructive">rimuovi</button>
            </Label>
            {attrezzi.length > 0 && <div className="flex flex-wrap gap-1">{chips("attrezzi", attrezzi)}</div>}
            <MultiPick titolo="Attrezzi" options={attrezziList} selected={attrezzi} onToggle={(o) => toggle("attrezzi", attrezzi, o)} emptyText="Nessun attrezzo in anagrafica" />
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => mostra("attrezzi")}><Plus className="w-3 h-3" /> Attrezzi</Button>
        )}
      </div>
    </div>
  );
}