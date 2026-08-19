# Componenti integri (parte 2)

Codice completo: LavorazioniPage, ProgrammazioneFormDialog, GiornoDetailDialog.

## src/components/anagrafe/LavorazioniPage.jsx

```jsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { CATEGORIE_LAVORAZIONE } from "@/lib/lavorazioni";

const CATEGORIE_NOMI = CATEGORIE_LAVORAZIONE.map(c => c.nome);

function ItemForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const tipiCategoria = CATEGORIE_LAVORAZIONE.find(c => c.nome === form.categoria)?.tipi || [];
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Categoria *</Label>
        <Select value={form.categoria || ""} onValueChange={v => setForm(f => ({ ...f, categoria: v, nome: "" }))}>
          <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Seleziona categoria..." /></SelectTrigger>
          <SelectContent>
            {CATEGORIE_NOMI.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      {form.categoria && (
        <div>
          <Label className="text-xs text-muted-foreground">Tipo lavorazione *</Label>
          <Select value={form.nome || ""} onValueChange={v => setForm(f => ({ ...f, nome: v }))}>
            <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Seleziona tipo..." /></SelectTrigger>
            <SelectContent>
              {tipiCategoria.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              <SelectItem value="__custom__">✏️ Personalizzato</SelectItem>
            </SelectContent>
          </Select>
          {form.nome === "__custom__" && (
            <Input className="mt-2 text-sm" placeholder="Scrivi il tipo personalizzato..." value={form.nome_custom || ""} onChange={e => setForm(f => ({ ...f, nome_custom: e.target.value }))} />
          )}
        </div>
      )}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
        <Button size="sm" onClick={() => onSave({ ...form, nome: form.nome === "__custom__" ? (form.nome_custom || "") : form.nome })} disabled={!form.categoria || !form.nome || (form.nome === "__custom__" && !form.nome_custom)}>
          <Check className="w-3.5 h-3.5 mr-1" /> Salva
        </Button>
      </div>
    </div>
  );
}

export default function LavorazioniPage() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["anagrafe", "TipoLavorazione"],
    queryFn: () => base44.entities.TipoLavorazione.list(),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["anagrafe", "TipoLavorazione"] });

  const handleCreate = async (form) => { await base44.entities.TipoLavorazione.create(form); setAdding(false); refresh(); };
  const handleUpdate = async (id, form) => { await base44.entities.TipoLavorazione.update(id, form); setEditingId(null); refresh(); };
  const handleDelete = async (id) => { await base44.entities.TipoLavorazione.delete(id); refresh(); };

  const byCategoria = items.reduce((acc, item) => {
    const cat = item.categoria || "Senza categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (isLoading) return (<div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>);

  return (
    <div className="space-y-4">
      {Object.entries(byCategoria).map(([cat, voci]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{cat}</p>
          <div className="space-y-2">
            {voci.map(item => (
              editingId === item.id ? (
                <ItemForm key={item.id} initial={item} onSave={f => handleUpdate(item.id, f)} onCancel={() => setEditingId(null)} />
              ) : (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-sm font-medium">{item.nome}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(item.id)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 && !adding && (<div className="text-center py-10 text-muted-foreground text-sm">Nessuna lavorazione. Aggiungine una!</div>)}
      {adding ? <ItemForm onSave={handleCreate} onCancel={() => setAdding(false)} /> : <Button variant="outline" className="w-full gap-2" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Aggiungi lavorazione</Button>}
    </div>
  );
}
```

## src/components/programmazione/ProgrammazioneFormDialog.jsx

