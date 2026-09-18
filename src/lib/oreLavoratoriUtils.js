import { format } from "date-fns";
import { it } from "date-fns/locale";
import { arrotondaOre, arrotondaQuarti, distanzaKm, distanzaKmStrada, getCapannone, classificaTrasfertaSplit, timbroInSede } from "@/lib/timbratureUtils";
import { classificaSpostamentiGiornata } from "@/lib/rapportiniFromTimbrature";

export function arrotondaOreQuarti(ore) {
  return arrotondaOre(ore);
}

/**
 * Spostamenti di una giornata (timbrature di tipo "spostamento").
 * Durata = dal timbro di spostamento al timbro successivo.
 */
export function calcolaSpostamenti(timbratureGiorno) {
  const tims = (timbratureGiorno || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const raw = tims.filter((t) => t.tipo_evento === "spostamento");
  return raw.map((s) => {
    const idx = tims.indexOf(s);
    const next = tims[idx + 1];
    let durata = 0;
    if (next) durata = arrotondaQuarti(new Date(next.data_ora) - new Date(s.data_ora));
    return {
      id: s.id,
      destinazione: s.cantiere_destinazione_nome,
      km: s.km_spostamento || 0,
      ora: new Date(s.data_ora),
      durata,
      mezzo_proprio: s.mezzo_proprio,
    };
  });
}

/**
 * Calcola la trasferta giornaliera da una giornata di timbrature.
 *  - Andata: capannone -> primo cantiere (primo ingresso)
 *  - Ritorno: ultimo cantiere (ultimo ingresso) -> capannone
 *  - fasce separate + combinazione "metà andata + metà ritorno"
 */
export function calcolaTrasfertaGiorno(timbratureGiorno, cantieri, config) {
  const tims = (timbratureGiorno || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const ingressi = tims.filter((t) => t.tipo_evento === "ingresso");
  if (ingressi.length === 0) return null;

  const primo = ingressi[0];
  const ultimo = ingressi[ingressi.length - 1];
  const capannone = getCapannone(config);
  const primoCantiere = cantieri.find((c) => c.id === primo.cantiere_id);
  const ultimoCantiere = cantieri.find((c) => c.id === ultimo.cantiere_id);

  // La trasferta segue la posizione, non solo il cantiere: se il timbro di ingresso
  // (o l'ultimo timbro della giornata) è in sede, quella tratta vale 0 km e non
  // genera trasferta anche se il cantiere è lontano.
  const partenzaDaSede = timbroInSede(primo, capannone);
  const rientroInSede = timbroInSede(tims[tims.length - 1], capannone);

  // km stimati di strada (linea d'aria + fattore di correzione): capannone <-> cantiere
  const kmAndata = partenzaDaSede ? 0
    : primoCantiere?.latitudine != null
      ? distanzaKmStrada(capannone.lat, capannone.lon, primoCantiere.latitudine, primoCantiere.longitudine)
      : null;
  const kmRitorno = rientroInSede ? 0
    : ultimoCantiere?.latitudine != null
      ? distanzaKmStrada(ultimoCantiere.latitudine, ultimoCantiere.longitudine, capannone.lat, capannone.lon)
      : null;
  // Nessuna informazione utile (né sede né coordinate dei cantieri): non si può
  // determinare la trasferta.
  if (kmAndata == null && kmRitorno == null) return null;

  // Entrambe le tratte a 0 km: giornata interamente in sede, nessuna trasferta.
  const nessunaTrasferta = kmAndata === 0 && kmRitorno === 0;
  const split = classificaTrasfertaSplit(kmAndata, kmRitorno, config);
  return {
    ...split,
    tipo_trasferta: nessunaTrasferta ? null : split.tipo_trasferta,
    label: nessunaTrasferta ? "—" : split.label,
    partenza_da_sede: partenzaDaSede,
    rientro_in_sede: rientroInSede,
    nessuna_trasferta: nessunaTrasferta,
    primo_cantiere_nome: primo.cantiere_nome || primoCantiere?.nome || null,
    ultimo_cantiere_nome: ultimo.cantiere_nome || ultimoCantiere?.nome || null,
    mezzo_proprio: tims.some((t) => t.mezzo_proprio),
  };
}

/**
 * Costruisce il dettaglio di una giornata per un collaboratore.
 *  - vociRapportini: [{ cantiere, ore, stato }] dai rapportini (sempre disponibile)
 *  - timbratureGiorno: timbrature del giorno (per spostamenti; solo se collaboratore con email)
 */
export function buildDettaglioGiorno(vociRapportini, timbratureGiorno) {
  const cantieriMap = {};
  (vociRapportini || []).forEach((v) => {
    const nome = v.cantiere || "—";
    if (!cantieriMap[nome]) cantieriMap[nome] = { nome, ore: 0, stato: null };
    cantieriMap[nome].ore += v.ore || 0;
    if (v.stato) cantieriMap[nome].stato = v.stato;
  });
  const cantieri = Object.values(cantieriMap).map((c) => ({
    ...c,
    ore: arrotondaOreQuarti(c.ore),
  }));

  const spostamenti = timbratureGiorno && timbratureGiorno.length
    ? calcolaSpostamenti(timbratureGiorno)
    : [];

  // Regola delle 8 ore: gli spostamenti entro le 8 ore si dividono tra i cantieri,
  // la parte oltre le 8 ore viene conteggiata come trasferta.
  const classificazioneSpostamenti = timbratureGiorno && timbratureGiorno.length
    ? classificaSpostamentiGiornata(timbratureGiorno)
    : null;

  const oreCantieri = cantieri.reduce((s, c) => s + c.ore, 0);
  const oreSpostamenti = spostamenti.reduce((s, sp) => s + sp.durata, 0);

  // Note / anomalie (es. uscito prima, permesso) dal campo note_imprevisti del rapportino
  const note = [];
  (vociRapportini || []).forEach((v) => {
    if (v.note_imprevisti) note.push({ cantiere: v.cantiere, testo: v.note_imprevisti });
  });

  return {
    cantieri,
    spostamenti,
    note,
    classificazioneSpostamenti,
    oreCantieri,
    oreSpostamenti,
    oreTotali: oreCantieri + oreSpostamenti,
  };
}

export function formatDataBreve(d) {
  return format(d, "EEE dd MMM yyyy", { locale: it });
}