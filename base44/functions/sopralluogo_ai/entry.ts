import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Elaborazioni AI del modulo Sopralluogo: trascrizione + analisi di note vocali,
// elenco delle lavorazioni e rilevamento dei bordi di un foglio fotografato.
// L'AI usa solo quello che è presente nel testo o nell'immagine: nessun dettaglio inventato.

const SEZIONI = ['cliente', 'contesto_cantiere', 'sicurezza_accessi', 'stato_superfici', 'lavori', 'prodotti', 'organizzazione', 'accordi', 'documentazione'];

const SCHEMA_NOTA = {
  type: 'object',
  properties: Object.fromEntries(SEZIONI.map((s) => [s, { type: 'string' }])),
  required: SEZIONI,
};

const SCHEMA_LAVORAZIONI = {
  type: 'object',
  properties: {
    elenco: {
      type: 'array',
      items: {
        type: 'object',
        properties: { nome: { type: 'string' }, descrizione: { type: 'string' } },
        required: ['nome'],
      },
    },
  },
  required: ['elenco'],
};

const SCHEMA_BORDI = {
  type: 'object',
  properties: {
    trovato: { type: 'boolean' },
    x0: { type: 'number' },
    y0: { type: 'number' },
    x1: { type: 'number' },
    y1: { type: 'number' },
  },
  required: ['trovato'],
};

const testoDi = (r) => (typeof r === 'string' ? r : String(r?.text || r?.transcript || ''));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');
    const audioUri = String(body?.audio_uri || '').slice(0, 600);
    const imageUri = String(body?.image_uri || '').slice(0, 600);
    let trascrizione = String(body?.trascrizione || '').slice(0, 20000);
    const core = base44.asServiceRole.integrations.Core;

    if (!['nota', 'lavorazioni', 'bordi'].includes(action)) {
      return Response.json({ error: 'Azione non valida' }, { status: 400 });
    }

    if (action === 'bordi') {
      if (!imageUri) return Response.json({ error: 'Immagine mancante' }, { status: 400 });
      const { signed_url } = await core.CreateFileSignedUrl({ file_uri: imageUri, expires_in: 600 });
      const r = await core.InvokeLLM({
        prompt: `Nell'immagine c'è un foglio di carta o un documento fotografato. Individua il rettangolo che contiene il foglio intero e restituiscine i bordi come frazioni da 0 a 1 rispetto alla larghezza (x) e all'altezza (y) dell'immagine: x0,y0 angolo in alto a sinistra, x1,y1 angolo in basso a destra. Se non riesci a individuare chiaramente il foglio restituisci trovato=false.`,
        file_urls: [signed_url],
        response_json_schema: SCHEMA_BORDI,
      });
      return Response.json({ box: r?.trovato ? { x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 } : null });
    }

    if (!trascrizione) {
      if (!audioUri) return Response.json({ error: 'Audio mancante' }, { status: 400 });
      const { signed_url } = await core.CreateFileSignedUrl({ file_uri: audioUri, expires_in: 600 });
      trascrizione = testoDi(await core.TranscribeAudio({ audio_url: signed_url })).trim();
    }
    if (!trascrizione) return Response.json({ error: 'Registrazione vuota: nessun parlato riconosciuto' }, { status: 422 });

    if (action === 'nota') {
      const analisi = await core.InvokeLLM({
        prompt: `Sei l'assistente di un'impresa edile italiana. Dalla trascrizione di una nota vocale registrata durante un sopralluogo, organizza le informazioni nelle sezioni indicate.
Sezioni: cliente; contesto_cantiere; sicurezza_accessi (sicurezza e accessi in quota); stato_superfici; lavori; prodotti; organizzazione; accordi; documentazione.
Regole: usa solo ciò che è stato detto, non inventare nulla. Se una sezione non è citata restituisci una stringa vuota. Scrivi frasi brevi e concrete in italiano.

Trascrizione:
"""${trascrizione}"""`,
        response_json_schema: SCHEMA_NOTA,
      });
      return Response.json({ trascrizione, analisi: analisi || {} });
    }

    const r = await core.InvokeLLM({
      prompt: `Sei l'assistente di un'impresa edile italiana. Dalla trascrizione di una descrizione vocale delle lavorazioni da eseguire, crea un elenco ordinato nell'ordine di esecuzione in cantiere, includendo le fasi di preparazione (protezioni, pulizia, ripristini) e di finitura quando sono presenti nella descrizione.
Per ogni voce: "nome" breve; "descrizione" operativa (cosa fare e dove). Non inventare lavorazioni o dettagli non detti.

Trascrizione:
"""${trascrizione}"""`,
      response_json_schema: SCHEMA_LAVORAZIONI,
    });
    return Response.json({ trascrizione, elenco: Array.isArray(r?.elenco) ? r.elenco : [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}