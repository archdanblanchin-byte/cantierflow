import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { classificaSpostamentiGiornata } from "@/lib/rapportiniFromTimbrature";

// Recupera le timbrature della giornata per l'utente e classifica gli
// spostamenti secondo la regola delle 8 ore (lavorative se < 8h lavorate,
// trasferta se >= 8h). Usato da Timbratura, rapportino e dettaglio.
export function useClassificazioneSpostamento(userEmail, dateISO) {
  return useQuery({
    queryKey: ["classificazione-spostamento", userEmail, dateISO],
    queryFn: async () => {
      if (!userEmail || !dateISO) return null;
      const g = new Date(dateISO);
      if (isNaN(g.getTime())) return null;
      const inizio = new Date(g); inizio.setHours(0, 0, 0, 0);
      const fine = new Date(g); fine.setHours(23, 59, 59, 999);
      const timb = await base44.entities.Timbratura.filter({
        user_email: userEmail,
        data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
      });
      return classificaSpostamentiGiornata(timb);
    },
    enabled: !!userEmail && !!dateISO,
  });
}