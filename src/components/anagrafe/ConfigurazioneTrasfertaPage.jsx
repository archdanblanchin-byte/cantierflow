import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, MapPin, Loader2, Building2 } from "lucide-react";
import { CAPANNONE, SOGLIE_TRASFERTA, getPosizione } from "@/lib/timbratureUtils";

export default function ConfigurazioneTrasfertaPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["config-trasferta"],
    queryFn: () => base44.entities.ConfigurazioneTrasferta.list(),
  });

  useEffect(() => {
    if (!isLoading && !form) {
      const c = configs[0];
      if (c) {
        setForm({
          id: c.id,
          sede_nome: c.sede_nome || CAPANNONE.nome,
          sede_indirizzo: c.sede_indirizzo || "",
          sede_latitudine: c.sede_latitudine ?? CAPANNONE.lat,
          sede_longitudine: c.sede_longitudine ?? CAPANNONE.lon,
          soglia_t0: c.soglia_t0 ?? SOGLIE_TRASFERTA.T0,
          soglia_t1: c.soglia_t1 ?? SOGLIE_TRASFERTA.T1,
          soglia_t2: c.soglia_t2 ?? SOGLIE_TRASFERTA.T2,
          soglia_t3: c.soglia_t3 ?? SOGLIE_TRASFERTA.T3,
        });
      } else {
        setForm({
          sede_nome: CAPANNONE.nome,
          sede_indirizzo: "",
          sede_latitudine: CAPANNONE.lat,
          sede_longitudine: CAPANNONE.lon,
          soglia_t0: SOGLIE_TRASFERTA.T0,
          soglia_t1: SOGLIE_TRASFERTA.T1,
          soglia_t2: SOGLIE_TRASFERTA.T2,
          soglia_t3: SOGLIE_TRASFERTA.T3,
        });
      }
    }
  }, [isLoading, configs, form]);

  const rilevaPosizione = async () => {
    try {
      const pos = await getPosizione();
      setForm(prev => ({ ...prev, sede_latitudine: pos.lat, sede_longitudine: pos.lon }));
      setMsg("Posizione rilevata");
    } catch (e) {
      setMsg("Impossibile rilevare la posizione");
    }
  };

  const salva = async () => {
    setSalvando(true);
    setMsg(null);
    try {
      if (form.id) {
        await base44.entities.ConfigurazioneTrasferta.update(form.id, form);
      } else {
        await base44.entities.ConfigurazioneTrasferta.create(form);
      }
      queryClient.invalidateQueries({ queryKey: ["config-trasferta"] });
      setMsg("Configurazione salvata");
    } catch (e) {
      setMsg("Errore: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (isLoading || !form) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Sede Operativa (Capannone)</span>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Nome sede</Label>
          <Input value={form.sede_nome} onChange={e => setForm({ ...form, sede_nome: e.target.value })} className="mt-1 h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Indirizzo</Label>
          <Input value={form.sede_indirizzo} onChange={e => setForm({ ...form, sede_indirizzo: e.target.value })} placeholder="Rivignano Teor, UD, Italia" className="mt-1 h-9 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Latitudine</Label>
            <Input type="number" inputMode="decimal" step="any" value={form.sede_latitudine} onChange={e => setForm({ ...form, sede_latitudine: parseFloat(e.target.value) })} className="mt-1 h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Longitudine</Label>
            <Input type="number" inputMode="decimal" step="any" value={form.sede_longitudine} onChange={e => setForm({ ...form, sede_longitudine: parseFloat(e.target.value) })} className="mt-1 h-9 text-sm" />
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 w-full" onClick={rilevaPosizione}>
          <MapPin className="w-3.5 h-3.5" /> Rileva posizione attuale
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <span className="font-semibold text-sm">Fasce Trasferta (km)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Soglia T0 (fino a)</Label>
            <Input type="number" inputMode="decimal" value={form.soglia_t0} onChange={e => setForm({ ...form, soglia_t0: parseFloat(e.target.value) })} className="mt-1 h-9 text-sm" />
            <p className="text-[10px] text-muted-foreground mt-1">Sotto questa km → T0</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Soglia T1 (fino a)</Label>
            <Input type="number" inputMode="decimal" value={form.soglia_t1} onChange={e => setForm({ ...form, soglia_t1: parseFloat(e.target.value) })} className="mt-1 h-9 text-sm" />
            <p className="text-[10px] text-muted-foreground mt-1">Tra T0 e T1 → T1</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Soglia T2 (fino a)</Label>
            <Input type="number" inputMode="decimal" value={form.soglia_t2} onChange={e => setForm({ ...form, soglia_t2: parseFloat(e.target.value) })} className="mt-1 h-9 text-sm" />
            <p className="text-[10px] text-muted-foreground mt-1">Tra T1 e T2 → T2</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Soglia T3 (fino a)</Label>
            <Input type="number" inputMode="decimal" value={form.soglia_t3} onChange={e => setForm({ ...form, soglia_t3: parseFloat(e.target.value) })} className="mt-1 h-9 text-sm" />
            <p className="text-[10px] text-muted-foreground mt-1">Tra T2 e T3 → T3, oltre → T4</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge className="bg-slate-200 text-slate-700">T0: 0–{form.soglia_t0} km</Badge>
          <Badge className="bg-blue-100 text-blue-700">T1: {form.soglia_t0}–{form.soglia_t1} km</Badge>
          <Badge className="bg-purple-100 text-purple-700">T2: {form.soglia_t1}–{form.soglia_t2} km</Badge>
          <Badge className="bg-rose-100 text-rose-700">T3: {form.soglia_t2}–{form.soglia_t3} km</Badge>
          <Badge className="bg-amber-100 text-amber-700">T4: oltre {form.soglia_t3} km</Badge>
        </div>
      </Card>

      <Button onClick={salva} disabled={salvando} className="w-full gap-2">
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salva configurazione
      </Button>
      {msg && <p className="text-center text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}