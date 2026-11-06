import { format } from "date-fns";
import { it } from "date-fns/locale";
import { arrotondaOre, arrotondaOreSu, arrotondaQuarti, distanzaKmStrada, getCapannone, timbroInSede, coordinateTrasferta } from "@/lib/timbratureUtils";

// Ore di lavoro previste nella giornata e conversione tempo/trasferta:
// 1 minuto di lavoro mancante = 1 km di trasferta non riconosciuta.
export const ORE_LAVORO_GIORNO = 8;
export const KM_PER_MINUTO_MANCANTE = 1;
import { classificaSpostamentiGiornata, calcolaOrePerCantiere } from "@/lib/rapportiniFromTimbrature";
import { calcolaValoriTrasferta } from "@/lib/trasfertaValori";

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
 * Ore di lavoro di una giornata ricavate direttamente dalle timbrature: è la
 * stessa base del riepilogo timbrature, così i due conteggi combaciano sempre.
 * Restituisce le ore per cantiere e la quota di spostamenti (metà di ogni
 * tratta attribuita al cantiere di partenza e a quello di arrivo).
 */
export function oreGiornoDaTimbrature(timbratureGiorno) {
  const perCantiere = {};
  let oreCantieriRaw = 0;
  let oreSpostRaw = 0;
  calcolaOrePerCantiere(timbratureGiorno).forEach((c) => {
    const nome = c.cantiere_nome || "—";
    perCantiere[nome] = (perCantiere[nome] || 0) + (c.ore || 0);
    oreCantieriRaw += c.ore || 0;
    oreSpostRaw += c.ore_spostamento || 0;
  });
  // Regola delle 8 ore: oltre le 8h di lavoro in cantiere, gli spostamenti
  // sono interamente trasferta (minuti esclusi dalle ore lavorate). Fino a 8h,
  // gli spostamenti restano lavoro (tutti i minuti conteggiati).
  const oltreOtto = oreCantieriRaw > ORE_LAVORO_GIORNO;
  const oreSpostLavorative = oltreOtto ? 0 : oreSpostRaw;
  return {
    oreCantieri: arrotondaOreSu(oreCantieriRaw),
    oreSpost: arrotondaOreSu(oreSpostLavorative),
    oreSpostTot: arrotondaOreSu(oreSpostRaw),
    perCantiere,
  };
}

/**
 * Km degli spostamenti intermedi tra cantieri: somma delle distanze tra cantieri
 * consecutivi visitati nella giornata (esclusa l'andata dal capannone e il ritorno
 * al capannone, che sono tratte separate).
 */
export function calcolaKmSpostamenti(tims, cantieri) {
  const ingressi = (tims || [])
    .filter((t) => t.tipo_evento === "ingresso" && t.cantiere_id)
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  let km = 0;
  for (let i = 1; i < ingressi.length; i++) {
    const prev = ingressi[i - 1];
    const curr = ingressi[i];
    if (prev.cantiere_id === curr.cantiere_id) continue;
    const cPrev = cantieri.find((c) => c.id === prev.cantiere_id);
    const cCurr = cantieri.find((c) => c.id === curr.cantiere_id);
    const coordPrev = coordinateTrasferta(prev, cPrev);
    const coordCurr = coordinateTrasferta(curr, cCurr);
    if (coordPrev && coordCurr) {
      km += distanzaKmStrada(coordPrev.lat, coordPrev.lon, coordCurr.lat, coordCurr.lon);
    }
  }
  return Math.round(km * 10) / 10;
}

