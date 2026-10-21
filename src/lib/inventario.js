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

// L'anagrafe materiali è grande: si legge a pagine finché non è completa.
export async function caricaTuttiMateriali(filtro = {}) {
  const items = [];
  let cursor;
  for (let i = 0; i < 12; i++) {
    const page = await base44.entities.MaterialeBase.filter(filtro, {
      sort: "nome",
      limit: 200,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return items;
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

// Segnalazione di un prodotto non più presente in magazzino.
// La segnalazione non modifica la giacenza: la gestisce il magazziniere.
export async function segnalaMaterialeMancante({ materiale, testo, user }) {
  return base44.entities.SegnalazioneMateriale.create({
    materiale_id: materiale.id,
    materiale_nome: materiale.nome || "",
    posizione_scaffale: materiale.posizione_scaffale || "",
    user_email: user?.email || "",
    user_nome: user?.full_name || user?.email || "",
    testo: String(testo || "").trim() || "Prodotto non trovato in magazzino",
    stato: "aperta",
  });
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