```jsx
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Sun, CloudRain, AlertTriangle } from "lucide-react";
import CantiereCombobox from "./CantiereCombobox";

const EMPTY = {
  data: "", tipo_giornata: "normale", cantiere_id: "",
  collaboratori: [], furgoni: [],
  ora_arrivo_magazzino: "06:45", ora_arrivo_cantiere: "", note: "",
};

export default function ProgrammazioneFormDialog({ open, onClose, onSaved, editing, defaultData }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState(null);

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-attivi"],
    queryFn: () => base44.entities.Cantiere.filter({ attivo: true }, "nome"),
  });
  const { data: collaboratori = [] } = useQuery({
    queryKey: ["collaboratori-attivi"],
    queryFn: () => base44.entities.Collaboratore.filter({ attivo: true }, "nome"),
  });
  const { data: furgoni = [] } = useQuery({
    queryKey: ["furgoni-attivi"],
    queryFn: () => base44.entities.Furgone.filter({ attivo: true }, "nome"),
  });
  const { data: existingProg = [] } = useQuery({
    queryKey: ["programmazione-giorno", form.data, form.tipo_giornata],
    queryFn: () => base44.entities.Programmazione.filter({ data: form.data, tipo_giornata: form.tipo_giornata }),
    enabled: !!form.data,
  });
  const { data: permessiData } = useQuery({
    queryKey: ["permessi-ferie", form.data],
    queryFn: () => base44.functions.invoke("get_permessi_ferie", { data: form.data }),
    enabled: !!form.data,
  });
  const permessi = permessiData?.data?.permessi || [];

  const permessiByColl = useMemo(() => {
    const map = new Map();
    if (!collaboratori.length || !permessi.length) return map;
    const norm = (s) => (s || "").trim().toLowerCase();
    const firstToken = (s) => norm(s).split(/\s+/)[0];
    for (const p of permessi) {
      const pNorm = norm(p.nome);
      const pFirst = firstToken(p.nome);
      const match = collaboratori.find((c) => norm(c.nome) === pNorm || firstToken(c.nome) === pFirst);
      if (match) map.set(match.id, p);
    }
    return map;
  }, [collaboratori, permessi]);

  const cantieriUsati = useMemo(() => {
    const ids = new Set();
    existingProg.forEach((e) => { if (e.id !== editing?.id && e.cantiere_id) ids.add(e.cantiere_id); });
    return ids;
  }, [existingProg, editing]);

  const collaboratoriUsati = useMemo(() => {
    const ids = new Set();
    existingProg.forEach((e) => { if (e.id !== editing?.id) (e.collaboratori || []).forEach((c) => c.collaboratore_id && ids.add(c.collaboratore_id)); });
    return ids;
  }, [existingProg, editing]);

  const furgoniUsati = useMemo(() => {
    const ids = new Set();
    existingProg.forEach((e) => { if (e.id !== editing?.id) (e.furgoni || []).forEach((f) => f.furgone_id && ids.add(f.furgone_id)); });
    return ids;
  }, [existingProg, editing]);

  useEffect(() => {
    if (!open) return;
    setErrore(null);
    if (editing) {
      setForm({
        data: editing.data || "", tipo_giornata: editing.tipo_giornata || "normale",
        cantiere_id: editing.cantiere_id || "", collaboratori: editing.collaboratori || [],
        furgoni: editing.furgoni || [], ora_arrivo_magazzino: editing.ora_arrivo_magazzino || "",
        ora_arrivo_cantiere: editing.ora_arrivo_cantiere || "", note: editing.note || "",
      });
    } else {
      setForm({ ...EMPTY, data: defaultData || "" });
    }
  }, [editing, defaultData, open]);

  const toggleCollaboratore = (c) => {
    setForm((f) => {
      const exists = f.collaboratori.find((x) => x.collaboratore_id === c.id);
      return {
        ...f,
        collaboratori: exists ? f.collaboratori.filter((x) => x.collaboratore_id !== c.id) : [...f.collaboratori, { collaboratore_id: c.id, nome: c.nome }],
      };
    });
  };

  const toggleFurgone = (v) => {
    setForm((f) => {
      const exists = f.furgoni.find((x) => x.furgone_id === v.id);
      return {
        ...f,
        furgoni: exists ? f.furgoni.filter((x) => x.furgone_id !== v.id) : [...f.furgoni, { furgone_id: v.id, nome: v.nome }],
      };
    });
  };

  const checkConflicts = async () => {
    const existing = await base44.entities.Programmazione.filter({ data: form.data, tipo_giornata: form.tipo_giornata });
    const others = existing.filter((e) => e.id !== editing?.id);
    if (form.cantiere_id && others.some((e) => e.cantiere_id === form.cantiere_id)) {
      const c = cantieri.find((x) => x.id === form.cantiere_id);
      return `Il cantiere "${c?.nome || ""}" è già assegnato in questa giornata (${form.tipo_giornata}).`;
    }
    const usedColl = new Set();
    others.forEach((e) => (e.collaboratori || []).forEach((c) => usedColl.add(c.collaboratore_id)));
    const collDup = form.collaboratori.filter((c) => usedColl.has(c.collaboratore_id));
    if (collDup.length) return `Collaboratore/i già assegnato/i in questa giornata (${form.tipo_giornata}): ${collDup.map((c) => c.nome).join(", ")}.`;
    const usedFur = new Set();
    others.forEach((e) => (e.furgoni || []).forEach((f) => usedFur.add(f.furgone_id)));
    const furDup = form.furgoni.filter((f) => usedFur.has(f.furgone_id));
    if (furDup.length) return `Furgone/i già assegnato/i in questa giornata (${form.tipo_giornata}): ${furDup.map((f) => f.nome).join(", ")}.`;
    return null;
  };

  const handleSave = async () => {
    if (!form.data) { setErrore("Non puoi salvare: seleziona la data della programmazione."); return; }
    if (!form.cantiere_id) { setErrore("Non puoi salvare: non hai ancora selezionato il cantiere."); return; }
    setSaving(true);
    try {
      const conflict = await checkConflicts();
      if (conflict) { setErrore(conflict); setSaving(false); return; }
      const cantiere = cantieri.find((c) => c.id === form.cantiere_id);
      const payload = {
        data: form.data, tipo_giornata: form.tipo_giornata, cantiere_id: form.cantiere_id,
        cantiere_nome: cantiere?.nome || "", collaboratori: form.collaboratori, furgoni: form.furgoni,
        ora_arrivo_magazzino: form.ora_arrivo_magazzino, ora_arrivo_cantiere: form.ora_arrivo_cantiere,
        note: form.note, stato: editing?.stato || "bozza",
      };
      if (editing) { await base44.entities.Programmazione.update(editing.id, payload); toast.success("Programmazione aggiornata"); }
      else { await base44.entities.Programmazione.create(payload); toast.success("Programmazione creata"); }
      onSaved?.(); onClose?.();
    } catch (e) {
      setErrore("Errore nel salvataggio, riprova.");
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const tipoLabel = form.tipo_giornata === "normale" ? "Giornata normale" : "Giornata di pioggia";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Modifica programmazione" : "Nuova programmazione"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {errore && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span className="font-medium">{errore}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Scenario meteo</Label>
              <Select value={form.tipo_giornata} onValueChange={(v) => setForm((f) => ({ ...f, tipo_giornata: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normale"><span className="flex items-center gap-2"><Sun className="w-4 h-4 text-amber-500" /> Giornata normale</span></SelectItem>
                  <SelectItem value="pioggia"><span className="flex items-center gap-2"><CloudRain className="w-4 h-4 text-blue-500" /> Giornata di pioggia</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cantiere</Label>
            <CantiereCombobox cantieri={cantieri} value={form.cantiere_id} onSelect={(v) => setForm((f) => ({ ...f, cantiere_id: v }))} excludedIds={cantieriUsati} />
            {cantieriUsati.size > 0 && (<p className="text-xs text-muted-foreground">{cantieriUsati.size} cantiere/i già assegnati in questa giornata ({form.tipo_giornata}) sono nascosti dalla lista.</p>)}
          </div>

          <div className="space-y-1.5">
            <Label>Collaboratori</Label>
            <div className="rounded-lg border border-border p-2 max-h-40 overflow-y-auto space-y-1">
              {(() => {
                const visibili = collaboratori.filter((c) => permessiByColl.has(c.id) || !collaboratoriUsati.has(c.id));
                if (visibili.length === 0) {
                  return (<p className="text-xs text-muted-foreground p-2">{collaboratori.length === 0 ? "Nessun collaboratore attivo" : "Tutti i collaboratori sono già assegnati in questa giornata."}</p>);
                }
                return visibili.map((c) => {
                  const permesso = permessiByColl.get(c.id);
                  const checked = !!form.collaboratori.find((x) => x.collaboratore_id === c.id);
                  if (permesso) {
                    const isFerie = permesso.tipo === "ferie";
                    return (
                      <div key={c.id} className="flex items-center gap-2 p-1.5 rounded bg-purple-100 border border-purple-300" title={`${isFerie ? "In ferie" : "In permesso"} per questa data`}>
                        <Checkbox checked={false} disabled />
                        <span className="text-sm text-purple-900 font-medium line-through opacity-80">{c.nome}</span>
                        {c.ruolo && <span className="text-xs text-purple-700">· {c.ruolo}</span>}
                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-600 text-white">{isFerie ? "Ferie" : "Permesso"}</span>
                      </div>
                    );
                  }
                  return (
                    <label key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={() => toggleCollaboratore(c)} />
                      <span className="text-sm">{c.nome}</span>
                      {c.ruolo && <span className="text-xs text-muted-foreground">· {c.ruolo}</span>}
                    </label>
                  );
                });
              })()}
            </div>
            {permessiByColl.size > 0 && (<p className="text-xs text-purple-700">{permessiByColl.size} collaboratore/i in ferie/permesso per questa data (in viola, non selezionabili).</p>)}
            {collaboratoriUsati.size > 0 && (<p className="text-xs text-muted-foreground">{collaboratoriUsati.size} collaboratore/i già assegnati in questa giornata.</p>)}
          </div>

          <div className="space-y-1.5">
            <Label>Furgoni / Mezzi</Label>
            <div className="rounded-lg border border-border p-2 max-h-40 overflow-y-auto space-y-1">
              {furgoni.filter((v) => !furgoniUsati.has(v.id)).length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">{furgoni.length === 0 ? "Nessun furgone attivo" : "Tutti i furgoni sono già assegnati in questa giornata."}</p>
              ) : (
                furgoni.filter((v) => !furgoniUsati.has(v.id)).map((v) => {
                  const checked = !!form.furgoni.find((x) => x.furgone_id === v.id);
                  return (
                    <label key={v.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={() => toggleFurgone(v)} />
                      <span className="text-sm">{v.nome}</span>
                    </label>
                  );
                })
              )}
            </div>
            {furgoniUsati.size > 0 && (<p className="text-xs text-muted-foreground">{furgoniUsati.size} furgone/i già assegnati in questa giornata.</p>)}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Arrivo in magazzino</Label><Input type="time" value={form.ora_arrivo_magazzino} onChange={(e) => setForm((f) => ({ ...f, ora_arrivo_magazzino: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Arrivo in cantiere</Label><Input type="time" value={form.ora_arrivo_cantiere} onChange={(e) => setForm((f) => ({ ...f, ora_arrivo_cantiere: e.target.value }))} /></div>
          </div>

          <div className="space-y-1.5">
            <Label>Note (materiali, attrezzi, mansioni)</Label>
            <Textarea rows={4} value={form.note} placeholder="Es. caricare assi e puntelli, portare idropulitrice, finire pittura stanza sud..." onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
          <p className="text-xs text-muted-foreground">Verifica automatica: in {tipoLabel.toLowerCase()} non si possono ripetere cantiere, collaboratori o furgoni già assegnati. Le due programmazioni (normale/pioggia) sono alternative e indipendenti.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## src/components/orelavoratori/GiornoDetailDialog.jsx

```jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Route, Clock, Truck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { TRASFERTA_CONFIG, fmtOre } from "@/lib/timbratureUtils";
import { formatDataBreve } from "@/lib/oreLavoratoriUtils";

