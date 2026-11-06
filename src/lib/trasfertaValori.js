import { classificaFascia } from "@/lib/timbratureUtils";

const decimo = (n) => Math.round(n * 10) / 10;

// Unico calcolo dei valori derivati, usato sia in lettura sia nel salvataggio.
// Nuova logica: la fascia è UNICA, calcolata sui km complessivi
// (andata + ritorno + spostamenti) diviso 2, meno il deficit di ore di cantiere
// (1 min mancante alle 8h = 1 km tolto dalla trasferta).
// Non si usano più fasce separate per andata e ritorno.
export function calcolaValoriTrasferta(dati = {}, config) {
  const km_andata = dati.km_andata ?? 0;
  const km_ritorno = dati.km_ritorno ?? 0;
  const km_spostamenti = dati.km_spostamenti ?? 0;
  const minuti_mancanti = Math.max(0, dati.minuti_mancanti ?? 0);
  const km_totali = decimo(km_andata + km_ritorno + km_spostamenti);
  const km_deficit = decimo(minuti_mancanti); // 1 minuto mancante = 1 km
  const km_riconosciuti = Math.max(0, decimo((km_totali - km_deficit) / 2));
  return {
    km_andata: decimo(km_andata),
    km_ritorno: decimo(km_ritorno),
    km_spostamenti,
    km_totali,
    km_media: decimo(km_totali / 2),
    km_riconosciuti,
    km_deficit,
    minuti_mancanti,
    tipo_trasferta: km_riconosciuti > 0 ? classificaFascia(km_riconosciuti, config) : null,
  };
}

// Solo una conferma manuale prevale sull'automatismo. Le correzioni di andata,
// ritorno e fascia restano; spostamenti e deficit seguono le timbrature aggiornate.
export function risolviTrasfertaGiorno(salvata, calcolata, config) {
  if (!salvata || (!salvata.confermata && calcolata)) return calcolata || null;
  const valori = calcolaValoriTrasferta({
    km_andata: salvata.km_andata ?? calcolata?.km_andata,
    km_ritorno: salvata.km_ritorno ?? calcolata?.km_ritorno,
    km_spostamenti: calcolata?.km_spostamenti ?? salvata.km_spostamenti ?? 0,
    minuti_mancanti: calcolata?.minuti_mancanti ?? salvata.minuti_mancanti ?? 0,
  }, config);
  const tipo = salvata.tipo_trasferta || valori.tipo_trasferta;
  return { ...calcolata, ...salvata, ...valori, tipo_trasferta: tipo,
    label: tipo || "—", nessuna_trasferta: !tipo, confermata: !!salvata.confermata };
}