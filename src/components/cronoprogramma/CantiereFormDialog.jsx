import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users } from "lucide-react";
import { STATI, calcolaPiano, COLORE_DEFAULT } from "@/lib/cronoCalc";

const VUOTO = {
  nome: "", descrizione: "", data_inizio: "", ore_totali: 0, persone: 1, ore_giornaliere: 8,
  giorni_maltempo: 0, giorni_pioggia: 0, stato: "pianificato", data_confermata: false,
  capocantiere: "", capocantiere_id: "", responsabile: "", responsabile_id: "",
  indirizzo: "", committente: "", mezzi: [], pause: [], note: "", colore: "",
};
const NESSUNO = "__none";
const d = (s) => format(parseISO(s), "dd/MM/yyyy");

function Campo({ label, children }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function SupervisoreSelect({ valore, lista, onChange }) {
  return (
    <Select value={valore || NESSUNO} onValueChange={(v) => onChange(v === NESSUNO ? null : lista.find((s) => s.id === v))}>
      <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NESSUNO}>Nessuno</SelectItem>
        {lista.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: s.colore }} />{s.nome}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function CantiereFormDialog({ open, onClose, initial, defaultDate, supervisori, onSave, saving, onManage }) {
  const [f, setF] = useState(VUOTO);
  useEffect(() => {
    if (open) setF(initial ? { ...VUOTO, ...initial, mezzi: initial.mezzi || [], pause: initial.pause || [] } : { ...VUOTO, data_inizio: defaultDate || "" });
  }, [open, initial, defaultDate]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const num = (k) => (e) => set(k, e.target.value === "" ? 0 : Number(e.target.value));
  const piano = calcolaPiano(f);
  const capi = supervisori.filter((s) => s.ruolo === "capocantiere");
  const resp = supervisori.filter((s) => s.ruolo === "responsabile");
  const sup = (id) => supervisori.find((s) => s.id === id);
  const colore = sup(f.capocantiere_id)?.colore || sup(f.responsabile_id)?.colore || f.colore || COLORE_DEFAULT;
  const valido = f.nome.trim() && f.data_inizio;

  const scegli = (tipo) => (s) => setF((p) => ({ ...p, [tipo]: s?.nome || "", [`${tipo}_id`]: s?.id || "" }));
  const salva = () => onSave({ ...f, colore, pause: f.pause.filter((p) => p.inizio && p.fine) , mezzi: f.mezzi.filter((m) => m.nome || m.targa) });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Modifica cantiere" : "Nuovo cantiere"}</DialogTitle></DialogHeader>
        <Tabs defaultValue="generale">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="generale">Generale</TabsTrigger>
            <TabsTrigger value="dati">Dati Cantiere</TabsTrigger>
            <TabsTrigger value="mezzi">Mezzi</TabsTrigger>
          </TabsList>

          <TabsContent value="generale" className="space-y-3">
            <Campo label="Nome *"><Input value={f.nome} onChange={(e) => set("nome", e.target.value)} /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Data inizio *"><Input type="date" value={f.data_inizio} onChange={(e) => set("data_inizio", e.target.value)} /></Campo>
              <Campo label="Stato">
                <Select value={f.stato} onValueChange={(v) => set("stato", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATI).map(([k, s]) => <SelectItem key={k} value={k}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </Campo>
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <span className="text-sm">{f.data_confermata ? "Data confermata con il cliente" : "Data non confermata"}</span>
              <Switch checked={f.data_confermata} onCheckedChange={(v) => set("data_confermata", v)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Campo label="Ore totali"><Input type="number" inputMode="decimal" min="0" value={f.ore_totali || ""} onChange={num("ore_totali")} /></Campo>
              <Campo label="Persone"><Input type="number" inputMode="decimal" min="0" value={f.persone || ""} onChange={num("persone")} /></Campo>
              <Campo label="Ore/giorno/pers."><Input type="number" inputMode="decimal" min="0" value={f.ore_giornaliere || ""} onChange={num("ore_giornaliere")} /></Campo>
            </div>
            <div className="rounded-lg bg-muted/60 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-semibold"><Users className="w-4 h-4" /> Riepilogo</div>
              <div>Giorni lavorativi necessari: <b>{piano.necessari}</b></div>
              <div>Maltempo: <b>{f.giorni_maltempo || 0}</b> gg (pioggia {f.giorni_pioggia || 0})</div>
              <div>Data fine prevista: <b>{f.data_inizio && piano.fine ? d(piano.fine) : "-"}</b></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Pause / interruzioni</Label>
                <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => set("pause", [...f.pause, { inizio: "", fine: "" }])}><Plus className="w-3 h-3" /> Pausa</Button>
              </div>
              {f.pause.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input type="date" value={p.inizio} onChange={(e) => set("pause", f.pause.map((x, j) => (j === i ? { ...x, inizio: e.target.value } : x)))} />
                  <Input type="date" value={p.fine} min={p.inizio} onChange={(e) => set("pause", f.pause.map((x, j) => (j === i ? { ...x, fine: e.target.value } : x)))} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => set("pause", f.pause.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              {piano.steps.length > 0 && (
                <div className="space-y-1">
                  {piano.steps.map((s, i) => (
                    <div key={i} className={`text-xs rounded px-2 py-1 ${s.tipo === "pausa" ? "bg-gray-200 text-gray-700" : "text-white"}`} style={s.tipo === "lavoro" ? { background: colore } : undefined}>
                      {s.tipo === "pausa" ? "Pausa" : `Step di lavoro (${s.giorni} gg)`}: {d(s.da)} → {d(s.a)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Campo label="Note"><Textarea rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} /></Campo>
          </TabsContent>

          <TabsContent value="dati" className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">Colore cantiere <span className="w-4 h-4 rounded-full border" style={{ background: colore }} /></span>
              <Button type="button" size="sm" variant="outline" onClick={onManage}>Gestisci supervisori</Button>
            </div>
            <Campo label="Capocantiere"><SupervisoreSelect valore={f.capocantiere_id} lista={capi} onChange={scegli("capocantiere")} /></Campo>
            <Campo label="Responsabile"><SupervisoreSelect valore={f.responsabile_id} lista={resp} onChange={scegli("responsabile")} /></Campo>
            <Campo label="Indirizzo"><Input value={f.indirizzo} onChange={(e) => set("indirizzo", e.target.value)} /></Campo>
            <Campo label="Committente"><Input value={f.committente} onChange={(e) => set("committente", e.target.value)} /></Campo>
            <Campo label="Descrizione dei lavori"><Textarea rows={3} value={f.descrizione} onChange={(e) => set("descrizione", e.target.value)} /></Campo>
          </TabsContent>

          <TabsContent value="mezzi" className="space-y-2">
            {f.mezzi.length === 0 && <p className="text-sm text-muted-foreground">Nessun mezzo assegnato.</p>}
            {f.mezzi.map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input placeholder="Nome mezzo" value={m.nome || ""} onChange={(e) => set("mezzi", f.mezzi.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} />
                <Input placeholder="Targa" value={m.targa || ""} onChange={(e) => set("mezzi", f.mezzi.map((x, j) => (j === i ? { ...x, targa: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="icon" onClick={() => set("mezzi", f.mezzi.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => set("mezzi", [...f.mezzi, { nome: "", targa: "" }])}><Plus className="w-3 h-3" /> Aggiungi mezzo</Button>
          </TabsContent>
        </Tabs>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button disabled={!valido || saving} onClick={salva}>{saving ? "Salvataggio..." : "Salva"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}