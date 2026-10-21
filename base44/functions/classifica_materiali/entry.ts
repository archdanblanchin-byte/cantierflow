import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const RUOLI_GESTORI = ['admin', 'responsabile_tecnico'];

// Categorie suggerite all'AI: sono le stesse proposte nell'interfaccia.
const CATEGORIE = [
  'Pitture e vernici',
  'Malte e intonaci',
  'Rasanti e stucchi',
  'Prodotti di protezione',
  'Prodotti di pulizia',
  'Rulli e pennelli',
  'Attrezzi e utensili',
  'Abbigliamento e DPI',
  'Ferramenta e minuteria',
  'Nastri e adesivi',
  'Silicone e sigillanti',
  'Abrasivi e carteggiatura',
  'Impermeabilizzanti e guaine',
  'Solventi e diluenti',
  'Isolanti e pannelli',
  'Idraulica e impianti',
  'Materiale elettrico',
  'Antigraffiti',
  'Varie',
];

const SCHEMA = {
  type: 'object',
  properties: {
    prodotti: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          categoria: { type: 'string' },
        },
        required: ['nome', 'categoria'],
      },
    },
  },
  required: ['prodotti'],
};

const normalizzaNome = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

async function caricaTutti(sr) {
  const items = [];
  let cursor;
  for (let i = 0; i < 12; i++) {
    const page = await sr.entities.MaterialeBase.filter({ gestito_magazzino: true }, {
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

// Chiede all'AI una categoria per ogni nome ricevuto.
async function chiediCategorie(sr, nomi) {
  const prompt = `Sei il magazziniere di un'impresa edile italiana e devi ordinare la check list del magazzino.
Per OGNI prodotto della lista assegna UNA sola categoria merceologica, scegliendo quando possibile tra queste:
${CATEGORIE.join(', ')}.
Se nessuna di queste è adatta, proponi una categoria breve e chiara in italiano (es. "Rulli e pennelli").
Rispondi con tutti i prodotti ricevuti, nello stesso ordine e con lo stesso nome, senza aggiungerne altri.

Prodotti:
${nomi.map((n) => `- ${n}`).join('\n')}`;

  const risposta = await sr.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
  return Array.isArray(risposta?.prodotti) ? risposta.prodotti : [];
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!RUOLI_GESTORI.includes(user.role)) {
      return Response.json({ error: 'Solo il magazziniere e gli amministratori possono classificare i materiali' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const sr = base44.asServiceRole;

    // Suggerimento per un singolo prodotto (usato nella scheda materiale)
    if (body?.azione === 'suggerisci') {
      const nome = String(body?.nome || '').trim().slice(0, 120);
      if (!nome) return Response.json({ error: 'Nome del prodotto mancante' }, { status: 400 });
      const [prodotto] = await chiediCategorie(sr, [nome]);
      return Response.json({ categoria: String(prodotto?.categoria || '').trim() });
    }

    if (body?.azione !== 'classifica') return Response.json({ error: 'Azione non valida' }, { status: 400 });

    const limite = Math.min(Math.max(Number(body?.limite) || 120, 20), 200);
    const tutti = await caricaTutti(sr);
    const daFare = tutti.filter((m) => !String(m.categoria || '').trim()).slice(0, limite);
    if (!daFare.length) return Response.json({ classificati: 0, rimanenti: 0 });

    const blocchi = [];
    for (let i = 0; i < daFare.length; i += 40) blocchi.push(daFare.slice(i, i + 40));

    const perNome = new Map(daFare.map((m) => [normalizzaNome(m.nome), m]));
    const aggiornamenti = new Map();

    const risultati = await Promise.allSettled(blocchi.map((blocco) => chiediCategorie(sr, blocco.map((m) => m.nome))));
    risultati.forEach((r) => {
      if (r.status !== 'fulfilled') return;
      r.value.forEach((p) => {
        const materiale = perNome.get(normalizzaNome(p?.nome));
        const categoria = String(p?.categoria || '').trim().slice(0, 60);
        if (materiale && categoria && !aggiornamenti.has(materiale.id)) {
          aggiornamenti.set(materiale.id, { id: materiale.id, categoria });
        }
      });
    });

    const lista = [...aggiornamenti.values()];
    if (lista.length) await sr.entities.MaterialeBase.bulkUpdate(lista);

    return Response.json({
      classificati: lista.length,
      rimanenti: Math.max(0, tutti.filter((m) => !String(m.categoria || '').trim()).length - lista.length),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}