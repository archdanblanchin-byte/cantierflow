import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { PERMESSI_DEFAULT, SEZIONI_APP } from "@/lib/permissions";

export function usePermessi() {
  const { user } = useAuth();
  // La piattaforma assegna il ruolo base "user" agli inviti; l'app lo mappa su "collaboratore"
  const ruoloRaw = user?.role || "collaboratore";
  const ruolo = ruoloRaw === "user" ? "collaboratore" : ruoloRaw;
  const isAdmin = ruolo === "admin";
  const isGestore = isAdmin || ruolo === "responsabile_tecnico";
  // Permesso extra assegnato dall'amministratore dalla pagina Utenti: chi lo ha
  // gestisce l'inventario con gli stessi poteri dell'amministratore.
  // me() non espone sempre i campi personalizzati del record Utente, quindi lo
  // recupiamo dal record completo come fallback quando manca.
  const serveFallback = !!user?.email && !isAdmin && user?.permessi_extra === undefined;
  const { data: mioRecord } = useQuery({
    queryKey: ["mio-record", user?.email],
    queryFn: async () => {
      try {
        const res = await base44.entities.User.filter({ email: user.email }, "-created_date", 1, 0);
        return Array.isArray(res) ? res[0] : null;
      } catch {
        return null;
      }
    },
    enabled: serveFallback,
  });
  const permessoExtra = mioRecord?.permessi_extra ?? user?.permessi_extra;
  const gestoreInventario = isAdmin || permessoExtra === "inventario";

  const { data: permessiRaw = [], isLoading } = useQuery({
    queryKey: ["permessi-sezione"],
    queryFn: () => base44.entities.PermessoSezione.list(),
    enabled: !!user,
  });

  let sezioniPermesse;
  if (isAdmin) {
    sezioniPermesse = SEZIONI_APP.map(s => s.key);
  } else {
    const configRecord = permessiRaw.find(p => p.ruolo === ruolo);
    sezioniPermesse = configRecord?.sezioni_permesse || PERMESSI_DEFAULT[ruolo] || [];
  }

  const puoVedere = (key) => {
    if (isAdmin) return true;
    if (SEZIONI_APP.find(s => s.key === key)?.adminOnly) return false;
    return sezioniPermesse.includes(key);
  };

  return { ruolo, isAdmin, isGestore, gestoreInventario, sezioniPermesse, puoVedere, isLoading };
}