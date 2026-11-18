export const ETICHETTE_NOTA = {
  cliente: "Cliente",
  contesto_cantiere: "Contesto del cantiere",
  sicurezza_accessi: "Sicurezza e accessi in quota",
  stato_superfici: "Stato delle superfici",
  lavori: "Lavori",
  prodotti: "Prodotti",
  organizzazione: "Organizzazione",
  accordi: "Accordi",
  documentazione: "Documentazione",
};

// Mostra solo le sezioni della nota vocale che contengono informazioni.
export default function SezioniNota({ analisi }) {
  const voci = Object.entries(ETICHETTE_NOTA).filter(([k]) => String(analisi?.[k] || "").trim());
  if (!voci.length) return <p className="text-xs text-muted-foreground">Nessuna informazione riconosciuta.</p>;
  return (
    <div className="space-y-2">
      {voci.map(([k, l]) => (
        <div key={k}>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{l}</p>
          <p className="text-sm whitespace-pre-wrap">{analisi[k]}</p>
        </div>
      ))}
    </div>
  );
}