import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Route } from "lucide-react";
import { CAPANNONE, SOGLIE_TRASFERTA } from "@/lib/timbratureUtils";
import BottomNav from "@/components/BottomNav";

export default function DashboardTrasferte() {
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
      setForm({
        id: c?.id || null,
        sede_nome: c?.sede_nome || CAPANNONE.nome,
        sede_indirizzo: c?.sede_indirizzo || "",
        sede_latitudine: c?.sede_latitudine ?? CAPANNONE.lat,
        sede_longitudine: c?.sede_longitudine ?? CAPANNONE.lon,
        soglia_t0: c?.soglia_t0 ?? SOGLIE_TRASFERTA.T0,
        soglia_t1: c?.soglia_t1 ?? SOGLIE_TRASFERTA.T1,
        soglia_t2: c?.soglia_t2 ?? SOGLIE_TRASFERTA.T2,
      });
    }
  }, [isLoading, configs, form]);

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
      setMsg("Soglie trasferta salvate");
    } catch (e) {
      setMsg("Errore: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (isLoading || !form) {
    return (
      <div className="min-h-screen flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <header className="flex items-center gap-2 pt-2">
          <Route className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Trasferte</h1>
            <p className="text-sm text-muted-foreground">Soglie chilometriche delle fasce</p>
          </div>
        </header>

        <Card className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Imposta i chilometri che definiscono ogni fascia di trasferta. Le fasce si calcolano sulla
            media delle tratte di andata e ritorno (sede ↔ cantiere).
          </p>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Soglia T0 (fino a)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.soglia_t0}
                  onChange={e => setForm({ ...form, soglia_t0: parseFloat(e.target.value) })}
                  className="mt-1 h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Sotto questa km → T0</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Soglia T1 (fino a)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.soglia_t1}
                  onChange={e => setForm({ ...form, soglia_t1: parseFloat(e.target.value) })}
                  className="mt-1 h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Tra T0 e T1 → T1</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Soglia T2 (fino a)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.soglia_t2}
                  onChange={e => setForm({ ...form, soglia_t2: parseFloat(e.target.value) })}
                  className="mt-1 h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Tra T1 e T2 → T2, oltre → T3</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Badge className="bg-slate-200 text-slate-700">T0: 0–{form.soglia_t0} km</Badge>
            <Badge className="bg-blue-100 text-blue-700">T1: {form.soglia_t0}–{form.soglia_t1} km</Badge>
            <Badge className="bg-purple-100 text-purple-700">T2: {form.soglia_t1}–{form.soglia_t2} km</Badge>
            <Badge className="bg-rose-100 text-rose-700">T3: oltre {form.soglia_t2} km</Badge>
          </div>
        </Card>

        <Button onClick={salva} disabled={salvando} className="w-full gap-2">
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salva soglie
        </Button>
        {msg && <p className="text-center text-sm text-muted-foreground">{msg}</p>}
      </div>
      <BottomNav />
    </div>
  );
}