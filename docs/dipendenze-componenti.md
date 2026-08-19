# Componenti CantierFlow (20)

Ricrea questi componenti in Workflow sotto gli stessi percorsi in `src/components/`. I componenti UI shadcn (`Button`, `Input`, `Label`, `Dialog`, `Select`, `Card`, `Badge`, `Skeleton`, `Textarea`, `Checkbox`, `Switch`, `Popover`, `Command`, `AlertDialog`, `useToast`) sono standard in ogni app Base44 e NON vanno copiati.

## src/components/BottomNav.jsx

```jsx
import { Link, useLocation } from "react-router-dom";
import { Home, ClipboardList, Building2, BookUser, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermessi } from "@/hooks/usePermessi";

const ALL_NAV_ITEMS = [
  { key: "home", label: "Home", icon: Home, path: "/", always: true },
  { key: "timbratura", label: "Timbra", icon: Clock, path: "/timbratura" },
  { key: "rapportini", label: "Rapportini", icon: ClipboardList, path: "/rapportini" },
  { key: "cantieri", label: "Cantieri", icon: Building2, path: "/cantieri" },
  { key: "anagrafe", label: "Anagrafe", icon: BookUser, path: "/anagrafe" },
];

export default function BottomNav() {
  const location = useLocation();
  const { puoVedere } = usePermessi();
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(i => i.always || puoVedere(i.key));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

## src/components/home/ReportCard.jsx

```jsx
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ReportCard({ report }) {
  const collCount = (report.collaboratori || []).length;
  const lavCount = (report.lavorazioni_normali || []).length;
  const isBozza = report.stato !== "inviato";
  const to = isBozza ? `/modifica-report/${report.id}` : `/report/${report.id}`;

  return (
    <Link to={to} className="block rounded-xl border border-border bg-card p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isBozza ? (
              <Badge variant="default" className="text-[10px] uppercase tracking-wider cursor-pointer bg-orange-500 hover:bg-orange-500 border-orange-500">Compila</Badge>
            ) : (
              <Badge variant="default" className="text-[10px] uppercase tracking-wider">Inviato</Badge>
            )}
            <span className="text-xs text-muted-foreground">{report.data ? format(new Date(report.data), "d MMM yyyy", { locale: it }) : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm truncate">{report.cantiere_nome || "—"}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {collCount} collabor.</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {report.ore_totali_squadra || 0}h</span>
            <span>{lavCount} lavoraz.</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}
```

## src/components/foto/FotoCard.jsx

```jsx
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ZoomIn, MessageSquare } from "lucide-react";

