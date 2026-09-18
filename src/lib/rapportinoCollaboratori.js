// Costruisce la lista collaboratori pre-caricata nel rapportino:
// tutti i collaboratori attivi dell'Anagrafe, con le ore squadra come default.
export function buildCollaboratoriPrefill(collaboratoriList = [], oreTotali = 8) {
  return (collaboratoriList || [])
    .filter((c) => c.attivo !== false)
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "it"))
    .map((c) => ({
      collaboratore_id: c.id,
      nome: c.nome,
      ore_lavorate: oreTotali,
      note_imprevisti: "",
    }));
}