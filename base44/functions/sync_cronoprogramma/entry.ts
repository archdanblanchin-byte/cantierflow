import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

const FIELDS = ["sync_id", "titolo", "descrizione", "data_inizio", "data_fine", "stato", "progresso", "ordine", "sync_version"];

function pick(item) {
  const out = {};
  for (const f of FIELDS) {
    if (item[f] !== undefined) out[f] = item[f];
  }
  return out;
}

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const SYNC_SECRET = secrets.get("WORKFLOW_SYNC_SECRET");
    const SYNC_URL = secrets.get("WORKFLOW_SYNC_URL");
    const base44 = createClientFromRequest(req);

    // --- Webhook in entrata dall'app Workflow (push di item) ---
    // Payload: { secret, items: [...] }
    if (body.secret !== undefined && body.items !== undefined) {
      if (body.secret !== SYNC_SECRET) {
        return Response.json({ error: "Secret non valido" }, { status: 401 });
      }
      const remoteItems = body.items || [];
      const results = [];
      for (const ri of remoteItems) {
        if (!ri.sync_id) continue;
        const existing = await base44.asServiceRole.entities.Cronoprogramma.filter({ sync_id: ri.sync_id });
        const local = existing[0];
        if (!local) {
          await base44.asServiceRole.entities.Cronoprogramma.create({ ...pick(ri), origine: "workflow" });
          results.push({ sync_id: ri.sync_id, op: "created" });
        } else if ((ri.sync_version || 0) > (local.sync_version || 0)) {
          await base44.asServiceRole.entities.Cronoprogramma.update(local.id, pick(ri));
          results.push({ sync_id: ri.sync_id, op: "updated" });
        } else {
          results.push({ sync_id: ri.sync_id, op: "skipped" });
        }
      }
      return Response.json({ ok: true, results });
    }

    // --- Sync avviato dal frontend di questa app ---
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!SYNC_URL || !SYNC_SECRET) {
      return Response.json({ error: "Sync non configurato: imposta WORKFLOW_SYNC_URL e WORKFLOW_SYNC_SECRET nelle impostazioni dell'app" }, { status: 500 });
    }

    // 1. Pull: recupera gli item dall'app Workflow
    let remoteItems = [];
    try {
      const remoteResp = await fetch(SYNC_URL, { headers: { "x-sync-secret": SYNC_SECRET } });
      if (remoteResp.ok) {
        const data = await remoteResp.json();
        remoteItems = data.items || data || [];
      }
    } catch (e) {
      // remoto non raggiungibile: prosegui comunque con il push
    }

    // 2. Upsert locale degli item remoti
    for (const ri of remoteItems) {
      if (!ri.sync_id) continue;
      const existing = await base44.asServiceRole.entities.Cronoprogramma.filter({ sync_id: ri.sync_id });
      const local = existing[0];
      if (!local) {
        await base44.asServiceRole.entities.Cronoprogramma.create({ ...pick(ri), origine: "workflow" });
      } else if ((ri.sync_version || 0) > (local.sync_version || 0)) {
        await base44.asServiceRole.entities.Cronoprogramma.update(local.id, pick(ri));
      }
    }

    // 3. Push: invia all'app Workflow gli item locali più recenti
    const localItems = await base44.asServiceRole.entities.Cronoprogramma.list("ordine", 500);
    const remoteMap = {};
    for (const ri of remoteItems) remoteMap[ri.sync_id] = ri;
    const toPush = localItems
      .filter((li) => {
        const ri = remoteMap[li.sync_id];
        return !!li.sync_id && (!ri || (li.sync_version || 0) > (ri.sync_version || 0));
      })
      .map((li) => pick(li));

    let pushed = 0;
    if (toPush.length) {
      try {
        const pushResp = await fetch(SYNC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-sync-secret": SYNC_SECRET },
          body: JSON.stringify({ secret: SYNC_SECRET, items: toPush }),
        });
        if (pushResp.ok) pushed = toPush.length;
      } catch (e) {
        // push fallito: non bloccare
      }
    }

    const final = await base44.asServiceRole.entities.Cronoprogramma.list("ordine", 500);
    return Response.json({ ok: true, items: final, pushed, pulled: remoteItems.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}