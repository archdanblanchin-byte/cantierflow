import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Trascrive le etichette fotografate sui barattoli di pitture, vernici e rivestimenti.
// L'AI legge solo quello che c'è scritto: nessun dato viene inventato.

const TIPI = ['Pittura', 'Graffiato', 'Smalto', 'Altro'];

const SCHEMA = {
  type: 'object',
  properties: {
    testo_letto: { type: 'string' },
    nome: { type: 'string' },
    marca: { type: 'string' },
    fornitore: { type: 'string' },
    codice: { type: 'string' },
    colore_nome: { type: 'string' },
    tipo: { type: 'string' },
    quantita: { type: 'number' },
    unita_misura: { type: 'string' },
    data: { type: 'string' },
    cantiere_nome: { type: 'string' },
    note: {
      type: 'string',
      description:
        'Tutto ciò che è leggibile ma non entra negli altri campi, più le parti illeggibili o incerte. Vuoto solo se ogni dato è chiaro e ha trovato il suo campo.',
    },
  },
  required: ['testo_letto'],
};

const ISTRUZIONI = {
  fornitore: `È l'etichetta del produttore o del fornitore. Di solito riporta marca, nome del prodotto, codice, colore, volume in litri, data di produzione o numero di lotto.`,
  azienda: `È l'etichetta della nostra ditta, applicata da noi sul contenitore. Di solito riporta il nome del cantiere, la marca del prodotto, il nome del prodotto, il codice del prodotto e la data.`,
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fotoUrl = String(body?.foto_url || '').trim();
    const tipoEtichetta = String(body?.tipo_etichetta || '').trim();

    if (!fotoUrl || fotoUrl.length > 2000) {
      return Response.json({ error: 'Foto mancante' }, { status: 400 });
    }
    if (!ISTRUZIONI[tipoEtichetta]) {
      return Response.json({ error: 'Tipo di etichetta non valido' }, { status: 400 });
    }

    const prompt = `Sei l'assistente di un'impresa edile italiana. Ti viene mostrata la foto di un'etichetta applicata su un barattolo, un secchio o un bidone di pittura, vernice o rivestimento edile.

${ISTRUZIONI[tipoEtichetta]}

Regole:
- Trascrivi solo quello che leggi davvero. Non inventare, non correggere, non completare, non dedurre.
- Se un dato non c'è o non è leggibile, restituisci una stringa vuota.
- In "testo_letto" riporta la trascrizione completa e fedele di tutto il testo leggibile, riga per riga, senza commenti né aggiunte.
- "quantita": solo il numero del contenuto (es. 12). "unita_misura": solo L, kg, pz o ml.
- "data": solo se leggibile, in formato yyyy-MM-dd.
- "tipo": scegli tra ${TIPI.join(', ')}. Se non è deducibile lascia vuoto.
- "cantiere_nome": valorizzalo solo se sull'etichetta compare il nome di un cantiere.
- "note": nessuna informazione va persa. Scrivi qui tutto quello che leggi ma che non entra in un campo (numeri di lotto, scadenze, avvertenze, indicazioni d'uso, pesi, altre diciture) e segnala con chiarezza le parti illeggibili o incerte (es. "codice illeggibile", "data parzialmente coperta: 03/2_", "colore non leggibile"). Usa frasi brevi, una per riga. Lascia "note" vuoto solo se hai letto tutto senza dubbi e ogni dato ha trovato il suo campo.`;

    const risposta = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fotoUrl],
      response_json_schema: SCHEMA,
    });

    return Response.json({ dati: risposta && typeof risposta === 'object' ? risposta : {} });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}