import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";

function mimeFromName(name) {
  const ext = (name || "").toLowerCase().split(".").pop();
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", heic: "image/heic",
    bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff",
  };
  return map[ext] || "application/octet-stream";
}

function normalize(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non autenticato" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Solo admin" }, { status: 403 });

    const body = await req.json().catch(() => ({})) || {};
    const mode = body.mode || "list_folders";
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");
    const auth = { Authorization: `Bearer ${accessToken}` };

    // --- Elenca cartelle ---
    if (mode === "list_folders") {
      const q = "mimeType='application/vnd.google-apps.folder' and trashed=false";
      const url = `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=200&orderBy=name`;
      const r = await fetch(url, { headers: auth });
      if (!r.ok) return Response.json({ error: "drive_error", status: r.status, detail: await r.text() }, { status: 502 });
      const data = await r.json();
      return Response.json({ folders: data.files || [] });
    }

    // --- Preview / Import ---
    if (mode === "preview" || mode === "import") {
      const folderId = body.folder_id;
      if (!folderId) return Response.json({ error: "folder_id obbligatorio" }, { status: 400 });
      const doImport = mode === "import";
      const replace = body.replace === true;
      const limit = Math.min(Number(body.limit) || 50, 200);

      // Carica tutti i cantieri (inclusi chiusi) in service role
      const cantieri = await base44.asServiceRole.entities.Cantiere.list("-created_date", 1000);
      const byCodice = {};
      for (const c of cantieri) {
        if (c.codice) byCodice[normalize(c.codice)] = c;
      }

      // Elenca immagini nella cartella
      const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`;
      let url = `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,thumbnailLink),nextPageToken&pageSize=500`;
      const images = [];
      let pageToken = null;
      let guard = 0;
      do {
        const u = pageToken ? `${url}&pageToken=${encodeURIComponent(pageToken)}` : url;
        const r = await fetch(u, { headers: auth });
        if (!r.ok) return Response.json({ error: "drive_list_error", status: r.status, detail: await r.text() }, { status: 502 });
        const data = await r.json();
        images.push(...(data.files || []));
        pageToken = data.nextPageToken;
        guard++;
      } while (pageToken && guard < 10);

      // Abbina ogni foto a un cantiere tramite codice (fallback nome)
      const matched = [];
      const unmatched = [];
      for (const f of images) {
        const fname = normalize(f.name);
        let cantiere = null;
        for (const cod of Object.keys(byCodice)) {
          if (cod && fname.includes(cod)) { cantiere = byCodice[cod]; break; }
        }
        if (!cantiere) {
          for (const c of cantieri) {
            const cn = normalize(c.nome);
            if (cn && cn.length >= 5 && fname.includes(cn)) { cantiere = c; break; }
          }
        }
        if (cantiere) matched.push({ file: f, cantiere });
        else unmatched.push({ id: f.id, name: f.name });
      }

      const summary = {
        total: images.length,
        matched: matched.length,
        unmatched: unmatched.length,
      };

      if (!doImport) {
        return Response.json({
          ...summary,
          results: matched.map((m) => ({
            file: m.file.name,
            size: m.file.size,
            cantiere_id: m.cantiere.id,
            cantiere_nome: m.cantiere.nome,
            cantiere_codice: m.cantiere.codice,
            cantiere_stato: m.cantiere.stato,
          })),
          unmatched_files: unmatched.map((u) => u.name),
        });
      }

      // Import: scarica + carica + aggiorna cantiere (batch limit)
      const toProcess = matched.slice(0, limit);
      const byCantiere = {};
      for (const m of toProcess) {
        const cid = m.cantiere.id;
        (byCantiere[cid] = byCantiere[cid] || { cantiere: m.cantiere, files: [] }).files.push(m.file);
      }

      const report = [];
      let imported = 0;
      let errors = 0;

      for (const cid of Object.keys(byCantiere)) {
        const cantiere = byCantiere[cid].cantiere;
        const newUrls = [];
        for (const f of byCantiere[cid].files) {
          try {
            const dl = await fetch(`${DRIVE_API}/${f.id}?alt=media`, { headers: auth });
            if (!dl.ok) { errors++; report.push({ file: f.name, cantiere: cantiere.nome, error: `download_${dl.status}` }); continue; }
            const buf = await dl.arrayBuffer();
            const file = new File([buf], f.name, { type: mimeFromName(f.name) });
            const upRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
            const u = upRes?.file_url || upRes?.url;
            if (!u) { errors++; report.push({ file: f.name, cantiere: cantiere.nome, error: "no_url" }); continue; }
            newUrls.push(u);
            imported++;
            report.push({ file: f.name, cantiere: cantiere.nome, url: u });
          } catch (e) {
            errors++;
            report.push({ file: f.name, cantiere: cantiere.nome, error: String(e?.message || e) });
          }
        }
        if (newUrls.length) {
          const existing = replace ? [] : (Array.isArray(cantiere.foto_cantiere) ? cantiere.foto_cantiere : []);
          const merged = [...existing, ...newUrls];
          await base44.asServiceRole.entities.Cantiere.update(cantiere.id, { foto_cantiere: merged });
        }
      }

      return Response.json({
        ...summary,
        processed: toProcess.length,
        imported,
        errors,
        remaining: Math.max(0, matched.length - toProcess.length),
        report,
      });
    }

    if (mode === "self_test") {
      const folderId = body.folder_id;
      if (!folderId) return Response.json({ error: "folder_id obbligatorio" }, { status: 400 });
      const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`;
      const url = `${DRIVE_API}?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)&pageSize=1`;
      const r = await fetch(url, { headers: auth });
      const data = await r.json();
      const f = (data.files || [])[0];
      if (!f) return Response.json({ error: "no_image_in_folder" }, { status: 404 });
      const dl = await fetch(`${DRIVE_API}/${f.id}?alt=media`, { headers: auth });
      if (!dl.ok) return Response.json({ error: "download_failed", status: dl.status }, { status: 502 });
      const buf = await dl.arrayBuffer();
      const file = new File([buf], f.name, { type: mimeFromName(f.name) });
      const upRes = await base44.asServiceRole.integrations.Core.UploadFile({ file });
      return Response.json({ source: f.name, url: upRes?.file_url || upRes?.url, ok: true });
    }

    return Response.json({ error: "mode non valido" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}