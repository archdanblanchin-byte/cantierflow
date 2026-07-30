import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PermessiPage from "@/components/permessi/PermessiPage";

export default function Permessi() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Permessi</h1>
            <p className="text-xs text-muted-foreground">Sezioni visibili per ogni fascia</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PermessiPage />
      </div>
      <BottomNav />
    </div>
  );
}