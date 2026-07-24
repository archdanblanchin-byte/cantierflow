import { LogIn, Coffee, LogOut, PlayCircle } from "lucide-react";

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