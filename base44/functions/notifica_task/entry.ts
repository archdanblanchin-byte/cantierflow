import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Invia l'email di notifica per un task assegnato o completato.
// Il destinatario NON arriva dal chiamante: viene ricavato dal task stesso,
// così la funzione non può essere usata per spedire email a indirizzi arbitrari.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const notaId = body?.nota_id;
    const evento = body?.evento;
    if (!notaId || !["assegnato", "completato"].includes(evento)) {
      return Response.json({ error: "Parametri non validi" }, { status: 400 });
    }

    const nota = await base44.entities.Nota.get(notaId);
    if (!nota || nota.tipo !== "task") return Response.json({ error: "Task non trovato" }, { status: 404 });

    const assegnatari = (nota.destinatari_email || []).filter(Boolean);
    const assegnatore = nota.assegnato_da || nota.created_by;
    const mittente = user.full_name || user.email;

    let to = null;
    let titolo = "";
    let messaggio = "";

    if (evento === "assegnato") {
      if (!assegnatari.length) return Response.json({ ok: true, skipped: "nessun assegnatario" });
      if (assegnatore !== user.email) return Response.json({ error: "Non autorizzato" }, { status: 403 });
      to = assegnatari[0];
      titolo = "Nuovo task assegnato";
      messaggio = `${esc(mittente)} ti ha assegnato un task.`;
    } else {
      if (!assegnatari.includes(user.email)) return Response.json({ error: "Non autorizzato" }, { status: 403 });
      if (!assegnatore || assegnatore === user.email) return Response.json({ ok: true, skipped: "nessun assegnatore" });
      to = assegnatore;
      titolo = "Task completato";
      messaggio = `${esc(mittente)} ha completato il task che gli avevi assegnato.`;
    }

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to,
        template_name: "NotificaTask",
        variables: { titolo, messaggio, dettaglio: esc(nota.testo) },
      });
    } catch (e) {
      // L'email è best-effort: il task resta valido anche se la spedizione non riesce.
      return Response.json({ ok: false, email_error: e.message });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}