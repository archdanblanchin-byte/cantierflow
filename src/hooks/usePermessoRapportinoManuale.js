import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format } from "date-fns";

// Determina se l'utente corrente può creare un rapportino MANUALE (senza timbro).
// - L'amministratore sempre.
// - Un utente non-admin solo se esiste un PermessoRapportino valido per oggi
//   concessogli dall'amministratore.
export function usePermessoRapportinoManuale() {
  const { user } = useAuth();
  const ruoloRaw = user?.role || "collaboratore";
  const ruolo = ruoloRaw === "user" ? "collaboratore" : ruoloRaw;
  const isAdmin = ruolo === "admin";
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: permessi = [], isLoading } = useQuery({
    queryKey: ["permesso-rapportino", user?.email],
    queryFn: () => base44.entities.PermessoRapportino.list(),
    enabled: !!user,
  });

  const permessoOggi = (permessi || []).find(
    (p) =>
      (p.user_email || "").toLowerCase() === (user?.email || "").toLowerCase() &&
      p.data === today
  );

  // Nessuno (nemmeno l'admin) crea un rapportino manuale di default:
  // serve un'autorizzazione valida per oggi concessa dall'amministratore.
  const canCreate = !!permessoOggi;

  return { canCreate, isAdmin, permessoOggi, isLoading };
}