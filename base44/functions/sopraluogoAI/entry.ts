import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Integrazioni AI e audio del modulo Sopraluogo (le chiamate Core non partono dal browser).
// Azioni: trascrivi, analizza_nota, elenco_lavorazioni, bordi_foglio.

const PROMPT_ANALISI = (transcript) => `Sei un esperto di sopraluoghi per imprese edili pittoriche. Analizza questa trascrizione vocale e compila solo le sezioni per cui ci sono informazioni reali nel testo. Sii preciso, pratico e sintetico. Usa bullet points con •.

TRASCRIZIONE:
${transcript}

---

Compila SOLO le sezioni con dati reali (ometti completamente quelle senza info):

👤 CLIENTE
• Tipo cliente (preciso/economico/esigente), aspettative, problemi passati, gusti/colori desiderati, budget percepito

🏗️ CONTESTO CANTIERE
• Accesso, parcheggio/scarico, ascensore o scale, presenza mobili/persone

🦺 SICUREZZA E ACCESSI IN QUOTA
• Scala, trabattello, ponteggio, piattaforma aerea, permessi, spazi sicuri

🧱 STATO SUPERFICI
• Muffa, umidità, crepe, distacchi, intonaco rovinato, pitture instabili, infiltrazioni

🔧 LAVORI DA FARE
• Protezioni, rasature/stuccature, carteggiatura, fondo, pittura, smalti/decorativi, ripristini

🪣 PRODOTTI
• Tipo pittura, ciclo corretto, antimuffa/fissativo, colori e finiture, qualità richiesta

📅 ORGANIZZAZIONE
• MQ e quantità reali, numero operatori, tempistiche, altre imprese, tempi asciugatura

🤝 ACCORDI
• Incluso/escluso, numero mani, pulizia finale, extra possibili, pagamento, date concordate

📷 DOCUMENTAZIONE
• Foto, misure, note tecniche, conferme cliente

---

Rispondi SOLO con le sezioni presenti, nessun testo introduttivo.`;

const PROMPT_LAVORAZIONI = (transcript) => `Sei un esperto di cantieri edili e pittorici. Analizza questa registrazione vocale e ricava un elenco ordinato e preciso di TUTTE le lavorazioni da eseguire, dall'inizio alla fine.

TRASCRIZIONE:
${transcript}

---

Crea un elenco numerato di lavorazioni nell'ordine corretto di esecuzione. Per ogni lavorazione indica:
- Il numero progressivo
- Il nome della lavorazione (breve e chiaro)
- Una brevissima descrizione operativa (max 1 riga)

Esempio formato:
1. Protezione arredi — Coprire mobili e pavimenti con teli protettivi
2. Carteggiatura — Carteggiare le superfici esistenti per garantire l'adesione
3. Applicazione fondo — Stendere primer fissativo su tutta la superficie

Sii preciso e tecnico. Includi TUTTE le lavorazioni menzionate, anche quelle preparatorie e di finitura.

Rispondi SOLO con l'elenco numerato, nessun testo introduttivo.`;

const PROMPT_BORDI = `Sei un sistema di scansione documenti professionale.
In questa foto c'è un foglio di carta / documento cartaceo su una superficie.
Il tuo compito è trovare i 4 angoli del foglio e restituire le loro coordinate come PERCENTUALE rispetto alla larghezza e altezza dell'immagine (valori da 0.0 a 1.0).
Rispondi SOLO con questo JSON (nessun testo extra):
{
  "trovato": true,
  "topLeft":     { "x": 0.12, "y": 0.08 },
  "topRight":    { "x": 0.88, "y": 0.05 },
  "bottomLeft":  { "x": 0.10, "y": 0.92 },
  "bottomRight": { "x": 0.87, "y": 0.95 }
}
Se non riesci a trovare chiaramente un foglio, rispondi:
{ "trovato": false }
IMPORTANTE: le coordinate devono essere le posizioni degli ANGOLI DEL FOGLIO, non dell'intera immagine.`;

const PUNTO = { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } };

const SCHEMA_BORDI = {
  type: 'object',
  properties: {
    trovato: { type: 'boolean' },
    topLeft: PUNTO,
    topRight: PUNTO,
    bottomLeft: PUNTO,
    bottomRight: PUNTO,
  },
};

const testoDi = (r) => (typeof r === 'string' ? r : String(r?.text || r?.transcript || ''));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');
    const core = base44.asServiceRole.integrations.Core;

    if (action === 'trascrivi') {
      const audioUrl = String(body?.audio_url || '').slice(0, 1000);
      if (!audioUrl.startsWith('https://')) return Response.json({ error: 'Audio mancante' }, { status: 400 });
      const testo = testoDi(await core.TranscribeAudio({ audio_url: audioUrl })).trim();
      return Response.json({ testo });
    }

    if (action === 'analizza_nota' || action === 'elenco_lavorazioni') {
      const trascrizione = String(body?.trascrizione || '').trim().slice(0, 20000);
      if (!trascrizione) return Response.json({ error: 'Trascrizione mancante' }, { status: 400 });
      const prompt = action === 'analizza_nota' ? PROMPT_ANALISI(trascrizione) : PROMPT_LAVORAZIONI(trascrizione);
      const testo = await core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
      return Response.json({ testo: typeof testo === 'string' ? testo : JSON.stringify(testo) });
    }

    if (action === 'bordi_foglio') {
      const fileUrl = String(body?.file_url || '').slice(0, 1000);
      if (!fileUrl.startsWith('https://')) return Response.json({ error: 'Immagine mancante' }, { status: 400 });
      const r = await core.InvokeLLM({
        model: 'gemini_3_flash',
        prompt: PROMPT_BORDI,
        file_urls: [fileUrl],
        response_json_schema: SCHEMA_BORDI,
      });
      return Response.json(r || { trovato: false });
    }

    return Response.json({ error: 'Azione non valida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}