/**
 * Calcola la trasferta giornaliera da una giornata di timbrature.
 *  - Andata: capannone -> primo cantiere (primo ingresso)
 *  - Ritorno: ultimo cantiere (ultimo ingresso) -> capannone
 *  - Spostamenti: km tra cantieri consecutivi, SEMPRE sommati al totale
 *  - Fascia UNICA sui km complessivi (andata + ritorno + spostamenti) / 2,
 *    meno il deficit di ore di cantiere (1 min mancante = 1 km tolto).
 *  - Oltre le 8h di cantiere: spostamenti, andata e ritorno restano invariati
 *    e concorrono tutti alla trasferta. Sotto le 8h: il deficit (minuti
 *    mancanti) viene riclassificato dagli spostamenti alle lavorazioni, diviso
 *    tra i cantieri, e toglie km dalla trasferta riconosciuta.
 */
export function calcolaTrasfertaGiorno(timbratureGiorno, cantieri, config) {
  const tims = (timbratureGiorno || [])
    .slice()
    .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const ingressi = tims.filter((t) => t.tipo_evento === "ingresso");
  if (ingressi.length === 0) return null;

  const primo = ingressi[0];
  const ultimoIngresso = ingressi[ingressi.length - 1];
  const ultimoTimbro = tims[tims.length - 1];
  const capannone = getCapannone(config);
  const primoCantiere = cantieri.find((c) => c.id === primo.cantiere_id);
  const ultimoCantiere = cantieri.find((c) => c.id === ultimoIngresso.cantiere_id);

  // La trasferta segue la posizione, non solo il cantiere: se il timbro di ingresso
  // (o l'ultimo timbro della giornata) è in sede, quella tratta vale 0 km e non
  // genera trasferta anche se il cantiere è lontano. Se invece l'operatore ha
  // confermato di lavorare per il cantiere in un altro posto, la tratta si misura
  // dalla posizione GPS timbrata e non dalle coordinate del cantiere.
  const partenzaDaSede = timbroInSede(primo, capannone);
  const rientroInSede = timbroInSede(ultimoTimbro, capannone);

  const coordAndata = partenzaDaSede ? null : coordinateTrasferta(primo, primoCantiere);
  const coordRitorno = rientroInSede ? null : coordinateTrasferta(ultimoTimbro, ultimoCantiere);

  const kmAndata = partenzaDaSede ? 0
    : coordAndata
      ? distanzaKmStrada(capannone.lat, capannone.lon, coordAndata.lat, coordAndata.lon)
      : null;
  const kmRitorno = rientroInSede ? 0
    : coordRitorno
      ? distanzaKmStrada(coordRitorno.lat, coordRitorno.lon, capannone.lat, capannone.lon)
      : null;
  if (kmAndata == null && kmRitorno == null) return null;

  const nessunaTrasfertaSede = kmAndata === 0 && kmRitorno === 0;

  // Km degli spostamenti intermedi: sempre sommati alla trasferta (nuova logica).
  const kmSpostamenti = calcolaKmSpostamenti(tims, cantieri);

  // Soglia delle 8 ore di LAVORO IN CANTIERE (esclusi gli spostamenti):
  // il deficit (minuti mancanti alle 8h) diventa km tolti dalla trasferta.
  const classif = classificaSpostamentiGiornata(tims);
  const minutiLavoroCantiere = Math.round((classif?.totLavorazione || 0) * 60);
  const minutiMancanti = Math.max(0, ORE_LAVORO_GIORNO * 60 - minutiLavoroCantiere);
  const sopraOtto = minutiLavoroCantiere >= ORE_LAVORO_GIORNO * 60;
  // Ore di spostamento totali della giornata (per display e spiegazione).
  const minutiSpostamento = Math.round((classif?.totSpostamento || 0) * 60);

  const valori = calcolaValoriTrasferta({
    km_andata: kmAndata,
    km_ritorno: kmRitorno,
    km_spostamenti: kmSpostamenti,
    minuti_mancanti: minutiMancanti,
  }, config);
  const fasciaRiconosciuta = valori.tipo_trasferta;
  const nessunaTrasferta = (nessunaTrasfertaSede && kmSpostamenti === 0) || valori.km_riconosciuti <= 0;

  return {
    ...valori,
    minuti_lavorati: minutiLavoroCantiere,
    minuti_spostamento: minutiSpostamento,
    tipo_trasferta: nessunaTrasferta ? null : fasciaRiconosciuta,
    label: nessunaTrasferta ? "—" : fasciaRiconosciuta,
    partenza_da_sede: partenzaDaSede,
    rientro_in_sede: rientroInSede,
    nessuna_trasferta: nessunaTrasferta,
    sopra_otto: sopraOtto,
    n_cantieri: new Set(ingressi.map((t) => t.cantiere_id).filter(Boolean)).size,
    primo_cantiere_nome: primo.cantiere_nome || primoCantiere?.nome || null,
    ultimo_cantiere_nome: ultimoIngresso.cantiere_nome || ultimoCantiere?.nome || null,
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
  const cantieriRapportini = Object.values(cantieriMap).map((c) => ({
    ...c,
    ore: arrotondaOreQuarti(c.ore),
  }));

  // Le timbrature sono la fonte unica: se la giornata ha timbrature, ore e
  // cantieri vengono da lì (stesso conteggio del riepilogo timbrature), così i
  // due prospetti combaciano. I rapportini restano solo per le giornate senza
  // timbrature (dati storici).
  const daTimbrature = timbratureGiorno && timbratureGiorno.length
    ? oreGiornoDaTimbrature(timbratureGiorno)
    : null;

  const cantieri = daTimbrature
    ? Object.entries(daTimbrature.perCantiere).map(([nome, ore]) => ({
        nome,
        ore: arrotondaOreQuarti(ore),
        stato: cantieriMap[nome]?.stato || null,
      }))
    : cantieriRapportini;

  const spostamenti = timbratureGiorno && timbratureGiorno.length
    ? calcolaSpostamenti(timbratureGiorno)
    : [];

  // Luoghi di lavoro dichiarati diversi dal cantiere (es. Capannone, officina):
  // servono a spiegare il tipo di trasferta della giornata.
  const luoghiLavoro = timbratureGiorno && timbratureGiorno.length
    ? [...new Set(timbratureGiorno.filter((t) => t.lavoro_altro_luogo && t.luogo_lavoro).map((t) => t.luogo_lavoro))]
    : [];

  // Regola delle 8 ore: oltre le 8h di lavoro in cantiere gli spostamenti
  // sono trasferta (km sommati, ore escluse); fino a 8h restano lavoro.
  const classificazioneSpostamenti = timbratureGiorno && timbratureGiorno.length
    ? classificaSpostamentiGiornata(timbratureGiorno)
    : null;

  const oreCantieri = daTimbrature
    ? daTimbrature.oreCantieri
    : cantieri.reduce((s, c) => s + c.ore, 0);
  // Ore spostamenti reali (sempre il tempo totale, per il display del dettaglio):
  // l'utente vuole vedere ore lavorazione e ore spostamenti come valori effettivi.
  const oreSpostamentiTot = daTimbrature
    ? daTimbrature.oreSpostTot || 0
    : spostamenti.reduce((s, sp) => s + sp.durata, 0);
  // oreSpostamenti = spostamenti conteggiati come lavoro (solo il deficit sotto
  // le 8h) — usato per i totali mensili, non per il display del dettaglio.
  const oreSpostamenti = daTimbrature
    ? daTimbrature.oreSpost
    : oreSpostamentiTot;

  // Note / anomalie (es. uscito prima, permesso) dal campo note_imprevisti del rapportino
  const note = [];
  (vociRapportini || []).forEach((v) => {
    if (v.note_imprevisti) note.push({ cantiere: v.cantiere, testo: v.note_imprevisti });
  });

  return {
    cantieri,
    spostamenti,
    note,
    luoghiLavoro,
    classificazioneSpostamenti,
    oreCantieri,
    oreSpostamenti,
    oreSpostamentiTot,
    oreTotali: oreCantieri + oreSpostamentiTot,
  };
}

export function formatDataBreve(d) {
  return format(d, "EEE dd MMM yyyy", { locale: it });
}