export default function FotoCard({ foto, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const displayUrl = foto.url_annotata || foto.url;

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden bg-card group">
        <div className="relative aspect-video cursor-pointer" onClick={() => setOpen(true)}>
          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {foto.annotazioni?.length > 0 && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">{foto.annotazioni.length} annot.</div>
          )}
        </div>
        <div className="p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {foto.cantiere_nome && <p className="text-[11px] font-semibold text-primary truncate">{foto.cantiere_nome}</p>}
              {foto.nota && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 flex gap-1"><MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />{foto.nota}</p>}
              {foto.created_date && <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(foto.created_date).toLocaleDateString("it-IT")}</p>}
            </div>
            <div className="flex gap-1">
              {onEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(foto)}><Pencil className="w-3.5 h-3.5" /></Button>}
              {onDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(foto)}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
          </div>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-2">
          <img src={displayUrl} alt="" className="w-full max-h-[85vh] object-contain rounded-lg" />
          {foto.nota && <div className="flex items-start gap-2 px-2 pb-1"><MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" /><p className="text-sm text-muted-foreground">{foto.nota}</p></div>}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## src/components/foto/AggiungiFotoModal.jsx

Vedi file originale completo. Salva una Foto (foto o codice colore) con annotazioni. Usa `base44.integrations.Core.UploadFile` e importa `FotoEditor`. Dimensioni ~270 righe. Il codice completo è in `src/components/foto/AggiungiFotoModal.jsx` del progetto CantierFlow — copialo integrale.

## src/components/foto/FotoEditor.jsx

Editor di annotazioni su canvas (frecce, riquadri, testo, misure). Usa `<canvas>` nativo, salva dataURL JPEG. Dimensioni ~230 righe. Copia integrale da `src/components/foto/FotoEditor.jsx`.

## src/components/anagrafe/AnagrafePage.jsx

```jsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePermessi } from "@/hooks/usePermessi";
import { Plus, Pencil, Trash2, Check, X, ChevronRight } from "lucide-react";

function ItemForm({ fields, initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      {fields.map(f => (
        <div key={f.key}>
          <Label className="text-xs text-muted-foreground">{f.label}{f.required ? " *" : ""}</Label>
          <Input value={form[f.key] || ""} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="mt-1 h-8 text-sm" />
        </div>
      ))}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={fields.filter(f => f.required).some(f => !form[f.key])}><Check className="w-3.5 h-3.5 mr-1" /> Salva</Button>
      </div>
    </div>
  );
}

export default function AnagrafePage({ sezione }) {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermessi();
  const [adding, setAdding] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editInDetail, setEditInDetail] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["anagrafe", sezione.entity],
    queryFn: () => base44.entities[sezione.entity].list(),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["anagrafe", sezione.entity] });

  const handleCreate = async (form) => { await base44.entities[sezione.entity].create({ ...form, attivo: true }); setAdding(false); refresh(); };
  const handleUpdate = async (id, form) => { await base44.entities[sezione.entity].update(id, form); setEditInDetail(false); setDetailItem(null); refresh(); };
  const handleDelete = async (id) => { await base44.entities[sezione.entity].delete(id); setDetailItem(null); refresh(); };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;

  return (
    <div className="space-y-3">
      {items.map(item => (
        <button key={item.id} onClick={() => { setDetailItem(item); setEditInDetail(false); }} className="flex items-center justify-between w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent transition-colors">
          <div>
            <p className="text-sm font-medium">{item[sezione.fields[0].key] || "—"}</p>
            {sezione.fields[1] && item[sezione.fields[1].key] && <p className="text-xs text-muted-foreground mt-0.5">{item[sezione.fields[1].key]}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}
      {items.length === 0 && !adding && <div className="text-center py-10 text-muted-foreground text-sm">Nessun elemento. Aggiungi il primo!</div>}
      {adding ? <ItemForm fields={sezione.fields} onSave={handleCreate} onCancel={() => setAdding(false)} /> : <Button variant="outline" className="w-full gap-2" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Aggiungi</Button>}
      <Dialog open={!!detailItem} onOpenChange={(v) => { if (!v) { setDetailItem(null); setEditInDetail(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{sezione.label}</DialogTitle></DialogHeader>
          {detailItem && (editInDetail ? <ItemForm fields={sezione.fields} initial={detailItem} onSave={(form) => handleUpdate(detailItem.id, form)} onCancel={() => setEditInDetail(false)} /> : (
            <div className="space-y-3 py-1">
              {sezione.fields.map(f => (<div key={f.key} className="border-b border-border pb-2 last:border-0"><p className="text-xs text-muted-foreground">{f.label}</p><p className="text-sm font-medium mt-0.5 break-words">{detailItem[f.key] || "—"}</p></div>))}
            </div>
          ))}
          {!editInDetail && detailItem && (
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => setEditInDetail(true)}><Pencil className="w-4 h-4 mr-1" /> Modifica</Button>
              {isAdmin && <Button variant="destructive" onClick={() => handleDelete(detailItem.id)}><Trash2 className="w-4 h-4 mr-1" /> Elimina</Button>}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## src/components/anagrafe/FurgoniPage.jsx

Copia integrale da `src/components/anagrafe/FurgoniPage.jsx` (~280 righe). Gestisce furgoni con campi tecnici (targa, scadenze, km), vista dettaglio e sezione note/segnalazioni in tempo reale (entità `NotaFurgone` con subscribe). Usa `usePermessi` per limitare delete agli admin.

## src/components/anagrafe/LavorazioniPage.jsx

Copia integrale da `src/components/anagrafe/LavorazioniPage.jsx` (~150 righe). CRUD TipiLavorazione raggruppati per categoria, usa `CATEGORIE_LAVORAZIONE` da `@/lib/lavorazioni`.

## src/components/programmazione/ProgrammazioneCard.jsx

```jsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, Clock, CloudRain, Sun, Pencil, Trash2, Send } from "lucide-react";

const TIPO_META = {
  normale: { label: "Giornata normale", icon: Sun, color: "bg-amber-100 text-amber-700" },
  pioggia: { label: "Giornata di pioggia", icon: CloudRain, color: "bg-blue-100 text-blue-700" },
};

