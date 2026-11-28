import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const standard = [['ingresso','07:00'],['pausa_inizio','12:30'],['pausa_fine','13:30'],['uscita','16:30']];
const roma = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'});
const oraRoma = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const giorno = value => roma.format(new Date(value));
const istante = (day, hhmm) => {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || typeof hhmm !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
  const utc = Date.parse(`${day}T${hhmm}:00Z`);
  if (!Number.isFinite(utc)) return null;
  const reale = [2,1].map(offset => new Date(utc - offset * 3600000)).find(d => oraRoma.format(d) === hhmm && giorno(d) === day);
  return reale?.toISOString() || null;
};
const intervallo = day => {
  const domani = new Date(Date.parse(`${day}T12:00:00Z`) + 86400000).toISOString().slice(0,10);
  return {inizio:istante(day,'00:00'), fine:new Date(Date.parse(istante(domani,'00:00'))-1).toISOString()};
};
const error = (message,status) => Response.json({error:message},{status});

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(e => e.status === 401 ? null : Promise.reject(e));
    if (user?.role !== 'admin') return error('Comando riservato agli amministratori.', 403);
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Richiesta non valida.', 400);
    const {ids, timbri} = body;
    const ent = base44.entities.Timbratura;
    const oggi = giorno(Date.now());
    let prima = [];
    let payload;
    if (ids === undefined && timbri === undefined) {
      const uffici = await base44.entities.Cantiere.filter({nome:{$regex:'^[Uu][Ff][Ff][Ii][Cc][Ii][Oo]$'}}, '-created_date', 10);
      const ufficio = uffici.find(c => c.stato ? c.stato === 'aperto' : c.attivo !== false);
      if (!ufficio) return error('Non ho trovato un cantiere aperto chiamato Ufficio.', 404);
      payload = standard.map(([tipo_evento, ora]) => ({tipo_evento,data_ora:istante(oggi,ora),user_email:user.email,user_nome:user.full_name || user.email,cantiere_id:ufficio.id,cantiere_nome:ufficio.nome,confermato_capannone:true}));
    } else {
      if (!Array.isArray(ids) || ids.length !== 4 || new Set(ids).size !== 4 || ids.some(id => typeof id !== 'string' || !/^[\w-]{1,80}$/.test(id)) || !Array.isArray(timbri) || timbri.length !== 4) return error('Sequenza non valida.', 400);
      const [primo] = timbri;
      const orari = timbri.map(t => istante(t?.giorno_roma,t?.ora_roma));
      if (timbri.some((t,i) => !orari[i] || t.tipo_evento !== standard[i][0] || t.giorno_roma !== primo.giorno_roma || (i > 0 && orari[i] <= orari[i-1]))) return error('Mantieni ingresso, pausa, ripresa e uscita in ordine nella stessa giornata.', 400);
      if (typeof primo.user_email !== 'string' || primo.user_email.length > 254 || typeof primo.cantiere_id !== 'string' || !/^[\w-]{1,80}$/.test(primo.cantiere_id)) return error('Seleziona collaboratore e cantiere.', 400);
      const [originali, persone, cantiere] = await Promise.all([
        ent.filter({id:{$in:ids}}, 'data_ora', 4),
        base44.entities.User.filter({email:primo.user_email}, '-created_date', 1),
        base44.entities.Cantiere.get(primo.cantiere_id).catch(e => e.status === 404 ? null : Promise.reject(e)),
      ]);
      if (originali.length !== 4 || originali.some((t,i) => t.tipo_evento !== standard[i][0] || t.user_email !== originali[0].user_email || giorno(t.data_ora) !== giorno(originali[0].data_ora))) return error('La sequenza è cambiata: correggi i singoli timbri dallo storico.', 409);
      const persona = persone[0];
      if (!persona || !cantiere) return error('Collaboratore o cantiere non trovato.', 404);
      prima = originali;
      const inSede = primo.confermato_capannone === true;
      const luogo = !inSede && typeof primo.luogo_lavoro === 'string' ? primo.luogo_lavoro.trim().slice(0,160) : '';
      payload = timbri.map((t,i) => ({id:originali[i].id,tipo_evento:t.tipo_evento,data_ora:orari[i],user_email:persona.email,user_nome:persona.full_name || persona.email,cantiere_id:cantiere.id,cantiere_nome:cantiere.nome,confermato_capannone:inSede,lavoro_altro_luogo:!!luogo,luogo_lavoro:luogo || null,nota:typeof primo.nota === 'string' ? primo.nota.slice(0,2000) : null}));
    }
    const corrente = intervallo(giorno(payload[0].data_ora));
    const conflitto = await ent.filter({user_email:payload[0].user_email,data_ora:{$gte:corrente.inizio,$lte:corrente.fine},...(prima.length ? {id:{$nin:ids}} : {})}, 'data_ora', 1);
    if (conflitto.length) return error('Ci sono già timbrature per questa persona e giornata. Correggile dallo storico.', 409);
    let salvati;
    if (prima.length) {
      await ent.bulkUpdate(payload);
      salvati = payload;
    } else {
      salvati = await ent.bulkCreate(payload);
    }
    return Response.json({timbri:salvati.sort((a,b) => a.data_ora.localeCompare(b.data_ora)), giornate:[corrente,...(prima.length ? [intervallo(giorno(prima[0].data_ora))] : [])]});
  } catch (e) {
    console.error('Sequenza ufficio:', e.status || e.name);
    return error('Non è stato possibile salvare la sequenza.', 500);
  }
}