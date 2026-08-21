// Costruisce la lista delle email dei partecipanti a un rapportino
// (autore + collaboratori risolti dall'anagrafe Collaboratore).
// Usata per popolare `partecipanti_email` su cui si basano le regole RLS di visibilità.
export function computePartecipantiEmail(formData, collaboratoriList, userEmail) {
  const emails = new Set();
  const author = (userEmail || formData?.user_email || "").trim();
  if (author) emails.add(author);
  (formData?.collaboratori || []).forEach((c) => {
    if (!c || !c.collaboratore_id) return;
    const collab = (collaboratoriList || []).find((x) => x.id === c.collaboratore_id);
    const email = (collab?.user_email || "").trim();
    if (email) emails.add(email);
  });
  return Array.from(emails);
}