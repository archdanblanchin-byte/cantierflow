import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, X, CalendarClock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

// Pannello riservato all'amministratore per concedere, per la giornata di oggi,
// il permesso di creare un rapportino manuale (senza timbro) a uno o più utenti.
export default function PermessiRapportinoAdmin({ users = [] }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [busyEmail, setBusyEmail] = useState(null);

  const { data: permessi = [] } = useQuery({
    queryKey: ["permessi-rapportino"],
    queryFn: () => base44.entities.PermessoRapportino.list(),
  });

  const permessiOggi = (permessi || []).filter((p) => p.data === today);
  const isAutorizzato = (email) =>
    permessiOggi.some(
      (p) => (p.user_email || "").toLowerCase() === (email || "").toLowerCase()
    );

  const autorizza = async (u) => {
    setBusyEmail(u.email);
    try {
      await base44.entities.PermessoRapportino.create({
        user_email: u.email,
        user_nome: u.full_name || u.email,
        data: today,
        granted_by_email: currentUser?.email || "",
      });
      queryClient.invalidateQueries({ queryKey: ["permessi-rapportino"] });
      queryClient.invalidateQueries({ queryKey: ["permesso-rapportino"] });
      toast({
        title: "Permesso concesso",
        description: `${u.full_name || u.email} può creare rapportini oggi`,
      });
    } catch (e) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setBusyEmail(null);
    }
  };

  const revoca = async (permessoId) => {
    if (!confirm("Revocare il permesso per oggi?")) return;
    try {
      await base44.entities.PermessoRapportino.delete(permessoId);
      queryClient.invalidateQueries({ queryKey: ["permessi-rapportino"] });
      queryClient.invalidateQueries({ queryKey: ["permesso-rapportino"] });
      toast({ title: "Permesso revocato" });
    } catch (e) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    }
  };

  const nonAdmin = users.filter((u) => u.role !== "admin");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Permessi rapportino manuale</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          oggi {format(new Date(), "dd MMM", { locale: it })}
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Di default i rapportini nascono dal timbro. Da qui puoi concedere a un
        utente, solo per oggi, la possibilità di creare un rapportino manuale
        senza timbro.
      </p>

      {permessiOggi.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">
            Autorizzati oggi
          </p>
          {permessiOggi.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2"
            >
              <CalendarClock className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {p.user_nome || p.user_email}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {p.user_email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => revoca(p.id)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase">
          Utenti
        </p>
        {nonAdmin.map((u) => {
          const auth = isAutorizzato(u.email);
          return (
            <div
              key={u.id}
              className="flex items-center gap-2 border rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {u.full_name || u.email}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {u.email}
                </p>
              </div>
              {auth ? (
                <Badge className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10">
                  Autorizzato
                </Badge>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={busyEmail === u.email}
                  onClick={() => autorizza(u)}
                >
                  {busyEmail === u.email ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3 h-3" />
                  )}
                  Autorizza oggi
                </Button>
              )}
            </div>
          );
        })}
        {nonAdmin.length === 0 && (
          <p className="text-[11px] text-muted-foreground py-2">
            Nessun utente non-admin.
          </p>
        )}
      </div>
    </Card>
  );
}