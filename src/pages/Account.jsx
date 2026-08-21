import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { usePermessi } from "@/hooks/usePermessi";
import { getRuoloLabel, getRuoloColor } from "@/lib/permissions";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, LogIn, LogOut, Mail, User as UserIcon, Shield, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function Account() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const { ruolo } = usePermessi();
  const { toast } = useToast();
  const [eliminando, setEliminando] = useState(false);

  const handleLogin = () => navigateToLogin();
  const handleLogout = () => logout();

  const handleDeleteAccount = async () => {
    setEliminando(true);
    try {
      await base44.functions.invoke("elimina_account");
      toast({ title: "Account eliminato", description: "I tuoi dati sono stati rimossi." });
      logout("/");
    } catch (e) {
      toast({ title: "Errore eliminazione", description: e.message, variant: "destructive" });
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Account</h1>
            <p className="text-xs text-muted-foreground">Gestisci il tuo accesso</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Stato account */}
        <Card className="p-5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full ${getRuoloColor(user.role)} flex items-center justify-center text-white text-xl font-bold shrink-0`}>
                {(user.full_name || user.email || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{user.full_name || "Senza nome"}</p>
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {user.email}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {getRuoloLabel(ruolo) || user.role}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <UserIcon className="w-7 h-7" />
              </div>
              <div>
                <p className="font-semibold">Non sei collegato</p>
                <p className="text-sm text-muted-foreground">Accedi con la tua email per usare l'app</p>
              </div>
            </div>
          )}
        </Card>

        {/* Azioni accesso */}
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Accesso
          </p>
          {isAuthenticated ? (
            <Button onClick={handleLogout} variant="destructive" className="w-full gap-2">
              <LogOut className="w-4 h-4" />
              Esci dall'account
            </Button>
          ) : (
            <Button onClick={handleLogin} className="w-full gap-2">
              <LogIn className="w-4 h-4" />
              Accedi con la tua email
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Uscendo, tornerai alla schermata di accesso. Per rientrare ti basterà fare login
            con la stessa email con cui sei stato invitato.
          </p>
        </Card>

        {/* Zona pericolosa - eliminazione account */}
        {isAuthenticated && (
          <Card className="p-4 space-y-3 border-destructive/30">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Zona pericolosa
            </p>
            <p className="text-sm text-muted-foreground">
              L'eliminazione dell'account è definitiva: rimuove il tuo profilo e revoca
              l'accesso all'app. L'operazione non è reversibile.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2" disabled={eliminando}>
                  {eliminando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Elimina account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sei sicuro di voler eliminare l'account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa azione cancella definitivamente il tuo profilo da EveryDay 4.0.
                    Non potrai più accedere all'app con questa email e i dati associati verranno
                    rimossi. L'operazione non può essere annullata.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={eliminando}>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={eliminando}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {eliminando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Sì, elimina definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
}