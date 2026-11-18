import { useMemo, useState } from "react";
import { Mail, MapPin, Phone, Plus, Search, Settings, Trash2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EliminaDialog from "./EliminaDialog";
import { STATI, cercaSopralluogo, nomeCliente, numFoto, numStanze, statoEffettivo, statoInfo } from "@/lib/sopralluogo";

export default function ListaSopralluoghi({ items, loading, onNew, onOpen, onSettings, onChangeStato, onDelete }) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("tutti");
  const [daEliminare, setDaEliminare] = useState(null);

  const conStato = useMemo(() => items.map((s) => ({ s, stato: statoEffettivo(s) })), [items]);
  const conteggi = useMemo(() => {
    const c = { tutti: conStato.length };
    STATI.forEach((st) => (c[st.key] = conStato.filter((x) => x.stato === st.key).length));
    return c;
  }, [conStato]);
  const visibili = conStato.filter(({ s, stato }) => (filtro === "tutti" || stato === filtro) && cercaSopralluogo(s, query));

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold flex-1">Sopralluogo</h1>
        <Button variant="outline" size="icon" aria-label="Impostazioni" onClick={onSettings}><Settings className="w-4 h-4" /></Button>
        <Button className="gap-1.5" onClick={onNew}><Plus className="w-4 h-4" />Nuovo</Button>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cerca per cliente, indirizzo, città, telefono, email" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ key: "tutti", label: "Tutti" }, ...STATI].map((f) => (
          <button key={f.key} type="button" onClick={() => setFiltro(f.key)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${filtro === f.key ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
            {f.label} ({conteggi[f.key] || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nessun sopralluogo ancora.</p>
          <Button onClick={onNew} className="gap-1.5"><Plus className="w-4 h-4" />Crea il primo sopralluogo</Button>
        </div>
      ) : visibili.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Nessun sopralluogo corrisponde a ricerca e filtri.</p>
      ) : (
        <div className="space-y-2">
          {visibili.map(({ s, stato }) => (
            <Card key={s.id} className="p-3 space-y-2">
              <div className="flex items-start gap-2">
                <button type="button" className="flex-1 text-left min-w-0" onClick={() => onOpen(s)}>
                  <p className="font-semibold truncate">{nomeCliente(s)}</p>
                  <p className="text-xs text-muted-foreground">{s.data ? new Date(s.data).toLocaleDateString("it-IT") : "Senza data"} · <span className="capitalize">{s.tipo}</span></p>
                  {(s.indirizzo || s.citta) && <p className="text-xs flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{[s.indirizzo, s.citta].filter(Boolean).join(", ")}</p>}
                  {s.telefono && <p className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{s.telefono}</p>}
                  {s.email && <p className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</p>}
                </button>
                <button type="button" aria-label="Elimina" className="p-1.5 text-muted-foreground hover:text-destructive" onClick={() => setDaEliminare(s)}><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                <select aria-label="Stato" className={`h-7 rounded-full px-2 text-xs font-medium border-0 ${statoInfo(stato).cls}`} value={stato} onChange={(e) => onChangeStato(s, e.target.value)}>
                  {STATI.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
                </select>
                <span>{numStanze(s)} stanze/porzioni · {numFoto(s)} foto</span>
                {s.preventivo_riferimento && <span className="text-blue-700">Preventivo: {s.preventivo_riferimento}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <EliminaDialog open={!!daEliminare} onOpenChange={(o) => !o && setDaEliminare(null)} nome={daEliminare ? nomeCliente(daEliminare) : ""} onConfirm={() => { onDelete(daEliminare); setDaEliminare(null); }} />
    </div>
  );
}