export default function GiornoDetailDialog({ open, onOpenChange, data, dettaglio, trasferta, collaboratoreNome }) {
  const cantieri = dettaglio?.cantieri || [];
  const spostamenti = dettaglio?.spostamenti || [];
  const oreTotali = dettaglio?.oreTotali || 0;
  const oreCantieri = dettaglio?.oreCantieri || 0;
  const oreSpostamenti = dettaglio?.oreSpostamenti || 0;
  const note = dettaglio?.note || [];
  const cfg = trasferta?.tipo_trasferta ? TRASFERTA_CONFIG[trasferta.tipo_trasferta] : null;
  const cfgAndata = trasferta?.fascia_andata ? TRASFERTA_CONFIG[trasferta.fascia_andata] : null;
  const cfgRitorno = trasferta?.fascia_ritorno ? TRASFERTA_CONFIG[trasferta.fascia_ritorno] : null;
  const split = trasferta?.fascia_andata && trasferta?.fascia_ritorno && trasferta.fascia_andata !== trasferta.fascia_ritorno;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><Clock className="w-4 h-4 text-primary" />{data ? formatDataBreve(data) : ""}</DialogTitle>
          <p className="text-xs text-muted-foreground -mt-1">{collaboratoreNome}</p>
        </DialogHeader>

        <Card className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Totale giornata</p>
            <p className="text-xl font-bold text-primary">{fmtOre(oreTotali)}</p>
          </div>
          <div className="text-right text-[11px] text-muted-foreground space-y-0.5">
            <p>Cantieri: <span className="font-semibold text-foreground">{fmtOre(oreCantieri)}</span></p>
            <p>Spostamenti: <span className="font-semibold text-foreground">{fmtOre(oreSpostamenti)}</span></p>
          </div>
        </Card>

        {cantieri.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Cantieri</p>
            {cantieri.map((c, i) => (
              <Card key={c.id || c.nome || i} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{c.nome}</p>
                    {c.ingresso && c.uscita ? (
                      <p className="text-[11px] text-muted-foreground">{format(new Date(c.ingresso.data_ora), "HH:mm", { locale: it })}{" → "}{format(new Date(c.uscita.data_ora), "HH:mm", { locale: it })}</p>
                    ) : c.stato === "bozza" ? (<p className="text-[11px] text-amber-600">rapportino in bozza</p>) : (<p className="text-[11px] text-muted-foreground">da rapportino</p>)}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.stato === "bozza" && <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">bozza</Badge>}
                    <span className="text-sm font-bold text-primary">{fmtOre(c.ore)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {spostamenti.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Navigation className="w-3.5 h-3.5 text-orange-600" /> Spostamenti</p>
            {spostamenti.map((s, i) => (
              <Card key={s.id} className="p-3 border-orange-200 bg-orange-50/30">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate"><span className="text-orange-600">#{i + 1}</span>{" "}{s.destinazione ? `→ ${s.destinazione}` : "In corso"}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>{format(s.ora, "HH:mm", { locale: it })}</span>
                      {s.durata > 0 && <span>· {fmtOre(s.durata)}</span>}
                      {s.mezzo_proprio && <span className="flex items-center gap-0.5"><Truck className="w-3 h-3" />mezzo proprio</span>}
                    </p>
                  </div>
                  {s.km > 0 && (<Badge variant="outline" className="text-orange-700 border-orange-300 text-[10px]">{s.km} km</Badge>)}
                </div>
              </Card>
            ))}
          </div>
        )}

        {trasferta && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Route className="w-3.5 h-3.5" /> Trasferta</p>
            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Giornata (media andata+ritorno)</span>
                {cfg ? <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
              </div>
              {split && (
                <div className="rounded-md bg-primary/10 px-2 py-1.5 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Combinazione</p>
                  <p className="text-sm font-bold text-primary">{trasferta.label || `½ ${trasferta.fascia_andata} + ½ ${trasferta.fascia_ritorno}`}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[9px] text-muted-foreground uppercase">Andata</p>
                  <p className="text-sm font-bold">{trasferta.km_andata ?? 0} km</p>
                  {cfgAndata ? <Badge variant="outline" className={`mt-1 text-[9px] ${cfgAndata.color}`}>{cfgAndata.label}</Badge> : <p className="text-[9px] text-muted-foreground mt-1">—</p>}
                  <p className="text-[9px] text-muted-foreground truncate mt-1">{trasferta.primo_cantiere_nome || "—"}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-2">
                  <p className="text-[9px] text-muted-foreground uppercase">Ritorno</p>
                  <p className="text-sm font-bold">{trasferta.km_ritorno ?? 0} km</p>
                  {cfgRitorno ? <Badge variant="outline" className={`mt-1 text-[9px] ${cfgRitorno.color}`}>{cfgRitorno.label}</Badge> : <p className="text-[9px] text-muted-foreground mt-1">—</p>}
                  <p className="text-[9px] text-muted-foreground truncate mt-1">{trasferta.ultimo_cantiere_nome || "—"}</p>
                </div>
                <div className="rounded-md bg-primary/10 p-2 flex flex-col">
                  <p className="text-[9px] text-muted-foreground uppercase">Totali</p>
                  <p className="text-sm font-bold text-primary flex-1 flex items-center">{trasferta.km_totali ?? 0} km</p>
                  {trasferta.confermata && <Badge className="mt-1 text-[9px] bg-emerald-600">confermata</Badge>}
                </div>
              </div>
              {trasferta.mezzo_proprio && (<p className="text-[11px] text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> Spostamento con mezzo proprio</p>)}
            </Card>
          </div>
        )}

        {note.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Note / Anomalie</p>
            {note.map((n, i) => (
              <Card key={i} className="p-3 border-amber-200 bg-amber-50/40">
                {n.cantiere && <p className="text-[11px] text-muted-foreground mb-0.5">{n.cantiere}</p>}
                <p className="text-sm text-amber-900">{n.testo}</p>
              </Card>
            ))}
          </div>
        )}

        {cantieri.length === 0 && spostamenti.length === 0 && !trasferta && note.length === 0 && (<p className="text-center text-sm text-muted-foreground py-6">Nessun dato per questa giornata</p>)}
      </DialogContent>
    </Dialog>
  );
}
``