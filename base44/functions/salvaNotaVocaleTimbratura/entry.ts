import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { secrets } from 'base44:runtime';
import { formattaElenco, minutiValidi, promptElenco, schemaElenco } from './elenco.ts';

const errore = (error, status) => Response.json({ error }, { status });
const testo = (valore, max) => typeof valore === 'string' ? valore.trim().slice(0, max) : '';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (!user) return errore('Accedi per registrare una nota.', 401);
    const { azione, audio, minutiGiornata } = (await req.json().catch(() => ({}))) || {};
    // UploadPrivateFile dei collaboratori usa app-users; mantieni anche il percorso legacy.
    if (azione !== 'testo' || typeof audio !== 'string' || audio.length > 400 || audio.includes('..') || !/^mp\/private\/[\w-]+\/(?:app-users|files)\/[\w-]+\/[\w.-]+\.(webm|ogg|oga|mp4|m4a|mp3|wav|mpeg|mpga|flac)$/i.test(audio)) {
      return errore('Registrazione non valida.', 400);
    }
    const [, , appId, , ownerId] = audio.split('/');
    if (appId !== secrets.get('BASE44_APP_ID') || ownerId !== user.id) return errore('Registrazione non accessibile.', 403);
    const minutiTimbrati = minutiValidi(minutiGiornata, 1) ? minutiGiornata : null;
    const core = base44.asServiceRole.integrations.Core;
    let parlato;
    try {
      parlato = await core.TranscribeAudio({ audio_url: audio });
    } catch (e) {
      console.error('Trascrizione nota giornata:', e.status || e.name);
      return errore('Non è stato possibile trascrivere l’audio. La nota precedente è rimasta invariata.', 502);
    }
    const trascrizione = testo(typeof parlato === 'string' ? parlato : parlato?.text || parlato?.transcript || parlato?.transcription, 16000);
    if (!trascrizione) return errore('Nessun parlato riconosciuto. La nota precedente è rimasta invariata.', 422);
    const risultato = await core.InvokeLLM({ response_json_schema: schemaElenco, prompt: promptElenco(trascrizione) }).catch(e => {
      console.error('Elenco nota giornata:', e.status || e.name);
      return null;
    });
    const elenco = formattaElenco(risultato, trascrizione, minutiTimbrati);
    return Response.json(elenco ?? { testo: trascrizione, avviso: 'Ho salvato la trascrizione originale perché non è stato possibile ricavarne un elenco fedele.' });
  } catch (e) {
    console.error('Nota vocale timbratura:', e.status || e.name);
    return errore('Non è stato possibile elaborare la nota vocale. Riprova.', 500);
  }
}