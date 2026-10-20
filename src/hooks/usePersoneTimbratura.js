import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Persone selezionabili quando l'amministratore inserisce una timbratura a nome
// di un collaboratore: gli utenti dell'app, con il nome del collaboratore
// collegato all'email quando esiste.
export default function usePersoneTimbratura(attivo = true) {
  const [persone, setPersone] = useState([]);

  useEffect(() => {
    if (!attivo) return;
    let vivo = true;
    Promise.all([base44.entities.User.list(), base44.entities.Collaboratore.list()])
      .then(([users, collaboratori]) => {
        if (!vivo) return;
        const nomePerEmail = new Map(
          (collaboratori || [])
            .filter((c) => c.user_email)
            .map((c) => [c.user_email.toLowerCase(), c.nome])
        );
        setPersone(
          (users || [])
            .map((u) => ({
              email: u.email,
              nome: nomePerEmail.get((u.email || "").toLowerCase()) || u.full_name || u.email,
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "it"))
        );
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [attivo]);

  return persone;
}