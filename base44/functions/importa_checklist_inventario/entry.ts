import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const RUOLI_GESTORI = ['admin', 'responsabile_tecnico'];

// Oltre ai ruoli, gestisce il magazzino anche chi ha il permesso extra "inventario"
// (assegnato dall'amministratore dalla pagina Utenti).
const puoGestireInventario = (user) =>
  RUOLI_GESTORI.includes(user?.role) || user?.permessi_extra === 'inventario';

const normalizzaNome = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Trasforma il quantitativo minimo scritto a mano in un numero.
// X, trattino, "cesto", "vuoto", "con Valter" non sono quantità: restituisce null.
function minimoNumerico(valore) {
  const s = String(valore ?? '').replace(',', '.').trim();
  if (!s || !/\d/.test(s)) return null;
  const somma = s.match(/^(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)$/);
  if (somma) return Number(somma[1]) + Number(somma[2]);
  const prodotto = s.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i);
  if (prodotto) return Number(prodotto[1]) * Number(prodotto[2]);
  const primo = s.match(/\d+(?:\.\d+)?/);
  return primo ? Number(primo[0]) : null;
}

// Porta la riga letta dalla check list nel formato dell'inventario,
// conservando nelle note i valori che non sono quantità reali.
function normalizzaRiga(riga) {
  const minimo = minimoNumerico(riga.minimo);
  const note = [];
  const grezzo = String(riga.minimo ?? '').trim();
  if (minimo === null && grezzo) note.push(`Minimo check list: ${grezzo}`);
  let unita = String(riga.unita_misura ?? '').trim();
  if (/^\d+$/.test(unita)) {
    note.push(`Unità check list: ${unita}`);
    unita = '';
  }
  return {
    nome: String(riga.nome ?? '').trim(),
    posizione_scaffale: String(riga.posizione_scaffale ?? riga.sezione ?? '').trim(),
    fornitore: String(riga.fornitore ?? '').trim(),
    unita_misura: unita,
    minimo,
    note_checklist: note.join(' · '),
  };
}

async function caricaTutti(sr) {
  const items = [];
  let cursor;
  for (let i = 0; i < 12; i++) {
    const page = await sr.entities.MaterialeBase.filter({}, {
      sort: 'nome',
      limit: 200,
      ...(cursor ? { cursor } : {}),
    });
    items.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return items;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!puoGestireInventario(user)) {
      return Response.json({ error: 'Solo il magazziniere e gli amministratori possono importare la check list' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.azione !== 'importa') return Response.json({ error: 'Azione non valida' }, { status: 400 });

    const righe = (Array.isArray(body?.righe) ? body.righe : []).slice(0, 1000);
    if (righe.length === 0) return Response.json({ error: 'Nessun prodotto da importare' }, { status: 400 });

    const sr = base44.asServiceRole;
    const esistenti = await caricaTutti(sr);
    const perNome = new Map();
    esistenti.forEach((m) => perNome.set(normalizzaNome(m.nome), m));

    const daCreare = [];
    const daAggiornare = [];
    for (const r of righe) {
      const riga = normalizzaRiga(r);
      if (!riga.nome) continue;
      const trovato = perNome.get(normalizzaNome(riga.nome));

      if (!trovato) {
        daCreare.push({
          nome: riga.nome,
          unita_misura: riga.unita_misura,
          posizione_scaffale: riga.posizione_scaffale,
          fornitore: riga.fornitore,
          note_checklist: riga.note_checklist,
          gestito_magazzino: true,
          giacenza: riga.minimo ?? 0,
          soglia_minima: riga.minimo ?? 0,
        });
        continue;
      }

      // Prodotti già presenti: la giacenza non si tocca, si completano solo i dati mancanti
      const patch = {};
      if (!trovato.gestito_magazzino) patch.gestito_magazzino = true;
      if (!trovato.posizione_scaffale && riga.posizione_scaffale) patch.posizione_scaffale = riga.posizione_scaffale;
      if (!trovato.fornitore && riga.fornitore) patch.fornitore = riga.fornitore;
      if (!trovato.unita_misura && riga.unita_misura) patch.unita_misura = riga.unita_misura;
      if (!trovato.note_checklist && riga.note_checklist) patch.note_checklist = riga.note_checklist;
      if (!Number(trovato.soglia_minima) && riga.minimo !== null) patch.soglia_minima = riga.minimo;
      if (!Number(trovato.giacenza) && riga.minimo !== null) patch.giacenza = riga.minimo;
      if (Object.keys(patch).length) daAggiornare.push({ id: trovato.id, ...patch });
    }

    if (daCreare.length) await sr.entities.MaterialeBase.bulkCreate(daCreare);
    if (daAggiornare.length) await sr.entities.MaterialeBase.bulkUpdate(daAggiornare);

    return Response.json({ creati: daCreare.length, aggiornati: daAggiornare.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}