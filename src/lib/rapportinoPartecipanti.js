// Costruisce la lista delle email dei partecipanti a un rapportino
// (autore + collaboratori risolti dall'anagrafe Collaboratore).
// Usata per popolare `partecipanti_email` su cui si basano le regole RLS di visibilità.
export function computePartecipantiEmail(formData, collaboratoriList, userEmail) {
  const emails = new Set();
  const author = (userEmail || formData?.user_email || "").trim();
  if (author) emails.add(author);
  (formData?.collaboratori || []).forEach((c) => {
    if (!c) return;
    // Le righe della squadra arrivano dalle timbrature e portano già l'email
    // dell'operatore; in alternativa si risolve dall'anagrafe Collaboratore.
    const collab = c.collaboratore_id ? (collaboratoriList || []).find((x) => x.id === c.collaboratore_id) : null;
    const email = (collab?.user_email || c.user_email || "").trim();
    if (email) emails.add(email);
  });
  return Array.from(emails);
}