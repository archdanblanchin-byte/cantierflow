# Componenti integri (parte 3)

Codice completo: CronoFormDialog, PermessiPage, UsoFurgoneFormDialog, CantiereMappa, AddressAutocomplete.

## src/components/cronoprogramma/CronoFormDialog.jsx

```jsx
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATI = [
  { value: "da_iniziare", label: "Da iniziare" },
  { value: "in_corso", label: "In corso" },
  { value: "completato", label: "Completato" },
];

export default function CronoFormDialog({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState({ titolo: "", descrizione: "", data_inizio: "", data_fine: "", stato: "da_iniziare", progresso: 0, ordine: 0 });

  useEffect(() => {
    if (open) {
      setForm({
        titolo: initial?.titolo || "", descrizione: initial?.descrizione || "",
        data_inizio: initial?.data_inizio || "", data_fine: initial?.data_fine || "",
        stato: initial?.stato || "da_iniziare", progresso: initial?.progresso ?? 0,
        ordine: initial?.ordine ?? 0,
      });
    }
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => { if (!form.titolo.trim()) return; onSubmit(form); };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initial ? "Modifica fase" : "Nuova fase"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Titolo</Label><Input value={form.titolo} onChange={(e) => set("titolo", e.target.value)} placeholder="Es. Demolizione pareti" /></div>
          <div className="space-y-1.5"><Label>Descrizione</Label><Textarea value={form.descrizione} onChange={(e) => set("descrizione", e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Data inizio</Label><Input type="date" value={form.data_inizio} onChange={(e) => set("data_inizio", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Data fine</Label><Input type="date" value={form.data_fine} onChange={(e) => set("data_fine", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Stato</Label>
              <Select value={form.stato} onValueChange={(v) => set("stato", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATI.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Progresso %</Label><Input type="number" min={0} max={100} value={form.progresso} onChange={(e) => set("progresso", Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Ordine</Label><Input type="number" value={form.ordine} onChange={(e) => set("ordine", Number(e.target.value))} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={submit}>{initial ? "Salva" : "Aggiungi"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## src/components/permessi/PermessiPage.jsx

```jsx
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Lock, Loader2 } from "lucide-react";
import { RUOLI, SEZIONI_APP, PERMESSI_DEFAULT } from "@/lib/permissions";
import { useToast } from "@/components/ui/use-toast";

