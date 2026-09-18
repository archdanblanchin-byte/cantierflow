import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { calcolaTrasfertaGiorno } from "@/lib/oreLavoratoriUtils";

const norm = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");

/**
 * Ricalcola tutte le trasferte già registrate partendo dalle timbrature e dalla
 * posizione del timbro:
 *  - giornata interamente in sede -> la trasferta viene rimossa
 *  - tratte diverse -> km, fasce e tipo vengono aggiornati
 *  - giorni senza timbrature utili -> lasciati invariati (non ricalcolabili)
 */
export async function ricalcolaTrasferte() {
  const [trasferte, cantieri, configs, timbrature] = await Promise.all([
    base44.entities.Trasferta.list("-data", 5000),
    base44.entities.Cantiere.list(),
    base44.entities.ConfigurazioneTrasferta.list(),
    base44.entities.Timbratura.list("-data_ora", 5000),
  ]);
  const config = configs[0] || null;

  const perGiorno = {};
  timbrature.forEach((t) => {
    if (!t.data_ora) return;
    const key = format(new Date(t.data_ora), "yyyy-MM-dd");
    (perGiorno[key] = perGiorno[key] || []).push(t);
  });

  const risultato = { totale: trasferte.length, aggiornate: 0, rimosse: 0, saltate: 0 };

  for (const tr of trasferte) {
    if (!tr.data) { risultato.saltate++; continue; }
    const key = format(new Date(tr.data + "T00:00:00"), "yyyy-MM-dd");
    const miei = (perGiorno[key] || []).filter(
      (t) =>
        (tr.user_email && t.user_email === tr.user_email) ||
        (tr.user_nome && t.user_nome && norm(t.user_nome) === norm(tr.user_nome))
    );
    if (!miei.length) { risultato.saltate++; continue; }

    const calc = calcolaTrasfertaGiorno(miei, cantieri, config);
    if (!calc) { risultato.saltate++; continue; }

    if (calc.nessuna_trasferta) {
      await base44.entities.Trasferta.delete(tr.id);
      risultato.rimosse++;
      continue;
    }

    await base44.entities.Trasferta.update(tr.id, {
      km_andata: calc.km_andata ?? 0,
      km_ritorno: calc.km_ritorno ?? 0,
      km_totali: calc.km_totali ?? 0,
      fascia_andata: calc.fascia_andata,
      fascia_ritorno: calc.fascia_ritorno,
      tipo_trasferta: calc.tipo_trasferta,
      primo_cantiere_nome: calc.primo_cantiere_nome || tr.primo_cantiere_nome,
      ultimo_cantiere_nome: calc.ultimo_cantiere_nome || tr.ultimo_cantiere_nome,
    });
    risultato.aggiornate++;
  }

  return risultato;
}