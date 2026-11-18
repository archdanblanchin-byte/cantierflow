import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

// Elenco di sottrazioni o aggiunte: nome (da anagrafica o libero), quantità e valore unitario.
export default function RigheDettaglio({ titolo, righe = [], onChange, suggerimenti = [], listId }) {
  const set = (i, k, v) => onChange(righe.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">{titolo}</p>
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onChange([...righe, { nome: "", quantita: "1", valore: "" }])}>
          <Plus className="w-3 h-3" /> Aggiungi
        </Button>
      </div>
      <datalist id={listId}>{suggerimenti.map((s) => <option key={s} value={s} />)}</datalist>
      {righe.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_52px_64px_28px] gap-1.5 items-center">
          <Input className="h-8 text-xs" list={listId} placeholder="Voce" value={r.nome || ""} onChange={(e) => set(i, "nome", e.target.value)} />
          <Input className="h-8 text-xs" inputMode="decimal" placeholder="Qtà" value={r.quantita ?? ""} onChange={(e) => set(i, "quantita", e.target.value)} />
          <Input className="h-8 text-xs" inputMode="decimal" placeholder="m²" value={r.valore ?? ""} onChange={(e) => set(i, "valore", e.target.value)} />
          <button type="button" aria-label="Rimuovi" onClick={() => onChange(righe.filter((_, j) => j !== i))}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      ))}
    </div>
  );
}