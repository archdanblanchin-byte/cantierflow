import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getRuoloColor } from "@/lib/permissions";

// Permette all'amministratore di scegliere quali utenti possono gestire il
// magazzino (movimenti, soglie, scaffali, segnalazioni e avvisi di scorta)
// con gli stessi poteri dell'amministratore. Aggiorna permessi_extra sul
// record Utente, lo stesso campo letto da usePermessi e dalle regole RLS.
export default function GestoreMagazzinoCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const toggle = async (userObj) => {
    const attivo = userObj.permessi_extra === "inventario";
    setUpdatingId(userObj.id);
    try {
      await base44.entities.User.update(userObj.id, {
        permessi_extra: attivo ? "" : "inventario",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: attivo ? "Permesso magazzino tolto" : "Permesso magazzino attivo",
        description: attivo
          ? `${userObj.full_name || userObj.email} non gestisce più l'inventario`
          : `${userObj.full_name || userObj.email} gestisce l'inventario come l'amministratore`,
      });
    } catch (e) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const abilitati = users.filter((u) => u.permessi_extra === "inventario");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Package className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Gestore magazzino</p>
          <p className="text-[10px] text-muted-foreground">
            Scegli chi può modificare l'inventario con gli stessi poteri dell'amministratore
          </p>
        </div>
        {abilitati.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
            {abilitati.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {users.map((u) => {
            const attivo = u.permessi_extra === "inventario";
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent/50"
              >
                <div
                  className={`w-8 h-8 rounded-full ${getRuoloColor(u.role)} flex items-center justify-center text-white text-xs font-bold shrink-0`}
                >
                  {(u.full_name || u.email || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.full_name || "Senza nome"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <Button
                  variant={attivo ? "default" : "outline"}
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={updatingId === u.id}
                  onClick={() => toggle(u)}
                >
                  {updatingId === u.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Package className="w-3.5 h-3.5" />
                  )}
                  {attivo ? "Attivo" : "Abilita"}
                </Button>
              </div>
            );
          })}
          {users.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nessun utente trovato
            </p>
          )}
        </div>
      )}
    </Card>
  );
}