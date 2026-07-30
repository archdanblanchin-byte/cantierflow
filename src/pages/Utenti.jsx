import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, UserPlus, Trash2, Loader2, Mail, ShieldAlert } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { RUOLI, getRuoloLabel, getRuoloColor } from "@/lib/permissions";
import { useToast } from "@/components/ui/use-toast";

export default function Utenti() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("collaboratore");
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const isAdmin = currentUser?.role === "admin";

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-destructive/40 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">Accesso riservato agli amministratori</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> Torna alla Home
          </Button>
        </div>
      </div>
    );
  }

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast({ title: "Invito inviato", description: `${inviteEmail} invitato come ${getRuoloLabel(inviteRole)}` });
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (e) {
      toast({ title: "Errore invito", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await base44.entities.User.update(userId, { role: newRole });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Ruolo aggiornato", description: `Assegnato: ${getRuoloLabel(newRole)}` });
    } catch (e) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm("Eliminare questo utente dall'app?")) return;
    try {
      await base44.entities.User.delete(userId);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Utente eliminato" });
    } catch (e) {
      toast({ title: "Errore eliminazione", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Utenti</h1>
            <p className="text-xs text-muted-foreground">Gestione utenti e ruoli</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Invito */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 border-b pb-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Invita nuovo utente</span>
          </div>
          <div>
            <Input
              type="email"
              placeholder="email@esempio.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RUOLI.map(r => (
                <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="w-full gap-2">
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Invia invito
          </Button>
        </Card>

        {/* Lista utenti */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Utenti registrati {users.length > 0 && `(${users.length})`}
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <Card key={u.id} className="p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${getRuoloColor(u.role)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {(u.full_name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || "Senza nome"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleRoleChange(u.id, v)}
                      disabled={updatingId === u.id || u.id === currentUser?.id}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RUOLI.map(r => (
                          <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={u.id === currentUser?.id}
                      onClick={() => handleDelete(u.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
              {users.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">Nessun utente trovato</p>
              )}
            </div>
          )}
        </div>

        {/* Legenda ruoli */}
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fasce / Ruoli</p>
          {RUOLI.map(r => (
            <div key={r.key} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded ${r.color}`} />
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-[10px] text-muted-foreground">{r.descrizione}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}