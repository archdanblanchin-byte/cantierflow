import { secrets } from 'base44:runtime';

const READ_URL = "https://work-flow-abcb23af.base44.app/functions/cornoApiRead";
const WRITE_URL = "https://work-flow-abcb23af.base44.app/functions/cornoApiWrite";

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = secrets.get("CRONO_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "CRONO_API_KEY non configurata" }, { status: 500 });
    }

    const mode = body.mode || "read";

    if (mode === "read") {
      const r = await fetch(READ_URL, { headers: { "x-api-key": apiKey } });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!r.ok) return Response.json({ error: "read_failed", status: r.status, detail: data }, { status: 502 });
      return Response.json(data);
    }

    if (mode === "write") {
      const payload = {
        operazione: body.operazione,
        entita: body.entita,
        id: body.id,
        data: body.data,
        source: body.source || "EveryDay 4.0",
      };
      const r = await fetch(WRITE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!r.ok) return Response.json({ error: "write_failed", status: r.status, detail: data }, { status: 502 });
      return Response.json(data);
    }

    return Response.json({ error: "mode non valido (read|write)" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}