export default function ProgrammazioneCard({ item, onEdit, onDelete, onPublish, readonly }) {
  const meta = TIPO_META[item.tipo_giornata] || TIPO_META.normale;
  const Icon = meta.icon;
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}><Icon className="w-5 h-5" /></div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{item.cantiere_nome || "Cantiere"}</p>
            <p className="text-xs text-muted-foreground">{meta.label}</p>
          </div>
        </div>
        {item.stato === "pubblicato" ? <Badge className="bg-emerald-100 text-emerald-700 border-transparent">Pubblicato</Badge> : <Badge variant="secondary">Bozza</Badge>}
      </div>
      <div className="mt-3 space-y-2 text-sm">
        {item.collaboratori?.length > 0 && <div className="flex items-start gap-2"><Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><span className="text-foreground/90">{item.collaboratori.map((c) => c.nome).join(", ")}</span></div>}
        {item.furgoni?.length > 0 && <div className="flex items-start gap-2"><Truck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><span className="text-foreground/90">{item.furgoni.map((f) => f.nome).join(", ")}</span></div>}
        {(item.ora_arrivo_magazzino || item.ora_arrivo_cantiere) && (
          <div className="flex items-start gap-2"><Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><span className="text-foreground/90">{item.ora_arrivo_magazzino && `Arrivo in magazzino ${item.ora_arrivo_magazzino}`}{item.ora_arrivo_magazzino && item.ora_arrivo_cantiere && " · "}{item.ora_arrivo_cantiere && `Arrivo in cantiere ${item.ora_arrivo_cantiere}`}</span></div>
        )}
        {item.note && <div className="rounded-lg bg-muted/60 p-2.5 text-xs text-foreground/80 whitespace-pre-wrap">{item.note}</div>}
      </div>
      {!readonly && (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit?.(item)}><Pencil className="w-3.5 h-3.5" />Modifica</Button>
          {item.stato !== "pubblicato" && <Button size="sm" onClick={() => onPublish?.(item)}><Send className="w-3.5 h-3.5" />Pubblica</Button>}
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={() => onDelete?.(item)}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      )}
    </div>
  );
}
```

## src/components/programmazione/ProgrammazioneFormDialog.jsx

Copia integrale da `src/components/programmazione/ProgrammazioneFormDialog.jsx` (~400 righe). Form di creazione/modifica programmazione: data, scenario meteo, cantiere (CantiereCombobox), collaboratori con ferie/permessi da Google Calendar (backend `get_permessi_ferie`), furgoni, orari magazzino/cantiere, note. Validazione conflitti (cantiere/collab/furgone univoci per data+tipo).

## src/components/programmazione/CantiereCombobox.jsx

```jsx
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CantiereCombobox({ cantieri, value, onSelect, excludedIds = new Set(), placeholder = "Cerca cantiere..." }) {
  const [open, setOpen] = useState(false);
  const selected = cantieri.find((c) => c.id === value);
  const disponibili = cantieri.filter((c) => !excludedIds.has(c.id));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selected ? (<span className="flex items-center gap-2 truncate"><MapPin className="w-4 h-4 text-muted-foreground shrink-0" /><span className="truncate">{selected.nome}</span></span>) : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="Cerca per nome cantiere..." />
          <CommandList>
            <CommandEmpty>{disponibili.length === 0 && cantieri.length > 0 ? "Tutti i cantieri sono già assegnati per questa giornata." : "Nessun cantiere trovato."}</CommandEmpty>
            <CommandGroup>
              {disponibili.map((c) => (
                <CommandItem key={c.id} value={`${c.nome} ${c.citta || ""} ${c.cliente || ""}`} onSelect={() => { onSelect(c.id); setOpen(false); }}>
                  <Check className={cn("mr-1 w-4 h-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col"><span>{c.nome}</span>{c.citta && <span className="text-xs text-muted-foreground">{c.citta}</span>}</div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

## src/components/orelavoratori/CalendarioMese.jsx

```jsx
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isToday } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { TRASFERTA_CONFIG, fmtOre } from "@/lib/timbratureUtils";

const GIORNI_SETT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function CalendarioMese({ mese, giorniSintesi, onGiornoClick }) {
  const primo = startOfMonth(mese);
  const ultimo = endOfMonth(mese);
  const offset = (getDay(primo) + 6) % 7;
  const giorni = eachDayOfInterval({ start: primo, end: ultimo });
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {GIORNI_SETT.map((g) => (<div key={g} className="text-center text-[10px] font-semibold text-muted-foreground uppercase">{g}</div>))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />)}
        {giorni.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const s = giorniSintesi[key];
          const ore = s?.ore || 0;
          const trasferta = s?.trasferta;
          const fascia = trasferta?.tipo_trasferta;
          const cfg = fascia ? TRASFERTA_CONFIG[fascia] : null;
          const haDati = ore > 0 || !!trasferta;
          const hasNote = !!s?.hasNote;
          const oggi = isToday(d);
          return (
            <button key={key} type="button" disabled={!haDati} onClick={() => haDati && onGiornoClick(key)}
              className={`relative aspect-square rounded-lg border p-1 flex flex-col items-center justify-start text-center transition-colors ${haDati ? "border-border bg-card hover:border-primary hover:bg-primary/5 cursor-pointer" : "border-transparent"} ${oggi ? "ring-1 ring-primary/40" : ""}`}>
              {hasNote && <AlertTriangle className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-amber-500" />}
              <span className={`text-xs ${oggi ? "font-bold text-primary" : "text-muted-foreground"}`}>{format(d, "d")}</span>
              {ore > 0 && <span className="text-[10px] font-semibold text-primary leading-tight mt-0.5">{fmtOre(ore)}</span>}
              {cfg && <Badge variant="outline" className={`text-[8px] px-1 py-0 mt-0.5 leading-none ${cfg.color}`}>{cfg.label} {trasferta.km_totali != null ? `${trasferta.km_totali}km` : ""}</Badge>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

## src/components/orelavoratori/GiornoDetailDialog.jsx

Copia integrale da `src/components/orelavoratori/GiornoDetailDialog.jsx` (~180 righe). Dialog di dettaglio giornata: totali, cantieri, spostamenti, trasferta (fasce andata/ritorno/combined), note/anomalie. Usa `TRASFERTA_CONFIG`, `fmtOre`, `formatDataBreve`.

## src/components/cronoprogramma/CronoItem.jsx

```jsx
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowDownUp } from "lucide-react";

const STATO_STYLE = { da_iniziare: "bg-slate-100 text-slate-700", in_corso: "bg-blue-100 text-blue-700", completato: "bg-emerald-100 text-emerald-700" };
const STATO_LABEL = { da_iniziare: "Da iniziare", in_corso: "In corso", completato: "Completato" };

export default function CronoItem({ item, onEdit, onDelete }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{item.titolo}</h3>
            <Badge className={STATO_STYLE[item.stato]} variant="secondary">{STATO_LABEL[item.stato]}</Badge>
            {item.origine === "workflow" && <Badge variant="outline" className="gap-1 text-xs"><ArrowDownUp className="w-3 h-3" /> da Workflow</Badge>}
          </div>
          {item.descrizione && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.descrizione}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {item.data_inizio && <span>📅 {item.data_inizio}</span>}
            {item.data_fine && <span>→ {item.data_fine}</span>}
            {item.progresso > 0 && <span>📊 {item.progresso}%</span>}
          </div>
          {item.progresso > 0 && (<div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${item.progresso}%` }} /></div>)}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      </div>
    </Card>
  );
}
```

## src/components/cronoprogramma/CronoFormDialog.jsx

Copia integrale da `src/components/cronoprogramma/CronoFormDialog.jsx` (~99 righe). Form titolo, descrizione, data inizio/fine, stato, progresso, ordine.

## src/components/permessi/PermessiPage.jsx

Copia integrale da `src/components/permessi/PermessiPage.jsx` (~136 righe). Matrice switch ruolo×sezione, salva su entità `PermessoSezione`. Admin sempre attivo.

## src/components/wizard/NewCantiereModal.jsx

```jsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function NewCantiereModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ nome: "", indirizzo: "", cliente: "" });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    if (!form.nome) return;
    setLoading(true);
    const created = await base44.entities.Cantiere.create({ ...form, attivo: true });
    setLoading(false);
    setForm({ nome: "", indirizzo: "", cliente: "" });
    onCreated(created);
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuovo Cantiere</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome cantiere *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es. Cantiere Via Roma" /></div>
          <div><Label>Indirizzo</Label><Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} placeholder="Es. Via Roma 15, Milano" /></div>
          <div><Label>Cliente</Label><Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Es. Rossi Costruzioni" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!form.nome || loading}>{loading ? "Creazione..." : "Crea Cantiere"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## src/components/usofurgone/UsoFurgoneFormDialog.jsx

Copia integrale da `src/components/usofurgone/UsoFurgoneFormDialog.jsx` (~168 righe). Form uso furgone: data, furgone, conducente, orario (tutta giornata/fascia), note. Salva via backend `registra_uso_furgone`.

## src/components/cantiere/CantiereMappa.jsx

Copia integrale da `src/components/cantiere/CantiereMappa.jsx` (~190 righe). Mappa Leaflet (`react-leaflet`) per geolocalizzare il cantiere con ricerca Nominatim + reverse geocoding. Richiede `leaflet` e `react-leaflet` installati.

## src/components/cantiere/AddressAutocomplete.jsx

Copia integrale da `src/components/cantiere/AddressAutocomplete.jsx` (~120 righe). Autocomplete indirizzi via Nominatim (debounce, tastiera).

---

## Riepilogo copia file

Per i componenti segnati "Copia integrale", apri il file corrispondente nel progetto CantierFlow e copia tutto il contenuto (i sorgenti completi sono troppo lunghi per stare in un unico doc; i percorsi esatti sono indicati sopra).

### Componenti shadcn UI richiesti (già presenti in ogni app Base44)
Button, Input, Label, Textarea, Dialog, Select, Card, Badge, Skeleton, Checkbox, Switch, Popover, Command, AlertDialog, use-toast.

### Pacchetti npm richiesti (già installati in app Base44 standard)
react-router-dom, @tanstack/react-query, date-fns, lucide-react, react-leaflet, leaflet, moment, sonner, clsx, tailwind-merge, class-variance-authority.