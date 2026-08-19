import {
  ClipboardList, Building2, Camera, BookUser,
  CalendarDays, BarChart2, GraduationCap, Settings,
  HardHat, Clock, CalendarClock,
} from "lucide-react";

export const RUOLI = [
  { key: "admin", label: "Amministratore", color: "bg-red-500", descrizione: "Accesso completo a tutte le sezioni" },
  { key: "responsabile_tecnico", label: "Responsabile Tecnico", color: "bg-blue-500", descrizione: "Supervisione tecnica e cantieri" },
  { key: "capocantiere", label: "Capocantiere", color: "bg-green-500", descrizione: "Gestione cantieri e rapportini" },
  { key: "collaboratore", label: "Collaboratore", color: "bg-slate-500", descrizione: "Accesso base" },
];

export const SEZIONI_APP = [
  { key: "rapportini", label: "Rapportino", path: "/rapportini", icon: ClipboardList, color: "bg-blue-500" },
  { key: "cantieri", label: "Cantiere", path: "/cantieri", icon: Building2, color: "bg-emerald-500" },
  { key: "timbratura", label: "Timbratura", path: "/timbratura", icon: Clock, color: "bg-emerald-600" },
  { key: "foto", label: "Foto", path: "/foto", icon: Camera, color: "bg-purple-500" },
  { key: "anagrafe", label: "Anagrafe", path: "/anagrafe", icon: BookUser, color: "bg-slate-600" },
  { key: "ore_lavoratori", label: "Ore Lavoratori", path: "/ore-lavoratori", icon: Clock, color: "bg-amber-500" },
  { key: "programmazione", label: "Programmazione", path: "/programmazione", icon: CalendarClock, color: "bg-sky-500" },
  { key: "programma", label: "Programma", path: "/programma", icon: CalendarDays, color: "bg-orange-500" },
  { key: "cronoprogramma", label: "Cronoprogramma", path: "/cronoprogramma", icon: BarChart2, color: "bg-cyan-500" },
  { key: "corsi", label: "Corsi", path: "/corsi", icon: GraduationCap, color: "bg-violet-500" },
  { key: "permessi_ferie", label: "Permessi", path: "/permessi-ferie", icon: CalendarDays, color: "bg-rose-600" },
  { key: "impostazioni", label: "Impostazioni", path: "/impostazioni", icon: Settings, color: "bg-slate-700", adminOnly: true },
];

export const PERMESSI_DEFAULT = {
  admin: SEZIONI_APP.map(s => s.key),
  responsabile_tecnico: ["rapportini", "timbratura", "cantieri", "foto", "anagrafe", "ore_lavoratori", "programmazione", "programma", "cronoprogramma", "corsi", "permessi_ferie"],
  capocantiere: ["rapportini", "timbratura", "cantieri", "foto", "anagrafe", "ore_lavoratori", "programmazione", "programma", "permessi_ferie"],
  collaboratore: ["rapportini", "timbratura", "cantieri", "foto", "permessi_ferie"],
};

export function getRuoloLabel(key) {
  return RUOLI.find(r => r.key === key)?.label || key;
}

export function getRuoloColor(key) {
  return RUOLI.find(r => r.key === key)?.color || "bg-slate-500";
}

export const ICON_HOME = HardHat;