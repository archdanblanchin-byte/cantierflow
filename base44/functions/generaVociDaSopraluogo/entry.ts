import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { sopraluogo, metrature } = body;
    if (!sopraluogo) return Response.json({ error: 'Dati sopraluogo mancanti' }, { status: 400 });

    // ── Catalogo aziendale: uniche voci utilizzabili ──
    const tutteVoci = await base44.asServiceRole.entities.VoceLavorazione.filter({ attivo: true }, 'codice');
    const catalogo = tutteVoci.filter(v => !v.is_sotto_voce);

    if (catalogo.length === 0) {
      return Response.json({ voci: [], messaggio: 'Il listino lavorazioni è vuoto. Aggiungi le tue voci prima di generare il preventivo.' });
    }

    const elencoVoci = catalogo
      .map(v => `ID:${v.id} | ${v.codice || '-'} | ${v.categoria}: ${v.descrizione} (${v.unita_misura || 'mq'}, €${v.prezzo_unitario || 0}/u)`)
      .join('\n');

    const testoLavorazioni = (sopraluogo.audio_lavorazioni || '')
      .replace(/📋 TRASCRIZIONE[\s\S]*?\n\n/, '')
      .trim();
    const noteGenerali = sopraluogo.note_generali || '';
    const prodottiParticolari = sopraluogo.prodotti_particolari || '';

    const metratureText = Object.entries(metrature || {})
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${Number(v).toFixed(2)} mq`)
      .join(' | ');

    if (!testoLavorazioni && !noteGenerali) {
      return Response.json({ voci: [], messaggio: 'Nessuna lavorazione trovata nel sopralluogo' });
    }

    const prompt = `Sei un assistente esperto per preventivi di pittura e tinteggiatura edile.

LAVORAZIONI DAL SOPRALLUOGO:
${testoLavorazioni || '(nessuna trascrizione vocale)'}

NOTE GENERALI: ${noteGenerali || '-'}
PRODOTTI PARTICOLARI: ${prodottiParticolari || '-'}

METRATURE CALCOLATE DAL SOPRALLUOGO:
${metratureText || 'Non disponibili'}

LISTINO LAVORAZIONI AZIENDALE — UNICHE VOCI UTILIZZABILI:
${elencoVoci}

ISTRUZIONI:
1. Analizza le lavorazioni descritte nel sopralluogo.
2. Per ogni lavorazione scegli la voce del listino aziendale più adatta e restituisci il suo ID esatto nel campo "voce_id".
3. NON inventare voci, descrizioni, unità di misura o prezzi: usa esclusivamente le voci del listino aziendale.
4. Se una lavorazione non ha alcuna corrispondenza nel listino, NON restituirla.
5. Assegna la quantità usando le metrature: mq_pareti per tinteggiatura pareti, mq_soffitto per soffitti, mq_travi per travi, ecc.
6. Mantieni l'ordine logico (preparazione → primer → applicazione → finitura).
7. Includi SOLO le lavorazioni effettivamente menzionate o deducibili dal sopralluogo.`;

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          voci: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                voce_id: { type: 'string' },
                quantita: { type: 'number' }
              },
              required: ['voce_id', 'quantita']
            }
          }
        },
        required: ['voci']
      }
    });

    const uid = () => Math.random().toString(36).slice(2, 9);

    const vociPreventivo = (res.voci || [])
      .map(v => {
        const voce = catalogo.find(c => c.id === v.voce_id);
        if (!voce) return null; // nessuna corrispondenza nel listino: non inventare nulla
        return {
          id: uid(),
          tipo: 'lavorazione',
          codice: voce.codice || '',
          titolo: voce.descrizione || '',
          descrizione: voce.descrizione_estesa || '',
          unita_misura: voce.unita_misura || 'mq',
          quantita: parseFloat(v.quantita) || 1,
          prezzo_unitario: parseFloat(voce.prezzo_unitario) || 0,
          mostra_calcolo: true,
          voce_lavorazione_id: voce.id
        };
      })
      .filter(Boolean);

    return Response.json({ voci: vociPreventivo });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}