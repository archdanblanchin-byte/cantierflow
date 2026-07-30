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
        map[r.key] = rec
          ? { id: rec.id, sezioni: [...rec.sezioni_permesse] }
          : { id: null, sezioni: [...(PERMESSI_DEFAULT[r.key] || [])] };
      });
      setPermessi(map);
    }
  }, [isLoading, existing]);

  const toggle = (ruoloKey, sezioneKey) => {
    if (ruoloKey === "admin") return;
    setPermessi(prev => {
      const current = prev[ruoloKey];
      const has = current.sezioni.includes(sezioneKey);
      return {
        ...prev,
        [ruoloKey]: {
          ...current,
          sezioni: has
            ? current.sezioni.filter(s => s !== sezioneKey)
            : [...current.sezioni, sezioneKey],
        },
      };
    });
  };

  const salva = async () => {
    setSaving(true);
    try {
      for (const ruoloKey of Object.keys(permessi)) {
        if (ruoloKey === "admin") continue;
        const { id, sezioni } = permessi[ruoloKey];
        if (id) {
          await base44.entities.PermessoSezione.update(id, { sezioni_permesse: sezioni });
        } else {
          await base44.entities.PermessoSezione.create({ ruolo: ruoloKey, sezioni_permesse: sezioni });
        }
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
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Attiva o disattiva le sezioni visibili per ogni fascia. L'Amministratore ha sempre accesso completo.
      </p>
      {RUOLI.map(r => (
        <Card key={r.key} className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${r.color} flex items-center justify-center`}>
                {r.key === "admin"
                  ? <Lock className="w-4 h-4 text-white" />
                  : <span className="text-white text-xs font-bold">{r.label[0]}</span>}
              </div>
              <div>
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-[10px] text-muted-foreground">{r.descrizione}</p>
              </div>
            </div>
            <Badge variant="secondary">
              {r.key === "admin" ? "Tutte" : `${permessi[r.key]?.sezioni.length || 0} sezioni`}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {SEZIONI_APP.map(s => {
              const checked = r.key === "admin" ? true : (permessi[r.key]?.sezioni.includes(s.key) || false);
              const disabled = r.key === "admin";
              return (
                <div
                  key={s.key}
                  className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${disabled ? "opacity-60" : "hover:bg-accent"}`}
                >
                  <div className="flex items-center gap-2">
                    <s.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{s.label}</span>
                  </div>
                  <Switch
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => toggle(r.key, s.key)}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <Button onClick={salva} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salva permessi
      </Button>
    </div>
  );
}