export default function PermessiPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [permessi, setPermessi] = useState({});
  const [saving, setSaving] = useState(false);

  const { data: existing = [], isLoading } = useQuery({
    queryKey: ["permessi-sezione"],
    queryFn: () => base44.entities.PermessoSezione.list(),
  });

  useEffect(() => {
    if (!isLoading) {
      const map = {};
      RUOLI.forEach(r => {
        const rec = existing.find(p => p.ruolo === r.key);
        map[r.key] = rec ? { id: rec.id, sezioni: [...rec.sezioni_permesse] } : { id: null, sezioni: [...(PERMESSI_DEFAULT[r.key] || [])] };
      });
      setPermessi(map);
    }
  }, [isLoading, existing]);

  const toggle = (ruoloKey, sezioneKey) => {
    if (ruoloKey === "admin") return;
    setPermessi(prev => {
      const current = prev[ruoloKey];
      const has = current.sezioni.includes(sezioneKey);
      return { ...prev, [ruoloKey]: { ...current, sezioni: has ? current.sezioni.filter(s => s !== sezioneKey) : [...current.sezioni, sezioneKey] } };
    });
  };

  const salva = async () => {
    setSaving(true);
    try {
      for (const ruoloKey of Object.keys(permessi)) {
        if (ruoloKey === "admin") continue;
        const { id, sezioni } = permessi[ruoloKey];
        if (id) { await base44.entities.PermessoSezione.update(id, { sezioni_permesse: sezioni }); }
        else { await base44.entities.PermessoSezione.create({ ruolo: ruoloKey, sezioni_permesse: sezioni }); }
      }
      queryClient.invalidateQueries({ queryKey: ["permessi-sezione"] });
      toast({ title: "Permessi salvati", description: "Le modifiche sono attive per tutti gli utenti" });
    } catch (e) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || Object.keys(permessi).length === 0) {
    return (<div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Attiva o disattiva le sezioni visibili per ogni fascia. L'Amministratore ha sempre accesso completo.</p>
      {RUOLI.map(r => (
        <Card key={r.key} className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${r.color} flex items-center justify-center`}>
                {r.key === "admin" ? <Lock className="w-4 h-4 text-white" /> : <span className="text-white text-xs font-bold">{r.label[0]}</span>}
              </div>
              <div>
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-[10px] text-muted-foreground">{r.descrizione}</p>
              </div>
            </div>
            <Badge variant="secondary">{r.key === "admin" ? "Tutte" : `${permessi[r.key]?.sezioni.length || 0} sezioni`}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {SEZIONI_APP.map(s => {
              const checked = r.key === "admin" ? true : (permessi[r.key]?.sezioni.includes(s.key) || false);
              const disabled = r.key === "admin";
              return (
                <div key={s.key} className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${disabled ? "opacity-60" : "hover:bg-accent"}`}>
                  <div className="flex items-center gap-2"><s.icon className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{s.label}</span></div>
                  <Switch checked={checked} disabled={disabled} onCheckedChange={() => toggle(r.key, s.key)} />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <Button onClick={salva} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Salva permessi
      </Button>
    </div>
  );
}
```

## src/components/usofurgone/UsoFurgoneFormDialog.jsx

```jsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Car } from "lucide-react";

function todayRome() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

export default function UsoFurgoneFormDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [data, setData] = useState(todayRome());
  const [furgoneId, setFurgoneId] = useState("");
  const [collaboratoreId, setCollaboratoreId] = useState("");
  const [tipoOrario, setTipoOrario] = useState("tutta_giornata");
  const [oraInizio, setOraInizio] = useState("");
  const [oraFine, setOraFine] = useState("");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: furgoni = [] } = useQuery({ queryKey: ["anagrafe", "Furgone"], queryFn: () => base44.entities.Furgone.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["anagrafe", "Collaboratore"], queryFn: () => base44.entities.Collaboratore.list() });

  const furgone = furgoni.find(f => f.id === furgoneId);
  const collaboratore = collaboratori.find(c => c.id === collaboratoreId);

  const reset = () => { setData(todayRome()); setFurgoneId(""); setCollaboratoreId(""); setTipoOrario("tutta_giornata"); setOraInizio(""); setOraFine(""); setNota(""); };

  const canSave = !!data && !!furgoneId && !!collaboratoreId && (tipoOrario === "tutta_giornata" || (!!oraInizio && !!oraFine));

  const handleSubmit = async () => {
    if (!canSave) return;
    setSalvando(true);
    try {
      await base44.functions.invoke("registra_uso_furgone", {
        data, furgone_id: furgoneId, furgone_nome: furgone?.nome || "",
        collaboratore_id: collaboratoreId, collaboratore_nome: collaboratore?.nome || "",
        tipo_orario: tipoOrario, ora_inizio: oraInizio, ora_fine: oraFine, nota,
      });
      toast({ title: "Uso furgone registrato", description: "L'amministrazione è stata notificata." });
      queryClient.invalidateQueries({ queryKey: ["uso-furgoni"] });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> Nuovo uso furgone</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} className="mt-1" /></div>
          <div>
            <Label>Furgone</Label>
            <Select value={furgoneId} onValueChange={setFurgoneId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona furgone" /></SelectTrigger>
              <SelectContent>{furgoni.map(f => (<SelectItem key={f.id} value={f.id}>{f.nome}{f.targa ? ` · ${f.targa}` : ""}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Conducente</Label>
            <Select value={collaboratoreId} onValueChange={setCollaboratoreId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona collaboratore" /></SelectTrigger>
              <SelectContent>{collaboratori.map(c => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Orario</Label>
            <div className="flex gap-2 mt-1">
              <Button type="button" variant={tipoOrario === "tutta_giornata" ? "default" : "outline"} className="flex-1" onClick={() => setTipoOrario("tutta_giornata")}>Tutta la giornata</Button>
              <Button type="button" variant={tipoOrario === "fascia" ? "default" : "outline"} className="flex-1" onClick={() => setTipoOrario("fascia")}>Fascia oraria</Button>
            </div>
          </div>
          {tipoOrario === "fascia" && (
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Dalle</Label><Input type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)} className="mt-1" /></div>
              <div><Label>Alle</Label><Input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)} className="mt-1" /></div>
            </div>
          )}
          <div>
            <Label>Note / problemi (spie, accessi, anomalie)</Label>
            <Textarea value={nota} onChange={e => setNota(e.target.value)} rows={3} className="mt-1" placeholder="Descrivi eventuali problemi riscontrati sul furgone..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!canSave || salvando}>{salvando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## src/components/cantiere/CantiereMappa.jsx

```jsx
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Loader2, Navigation, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const markerIcon = L.divIcon({
  className: "cantiere-marker",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);transform:rotate(-45deg)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const DEFAULT_CENTER = [45.8533, 12.9997]; // Rivignano Teor

function geocodeAddress(query) {
  return fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, { headers: { "Accept-Language": "it" } })
    .then((r) => r.json())
    .then((res) => (res && res[0] ? { lat: parseFloat(res[0].lat), lon: parseFloat(res[0].lon), display: res[0].display_name } : null));
}

function reverseGeocode(lat, lon) {
  return fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lon}`, { headers: { "Accept-Language": "it" } })
    .then((r) => r.json())
    .then((res) => {
      if (!res) return null;
      const a = res.address || {};
      const via = [a.road, a.pedestrian, a.path, a.square, a.place].find(Boolean) || "";
      const numero = a.house_number || "";
      const citta = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || "";
      const indirizzo = [via, numero].filter(Boolean).join(" ").trim();
      return { display: res.display_name, indirizzo, citta };
    })
    .catch(() => null);
}

function MapClicker({ onClick }) {
  useMapEvents({ click(e) { onClick(e.latlng); } });
  return null;
}

function MapFlyer({ lat, lon }) {
  const map = useMap();
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 200); return () => clearTimeout(t); }, [map]);
  useEffect(() => { if (lat != null && lon != null) map.flyTo([lat, lon], Math.max(map.getZoom(), 15), { duration: 0.5 }); }, [lat, lon]);
  return null;
}

