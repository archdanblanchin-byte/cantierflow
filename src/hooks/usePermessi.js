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

  return { ruolo, isAdmin, sezioniPermesse, puoVedere, isLoading };
}