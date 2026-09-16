import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import StoricoTimbrature from "./StoricoTimbrature";

// Vista "Tutte le timbrature" — calendario completo di tutti gli utenti.
// Accessibile solo ad admin e responsabile tecnico. Reindirizza gli altri
// utenti alla pagina Timbratura personale.
export default function TutteTimbrature() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    base44
      .auth
      .me()
      .then((u) => {
        setUser(u);
        setChecking(false);
        if (u && u.role !== "admin" && u.role !== "responsabile_tecnico") {
          navigate("/timbratura", { replace: true });
        }
      })
      .catch(() => setChecking(false));
  }, [navigate]);

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (user.role !== "admin" && user.role !== "responsabile_tecnico") return null;

  return <StoricoTimbrature mode="all" />;
}