export default function CantiereMappa({ latitudine, longitudine, indirizzo, citta, onPick, onReverseAddress }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(latitudine != null && longitudine != null ? { lat: latitudine, lon: longitudine } : null);
  const [reverseLabel, setReverseLabel] = useState("");
  const [reverseInfo, setReverseInfo] = useState(null);

  useEffect(() => {
    if (open) {
      setPicked(latitudine != null && longitudine != null ? { lat: latitudine, lon: longitudine } : null);
      setSearch([indirizzo, citta].filter(Boolean).join(", "));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    const q = [search, citta].filter(Boolean).join(", ") || search;
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await geocodeAddress(q);
      if (res) setPicked({ lat: res.lat, lon: res.lon });
      else alert("Indirizzo non trovato");
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = async (latlng) => {
    setPicked({ lat: latlng.lat, lon: latlng.lng });
    const info = await reverseGeocode(latlng.lat, latlng.lng);
    setReverseInfo(info);
    setReverseLabel(info?.display || "");
  };

  const handleConfirm = () => {
    if (picked) {
      onPick(picked.lat, picked.lon);
      if (reverseInfo && onReverseAddress) onReverseAddress(reverseInfo);
    }
    setOpen(false);
  };

  const center = picked ? [picked.lat, picked.lon] : DEFAULT_CENTER;

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <MapPin className="w-4 h-4 text-primary" /> Apri mappa
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Geolocalizza cantiere</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-3 space-y-3">
            <div className="flex gap-2">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())} placeholder="Cerca indirizzo (es. Via Roma 15, Milano)" className="flex-1" />
              <Button type="button" size="icon" variant="default" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Cerca l'indirizzo o clicca direttamente sulla mappa per posizionare il cantiere.</p>
          </div>
          <div className="h-[380px] w-full">
            <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full" style={{ zIndex: 0 }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClicker onClick={handleMapClick} />
              <MapFlyer lat={picked?.lat} lon={picked?.lon} />
              {picked && <Marker position={[picked.lat, picked.lon]} icon={markerIcon} />}
            </MapContainer>
          </div>
          <div className="px-4 py-3 bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              {picked ? (
                <span className="font-mono">
                  <span className="text-muted-foreground">Coordinate:</span> <strong>{picked.lat.toFixed(5)}, {picked.lon.toFixed(5)}</strong>
                  {reverseLabel && <span className="block text-muted-foreground mt-0.5 max-w-[420px] truncate">{reverseLabel}</span>}
                </span>
              ) : (<span className="text-muted-foreground">Nessun punto selezionato — cerca o clicca sulla mappa</span>)}
            </div>
            <DialogFooter className="sm:space-x-2 sm:space-y-0 gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
              <Button type="button" onClick={handleConfirm} disabled={!picked} className="gap-2"><Check className="w-4 h-4" /> Conferma posizione</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

