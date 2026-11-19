import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

function formatAnalysis(data) {
  let output = '';
  if (data.luoghi?.length) {
    output += '📍 LUOGHI SPECIFICI\n';
    data.luoghi.forEach(l => output += `  • ${l}\n`);
    output += '\n';
  }
  if (data.date?.length) {
    output += '📅 DATE E TEMPISTICHE\n';
    data.date.forEach(d => output += `  • ${d}\n`);
    output += '\n';
  }
  if (data.misure?.length) {
    output += '📏 MISURE E DATI TECNICI\n';
    data.misure.forEach(m => output += `  • ${m}\n`);
    output += '\n';
  }
  if (data.problemi?.length) {
    output += '⚠️ PROBLEMI RILEVATI\n';
    data.problemi.forEach(p => output += `  • ${p}\n`);
    output += '\n';
  }
  if (data.azioni?.length) {
    output += '🎯 AZIONI RACCOMANDATE\n';
    data.azioni.forEach(a => output += `  • ${a}\n`);
    output += '\n';
  }
  if (data.note?.length) {
    output += '📝 NOTE AGGIUNTIVE\n';
    data.note.forEach(n => output += `  • ${n}\n`);
  }
  return output.trim();
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const transcript = String(body?.transcript || '').slice(0, 20000);

    if (!transcript) {
      return Response.json({ error: 'Nessuna trascrizione fornita' }, { status: 400 });
    }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_4',
      prompt: `Sei un esperto di sopraluoghi edilizi. Analizza questa trascrizione vocale ed estrai le informazioni strutturate.

TRASCRIZIONE:
${transcript}

Restituisci un'analisi dettagliata con le seguenti sezioni:

📍 LUOGHI SPECIFICI
Lista di ambienti/zone menzionati (cucina, bagno, camere, corridoi, ecc.)

📅 DATE E TEMPISTICHE
Eventuali date, deadline, o riferimenti temporali menzionati

📏 MISURE E DATI TECNICI
Lunghezze, larghezze, altezze, metrature, e specifiche tecniche

⚠️ PROBLEMI RILEVATI
Muffa, danni, infiltrazioni, intonaco rovinato, ecc.

🎯 AZIONI RACCOMANDATE
Liste di lavori da fare, materiali suggeriti, interventi necessari

📝 NOTE AGGIUNTIVE
Preferenze cliente, vincoli, o dettagli importanti

Sii conciso ma completo. Usa bullet points. Estrai solo informazioni effettivamente presenti nel testo.`,
      response_json_schema: {
        type: 'object',
        properties: {
          luoghi: { type: 'array', items: { type: 'string' }, description: 'Ambienti e zone specifiche' },
          date: { type: 'array', items: { type: 'string' }, description: 'Date e tempistiche' },
          misure: { type: 'array', items: { type: 'string' }, description: 'Dimensioni e dati tecnici' },
          problemi: { type: 'array', items: { type: 'string' }, description: 'Problemi e difetti rilevati' },
          azioni: { type: 'array', items: { type: 'string' }, description: 'Lavori e interventi raccomandati' },
          note: { type: 'array', items: { type: 'string' }, description: 'Note aggiuntive e dettagli' }
        }
      }
    });

    // Formatta il risultato in testo leggibile
    const formatted = formatAnalysis(result);

    return Response.json({ result: formatted, raw: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}