import { LogIn, Coffee, LogOut, PlayCircle, Navigation, Route } from "lucide-react";

// Coordinate del capannone sede (Rivignano Teor, UD)
export const CAPANNONE = { lat: 45.8533, lon: 12.9997, nome: "Rivignano Teor" };

// Soglie fasce trasferta (in km)
export const SOGLIE_TRASFERTA = { T0: 15, T1: 50 };

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
  pausa_fine: { label: "Fine pausa", icon: PlayCircle, color: "bg-blue-600 hover:bg-blue-700" },
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

// Classifica la trasferta in base alla media km (andata+ritorno)/2
export function classificaTrasferta(kmMedia) {
  if (kmMedia == null) return null;
  if (kmMedia < SOGLIE_TRASFERTA.T0) return "T0";
  if (kmMedia <= SOGLIE_TRASFERTA.T1) return "T1";
  return "T2";
}

// Classifica con soglie personalizzate (da entità ConfigurazioneTrasferta)
export function classificaTrasfertaConfig(kmMedia, config) {
  if (kmMedia == null) return null;
  const s0 = config?.soglia_t0 ?? SOGLIE_TRASFERTA.T0;
  const s1 = config?.soglia_t1 ?? SOGLIE_TRASFERTA.T1;
  if (kmMedia < s0) return "T0";
  if (kmMedia <= s1) return "T1";
  return "T2";
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
};