## src/components/cantiere/AddressAutocomplete.jsx

```jsx
import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

function parseNominatim(res) {
  const a = res.address || {};
  const via = [a.road, a.pedestrian, a.path, a.cycleway, a.square, a.place].find(Boolean) || "";
  const numero = a.house_number || "";
  const citta = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || "";
  const provincia = a.county || a.state || "";
  const indirizzo = [via, numero].filter(Boolean).join(" ").trim();
  return { indirizzo, citta, provincia, lat: parseFloat(res.lat), lon: parseFloat(res.lon), display: res.display_name };
}

export default function AddressAutocomplete({ value, onSelect, placeholder = "Via, numero, città..." }) {
  const [text, setText] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { setText(value || ""); }, [value]);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const doSearch = (q) => {
    if (abortRef.current) abortRef.current.abort();
    if (q.trim().length < 3) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=it&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": "it" }, signal: ctrl.signal })
      .then((r) => r.json())
      .then((res) => { setResults(res || []); setOpen(true); setActive(-1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(() => doSearch(text), 350); return () => clearTimeout(t); }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (res) => {
    const p = parseNominatim(res);
    onSelect(p);
    setText(p.indirizzo ? `${p.indirizzo}, ${p.citta}` : p.display);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(results[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Input value={text} onChange={(e) => setText(e.target.value)} onFocus={() => results.length && setOpen(true)} onKeyDown={onKeyDown} placeholder={placeholder} className="pr-9" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </span>
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-72 overflow-auto">
          {results.map((res, i) => {
            const p = parseNominatim(res);
            return (
              <button key={res.place_id} type="button" onMouseEnter={() => setActive(i)} onClick={() => pick(res)} className={`w-full text-left px-3 py-2 text-sm flex gap-2 items-start border-b border-border/50 last:border-0 ${i === active ? "bg-accent" : "hover:bg-accent/50"}`}>
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block font-medium truncate">{p.indirizzo ? `${p.indirizzo}, ${p.citta}` : p.display.split(",")[0]}</span>
                  <span className="block text-xs text-muted-foreground truncate">{p.display}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

Tutti i componenti sono ora completi. Riepilogo dei file doc creati in `docs/`:
- `finestre-workflow.md` — le 13 pagine
- `dipendenze-entita.md` — 19 entità
- `dipendenze-lib-hook.md` — lib + hook + backend functions
- `dipendenze-componenti.md` — componenti (codice completo per i piccoli, riferimento percorso per i grandi)
- `dipendenze-componenti-extra-1.md` — AggiungiFotoModal, FotoEditor, FurgoniPage (completi)
- `dipendenze-componenti-extra-2.md` — LavorazioniPage, ProgrammazioneFormDialog, GiornoDetailDialog (completi)
- `dipendenze-componenti-extra-3.md` — CronoFormDialog, PermessiPage, UsoFurgoneFormDialog, CantiereMappa, AddressAutocomplete (completi)

Con questi + App.jsx (rotte) l'app Workflow parte funzionante.