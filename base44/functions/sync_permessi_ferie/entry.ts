import { createClientFromRequest } from "npm:@base44/sdk@0.8.49";
import {
  leggiCalendario,
  parseIcal,
  permessiDelPeriodo,
} from "../../shared/permessiCalendario.ts";

// Ruoli che possono rileggere il calendario e aggiornare i dati salvati
const RUOLI_ABILITATI = ["admin", "responsabile_tecnico"];

const normNome = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
const chiavePermesso = (giorno, tipo, nome) => `${giorno}|${tipo}|${normNome(nome)}`;

/**
 * Rilegge il calendario Google del mese indicato e salva in modo permanente
 * ogni permesso/feria trovato. Aggiorna i giorni già presenti e aggiunge i
 * nuovi, senza mai cancellare ciò che è già stato salvato.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!RUOLI_ABILITATI.includes(user.role)) {
      return Response.json(
        { error: "Solo amministratori e responsabili tecnici possono aggiornare i permessi" },
        { status: 403 }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch (_e) {
      // payload vuoto
    }
    const da = body.da;
    const a = body.a;
    const formatoData = /^\d{4}-\d{2}-\d{2}$/;
    if (!formatoData.test(da || "") || !formatoData.test(a || "")) {
      return Response.json(
        { error: "Parametri non validi: usa 'da' e 'a' (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    const mese = da.slice(0, 7);

    // Lettura forzata: il pulsante di aggiornamento deve vedere subito le
    // modifiche fatte sul calendario, senza attendere la copia in memoria.
    const ics = await leggiCalendario(true);
    const events = parseIcal(ics);
    const perGiorno = permessiDelPeriodo(events, da, a);

    const trovate = [];
    Object.entries(perGiorno).forEach(([giorno, lista]) => {
      lista.forEach((p) => {
        if (p.tipo !== "permesso" && p.tipo !== "ferie") return;
        trovate.push({ giorno, tipo: p.tipo, nome: p.nome, ore: p.ore ?? null });
      });
    });

    const esistenti = await base44.asServiceRole.entities.PermessoGiorno.filter(
      { data: { $gte: da, $lte: a } },
      "-data",
      2000
    );
    const perChiave = new Map(esistenti.map((r) => [r.chiave, r]));

    const adesso = new Date().toISOString();
    const nuovi = [];
    const aggiornati = [];
    trovate.forEach((t) => {
      const chiave = chiavePermesso(t.giorno, t.tipo, t.nome);
      const record = {
        chiave,
        data: t.giorno,
        nome: t.nome,
        tipo: t.tipo,
        ore: t.ore,
        ultima_sync: adesso,
      };
      const esistente = perChiave.get(chiave);
      if (esistente) aggiornati.push({ id: esistente.id, ...record });
      else nuovi.push(record);
    });

    if (nuovi.length) {
      await base44.asServiceRole.entities.PermessoGiorno.bulkCreate(nuovi);
    }
    if (aggiornati.length) {
      await base44.asServiceRole.entities.PermessoGiorno.bulkUpdate(aggiornati);
    }

    // Segna il mese come caricato: da qui in poi l'app legge solo i dati salvati
    // e non interroga più il calendario Google, finché non si preme di nuovo.
    const marcatori = await base44.asServiceRole.entities.SincronizzazionePermessi.filter({ mese });
    const marcatore = { mese, ultima_sync: adesso, giorni_salvati: trovate.length };
    if (marcatori.length) {
      await base44.asServiceRole.entities.SincronizzazionePermessi.update(marcatori[0].id, marcatore);
    } else {
      await base44.asServiceRole.entities.SincronizzazionePermessi.create(marcatore);
    }

    return Response.json({
      mese,
      salvati: nuovi.length,
      aggiornati: aggiornati.length,
      totale: trovate.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}