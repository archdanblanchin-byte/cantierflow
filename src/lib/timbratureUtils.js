import { LogIn, Coffee, LogOut, PlayCircle, Navigation, Route } from "lucide-react";

// Coordinate del capannone sede (Rivignano Teor, UD)
export const CAPANNONE = { lat: 45.8533, lon: 12.9997, nome: "Rivignano Teor" };

// Soglie fasce trasferta (in km): T0 < soglia_t0, T1 < soglia_t1, T2 < soglia_t2, T3 < soglia_t3, oltre = T4
export const SOGLIE_TRASFERTA = { T0: 10, T1: 27, T2: 40, T3: 70 };

export function distanzaM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function distanzaKm(lat1, lon1, lat2, lon2) {
  return Math.round((distanzaM(lat1, lon1, lat2, lon2) / 1000) * 10) / 10;
}

export function getPosizione() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non supportata dal dispositivo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error("Impossibile ottenere la posizione: " + err.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export const STEP_CONFIG = {
  ingresso: { label: "Ingresso", icon: LogIn, color: "bg-emerald-600 hover:bg-emerald-700" },
  pausa_inizio: { label: "Inizio pausa", icon: Coffee, color: "bg-amber-500 hover:bg-amber-600" },
  pausa_fine: { label: "Riprendi lavoro", icon: PlayCircle, color: "bg-blue-600 hover:bg-blue-700" },
  uscita: { label: "Uscita", icon: LogOut, color: "bg-rose-600 hover:bg-rose-700" },
  spostamento: { label: "Spostamento", icon: Navigation, color: "bg-orange-500 hover:bg-orange-600" },
};

export const ORDINE = ["ingresso", "pausa_inizio", "pausa_fine", "uscita"];

export function arrotondaQuarti(ms) {
  if (!ms || ms < 0) return 0;
  const ore = ms / 3600000;
  return Math.round(ore * 4) / 4;
}

export function fmtOre(oreQuarti) {
  if (!oreQuarti || oreQuarti <= 0) return "0h";
  const h = Math.floor(oreQuarti);
  const min = Math.round((oreQuarti - h) * 60);
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
}

// Classifica una singola tratta (km) in fascia T0/T1/T2/T3/T4 in base alle soglie configurate
export function classificaFascia(km, config) {
  if (km == null) return null;
  const s0 = config?.soglia_t0 ?? SOGLIE_TRASFERTA.T0;
  const s1 = config?.soglia_t1 ?? SOGLIE_TRASFERTA.T1;
  const s2 = config?.soglia_t2 ?? SOGLIE_TRASFERTA.T2;
  const s3 = config?.soglia_t3 ?? SOGLIE_TRASFERTA.T3;
  if (km < s0) return "T0";
  if (km <= s1) return "T1";
  if (km <= s2) return "T2";
  if (km <= s3) return "T3";
  return "T4";
}

// Classifica la trasferta giornaliera sulla media km (andata+ritorno)/2
export function classificaTrasfertaConfig(kmMedia, config) {
  return classificaFascia(kmMedia, config);
}

// Calcola la trasferta con logica andata/ritorno separate.
// Restituisce fascia_andata, fascia_ritorno, km, tipo_trasferta (su media)
// e label combinata ("½ T1 + ½ T2" quando le due tratte cadono in fasce diverse).
export function classificaTrasfertaSplit(kmAndata, kmRitorno, config) {
  const fascia_andata = classificaFascia(kmAndata, config);
  const fascia_ritorno = classificaFascia(kmRitorno, config);
  const ka = kmAndata ?? 0;
  const kr = kmRitorno ?? 0;
  const km_totali = Math.round((ka + kr) * 10) / 10;
  const km_media = kmAndata != null && kmRitorno != null ? km_totali / 2 : null;
  const tipo_trasferta = classificaFascia(km_media, config);
  let label = tipo_trasferta || "—";
  if (fascia_andata && fascia_ritorno && fascia_andata !== fascia_ritorno) {
    label = `½ ${fascia_andata} + ½ ${fascia_ritorno}`;
  }
  return { fascia_andata, fascia_ritorno, km_andata: kmAndata, km_ritorno: kmRitorno, km_totali, km_media, tipo_trasferta, label };
}

// Restituisce le coordinate del capannone (config o default)
export function getCapannone(config) {
  if (config?.sede_latitudine != null && config?.sede_longitudine != null) {
    return { lat: config.sede_latitudine, lon: config.sede_longitudine, nome: config.sede_nome || CAPANNONE.nome };
  }
  return CAPANNONE;
}

export const TRASFERTA_CONFIG = {
  T0: { label: "T0", color: "bg-slate-100 text-slate-700 border-slate-300" },
  T1: { label: "T1", color: "bg-blue-100 text-blue-700 border-blue-300" },
  T2: { label: "T2", color: "bg-purple-100 text-purple-700 border-purple-300" },
  T3: { label: "T3", color: "bg-rose-100 text-rose-700 border-rose-300" },
  T4: { label: "T4", color: "bg-amber-100 text-amber-700 border-amber-300" },
};