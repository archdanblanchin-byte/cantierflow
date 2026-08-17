import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { usePermessi } from "@/hooks/usePermessi";
import { getRuoloLabel, getRuoloColor } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, LogIn, LogOut, Mail, User as UserIcon, Shield } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function Account() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, navigateToLogin } = useAuth();
  const { ruolo } = usePermessi();

  const handleLogin = () => navigateToLogin();
  const handleLogout = () => logout();

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
      </div>

      <BottomNav />
    </div>
  );
}