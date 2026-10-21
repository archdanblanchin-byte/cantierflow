import { base44 } from "@/api/base44Client";

// Una scorta è "sotto soglia" solo se la soglia è stata impostata (> 0).
export function sottoSoglia(materiale) {
  const soglia = Number(materiale?.soglia_minima || 0);
  return soglia > 0 && Number(materiale?.giacenza || 0) <= soglia;
}

export function labelTipo(tipo) {
  return (
    {
      carico: "Carico",
      scarico: "Scarico",
      rettifica: "Rettifica",
      scarico_rapportino: "Prelievo da rapportino",
    }[tipo] || tipo
  );
}

// Registra un movimento manuale di magazzino (carico, scarico o rettifica).
export async function registraMovimento({ materialeId, tipo, quantita, nota }) {
  const res = await base44.functions.invoke("aggiorna_inventario", {
    azione: "movimento",
    materiale_id: materialeId,
    tipo,
    quantita,
    nota,
  });
  return res.data;
}

// Allinea l'inventario ai materiali dichiarati sul rapportino.
// La funzione è idempotente: ripetere la chiamata non scarica due volte.
export async function sincronizzaScaricoRapportino(rapportino) {
  if (!rapportino?.id) return null;
  try {
    const res = await base44.functions.invoke("aggiorna_inventario", {
      azione: "scarico_rapportino",
      rapportino: {
        id: rapportino.id,
        cantiere_nome: rapportino.cantiere_nome || "",
        user_email: rapportino.user_email || "",
        materiali: rapportino.materiali || [],
      },
    });
    return res.data;
  } catch (err) {
    // Il salvataggio del rapportino non deve fallire per l'inventario
    console.error("Sincronizzazione inventario non riuscita", err);
    return null;
  }
}