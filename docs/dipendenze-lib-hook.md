# Lib + Hook CantierFlow

Ricrea questi file in Workflow mantenendo gli stessi percorsi. Le dipendenze dei lib tra loro: `rapportiniFromTimbrature` e `oreLavoratoriUtils` importano da `timbratureUtils`; `usePermessi` e `AuthContext` importano `permissions`/`app-params`.

## src/lib/permissions.js

```js
import {
  ClipboardList, Building2, Camera, BookUser,
  CalendarDays, BarChart2, GraduationCap, Settings, Car,
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
  { key: "uso_furgoni", label: "Uso Furgoni", path: "/uso-furgoni", icon: Car, color: "bg-zinc-700" },
  { key: "impostazioni", label: "Impostazioni", path: "/impostazioni", icon: Settings, color: "bg-slate-700", adminOnly: true },
];

export const PERMESSI_DEFAULT = {
  admin: SEZIONI_APP.map(s => s.key),
  responsabile_tecnico: ["rapportini", "timbratura", "cantieri", "foto", "anagrafe", "ore_lavoratori", "programmazione", "programma", "cronoprogramma", "corsi", "permessi_ferie", "uso_furgoni"],
  capocantiere: ["rapportini", "timbratura", "cantieri", "foto", "anagrafe", "ore_lavoratori", "programmazione", "programma", "permessi_ferie", "uso_furgoni"],
  collaboratore: ["rapportini", "timbratura", "cantieri", "foto", "permessi_ferie", "uso_furgoni"],
};

export function getRuoloLabel(key) {
  return RUOLI.find(r => r.key === key)?.label || key;
}

export function getRuoloColor(key) {
  return RUOLI.find(r => r.key === key)?.color || "bg-slate-500";
}

export const ICON_HOME = HardHat;
```

## src/lib/timbratureUtils.js

```js
import { LogIn, Coffee, LogOut, PlayCircle, Navigation, Route } from "lucide-react";

export const CAPANNONE = { lat: 45.8533, lon: 12.9997, nome: "Rivignano Teor" };
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

export function classificaTrasfertaConfig(kmMedia, config) {
  return classificaFascia(kmMedia, config);
}

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
```

## src/lib/rapportiniFromTimbrature.js

```js
import { arrotondaQuarti } from "./timbratureUtils";
import { base44 } from "@/api/base44Client";

export function calcolaOrePerCantiere(timbrature) {
  const tOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const perCantiere = {};
  tOrd.forEach((t) => {
    if (!t.cantiere_id) return;
    if (!perCantiere[t.cantiere_id]) {
      perCantiere[t.cantiere_id] = { cantiere_id: t.cantiere_id, cantiere_nome: t.cantiere_nome, ingresso: null, timbri: [] };
    }
    perCantiere[t.cantiere_id].timbri.push(t);
    if (t.tipo_evento === "ingresso" && !perCantiere[t.cantiere_id].ingresso) {
      perCantiere[t.cantiere_id].ingresso = t;
    }
  });

  return Object.values(perCantiere).map((g) => {
    let ore = 0;
    const timbri = g.timbri;
    let i = 0;
    while (i < timbri.length) {
      if (timbri[i].tipo_evento === "ingresso") {
        const start = new Date(timbri[i].data_ora);
        let endIdx = -1;
        for (let j = i + 1; j < timbri.length; j++) {
          if (timbri[j].tipo_evento === "uscita" || timbri[j].tipo_evento === "spostamento") { endIdx = j; break; }
        }
        const end = endIdx >= 0 ? new Date(timbri[endIdx].data_ora) : new Date();
        let sessione = end - start;
        let pIn = null;
        const limit = endIdx >= 0 ? endIdx : timbri.length;
        for (let k = i + 1; k < limit; k++) {
          if (timbri[k].tipo_evento === "pausa_inizio") pIn = new Date(timbri[k].data_ora);
          else if (timbri[k].tipo_evento === "pausa_fine" && pIn) { sessione -= new Date(timbri[k].data_ora) - pIn; pIn = null; }
        }
        ore += arrotondaQuarti(sessione);
        i = endIdx >= 0 ? endIdx + 1 : timbri.length;
      } else {
        i++;
      }
    }
    return { cantiere_id: g.cantiere_id, cantiere_nome: g.cantiere_nome, ingresso: g.ingresso, ore };
  });
}

function stessaGiornata(iso, giorno) {
  if (!iso) return false;
  return new Date(iso).toDateString() === giorno.toDateString();
}

export async function generaRapportiniDaGiornata({ user, giorno, timbrature, rapportiniEsistenti }) {
  const orePerCantiere = calcolaOrePerCantiere(timbrature).filter((c) => c.ore > 0);
  const creati = [];
  for (const c of orePerCantiere) {
    const esiste = (rapportiniEsistenti || []).some(
      (r) => r.cantiere_id === c.cantiere_id && r.user_email === user.email && stessaGiornata(r.data, giorno)
    );
    if (esiste) continue;
    const draft = await base44.entities.Rapportino.create({
      data: c.ingresso?.data_ora || new Date().toISOString(),
      cantiere_id: c.cantiere_id,
      cantiere_nome: c.cantiere_nome,
      user_email: user.email,
      foto: [], foto_annotate: [], note_generali: "",
      ore_totali_squadra: c.ore,
      collaboratori: [], has_lavorazioni_extra: false,
      lavorazioni_extra: [], lavorazioni_normali: [], materiali: [],
      stato: "bozza",
    });
    creati.push(draft);
  }
  return creati;
}

export async function syncRapportinoOreDaTimbratura({ user_email, cantiere_id, giorno }) {
  if (!user_email || !cantiere_id || !giorno) return null;
  const g = new Date(giorno);
  if (isNaN(g.getTime())) return null;
  const inizio = new Date(g); inizio.setHours(0, 0, 0, 0);
  const fine = new Date(g); fine.setHours(23, 59, 59, 999);
  const timb = await base44.entities.Timbratura.filter({
    user_email, cantiere_id, data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
  });
  const ore = calcolaOrePerCantiere(timb).find((c) => c.cantiere_id === cantiere_id)?.ore ?? 0;
  const rapportini = await base44.entities.Rapportino.filter({ user_email, cantiere_id });
  const r = rapportini.find((rr) => rr.data && new Date(rr.data).toDateString() === g.toDateString());
  if (!r) return null;
  if (Math.abs((r.ore_totali_squadra ?? 0) - ore) < 0.001) return r;
  await base44.entities.Rapportino.update(r.id, { ore_totali_squadra: ore });
  return { ...r, ore_totali_squadra: ore };
}
```

## src/lib/oreLavoratoriUtils.js

```js
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { arrotondaQuarti, distanzaKm, getCapannone, classificaTrasfertaSplit } from "@/lib/timbratureUtils";

export function arrotondaOreQuarti(ore) {
  if (!ore || ore < 0) return 0;
  return Math.round(ore * 4) / 4;
}

export function calcolaSpostamenti(timbratureGiorno) {
  const tims = (timbratureGiorno || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const raw = tims.filter((t) => t.tipo_evento === "spostamento");
  return raw.map((s) => {
    const idx = tims.indexOf(s);
    const next = tims[idx + 1];
    let durata = 0;
    if (next) durata = arrotondaQuarti(new Date(next.data_ora) - new Date(s.data_ora));
    return { id: s.id, destinazione: s.cantiere_destinazione_nome, km: s.km_spostamento || 0, ora: new Date(s.data_ora), durata, mezzo_proprio: s.mezzo_proprio };
  });
}

export function calcolaTrasfertaGiorno(timbratureGiorno, cantieri, config) {
  const tims = (timbratureGiorno || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const ingressi = tims.filter((t) => t.tipo_evento === "ingresso");
  if (ingressi.length === 0) return null;
  const primo = ingressi[0];
  const ultimo = ingressi[ingressi.length - 1];
  const capannone = getCapannone(config);
  const primoCantiere = cantieri.find((c) => c.id === primo.cantiere_id);
  const ultimoCantiere = cantieri.find((c) => c.id === ultimo.cantiere_id);
  const kmAndata = primoCantiere?.latitudine != null ? distanzaKm(capannone.lat, capannone.lon, primoCantiere.latitudine, primoCantiere.longitudine) : null;
  const kmRitorno = ultimoCantiere?.latitudine != null ? distanzaKm(ultimoCantiere.latitudine, ultimoCantiere.longitudine, capannone.lat, capannone.lon) : null;
  if (kmAndata == null && kmRitorno == null) return null;
  const split = classificaTrasfertaSplit(kmAndata, kmRitorno, config);
  return {
    ...split,
    primo_cantiere_nome: primo.cantiere_nome || primoCantiere?.nome || null,
    ultimo_cantiere_nome: ultimo.cantiere_nome || ultimoCantiere?.nome || null,
    mezzo_proprio: tims.some((t) => t.mezzo_proprio),
  };
}

export function buildDettaglioGiorno(vociRapportini, timbratureGiorno) {
  const cantieriMap = {};
  (vociRapportini || []).forEach((v) => {
    const nome = v.cantiere || "—";
    if (!cantieriMap[nome]) cantieriMap[nome] = { nome, ore: 0, stato: null };
    cantieriMap[nome].ore += v.ore || 0;
    if (v.stato) cantieriMap[nome].stato = v.stato;
  });
  const cantieri = Object.values(cantieriMap).map((c) => ({ ...c, ore: arrotondaOreQuarti(c.ore) }));
  const spostamenti = timbratureGiorno && timbratureGiorno.length ? calcolaSpostamenti(timbratureGiorno) : [];
  const oreCantieri = cantieri.reduce((s, c) => s + c.ore, 0);
  const oreSpostamenti = spostamenti.reduce((s, sp) => s + sp.durata, 0);
  const note = [];
  (vociRapportini || []).forEach((v) => {
    if (v.note_imprevisti) note.push({ cantiere: v.cantiere, testo: v.note_imprevisti });
  });
  return { cantieri, spostamenti, note, oreCantieri, oreSpostamenti, oreTotali: oreCantieri + oreSpostamenti };
}

export function formatDataBreve(d) {
  return format(d, "EEE dd MMM yyyy", { locale: it });
}
```

## src/lib/lavorazioni.js

```js
export const CATEGORIE_LAVORAZIONE = [
  { nome: "🔧 Preparazione e organizzazione cantiere", tipi: ["Allestire cantiere","Organizzare cantiere","Gestione cantiere","Sopralluoghi (vari)","Riunioni / corsi / formazione","Delimitare area di lavoro","Messa in sicurezza passaggi","Dirigere traffico","Copertura facciata / ponteggi / tende","Protezione pavimenti e superfici","Sgombero aree (giardino, locali, ecc.)"] },
  { nome: "🚚 Logistica e movimentazione", tipi: ["Carico e scarico materiale","Carico/scarico furgone","Trasporto materiale (anche ai piani alti)","Carico/scarico ponteggi e trabattelli","Movimentazione attrezzature (ragno, cesta, ecc.)","Recupero / restituzione attrezzature a noleggio","Rifornimento materiali"] },
  { nome: "🧹 Pulizia e manutenzione", tipi: ["Pulizia cantiere","Pulizia attrezzi e mezzi","Pulizia grondaie, terrazzi, vetri, pavimenti","Idrolavaggi","Pulizia vegetazione / superfici esterne","Manutenzione furgoni e magazzino"] },
  { nome: "🧱 Demolizioni e rimozioni", tipi: ["Demolizione intonaci","Demolizione pavimenti e piastrelle","Demolizione tramezze (laterizio/cartongesso/alluminio)","Demolizioni cemento armato","Rimozione battiscopa, colla, cappotto, silicone","Smontaggio elementi (porte, lampade, zanzariere, ecc.)","Smaltimento rifiuti e ruderi"] },
  { nome: "🏗️ Muratura e costruzioni", tipi: ["Realizzazione tramezzi","Intonaco (tradizionale, armato, B-mortar, rinzaffo)","Rasature (semplice, armata, elastica, XLime, ecc.)","Stuccature (varie tipologie e materiali)","Caldane e getti in cemento","Compensazione dislivelli","Ripristino calcestruzzo e intonaci","Ricostruzioni (colonne, murature)"] },
  { nome: "🧰 Cartongesso", tipi: ["Strutture cartongesso","Contropareti e controsoffitti","Velette","Stuccatura e rasatura cartongesso","Demolizione e smaltimento cartongesso"] },
  { nome: "🏠 Isolamenti e cappotto", tipi: ["Posa cappotto","Incollaggio pannelli (aerogel, isolanti, lana di vetro/roccia)","Rasatura armata cappotto","Ripristino cappotto","Isolamenti murali e davanzali"] },
  { nome: "🌧️ Impermeabilizzazioni", tipi: ["Guaina liquida","Membrane impermeabilizzanti","Trattamenti idrorepellenti","Impermeabilizzazione terrazzi e camini","Sigillature e siliconature"] },
  { nome: "🎨 Pitture e finiture", tipi: ["Pittura (interni/esterni)","Pitture lavabili, traspiranti, termoisolanti","Smalti (ferro, legno, radiatori, ecc.)","Verniciature varie","Finiture decorative (graffiato, marmorino, resina, microcemento)","Protettivi e impregnanti"] },
  { nome: "🪚 Lavorazioni su legno e metallo", tipi: ["Carteggiature (legno, ferro, muri, ecc.)","Levigature","Raschiature vernici","Trattamenti antiruggine","Taglio ferri e metalli"] },
  { nome: "🪟 Serramenti e dettagli", tipi: ["Montaggio/smontaggio porte e finestre","Siliconatura serramenti","Montaggio coprifili, battiscopa, soglie","Installazione cassaforte, cassette posta, numeri civici"] },
  { nome: "🏢 Tetti e lattoneria", tipi: ["Grondaie e pluviali","Converse e lamiere","Scossaline","Sistemazione tegole","Sgocciolatoi"] },
  { nome: "🧩 Finiture e dettagli estetici", tipi: ["Riquadri finestre","Spallette","Gocciolatoi e marcapiani","Ritocchi finali","Patinature"] },
  { nome: "⚙️ Attività tecniche varie", tipi: ["Tracciamenti","Misurazioni (calibro, livelli)","Prove e campioni","Verifiche e controlli","Rilievi foto/video"] },
];
```

## src/lib/AuthContext.jsx

```jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => { checkAppState(); }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: { 'X-App-Id': appParams.appId },
        token: appParams.token,
        interceptResponses: true
      });
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        if (appParams.token) { await checkUserAuth(); } else { setIsLoadingAuth(false); setIsAuthenticated(false); }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') { setAuthError({ type: 'auth_required', message: 'Authentication required' }); }
          else if (reason === 'user_not_registered') { setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' }); }
          else { setAuthError({ type: reason, message: appError.message }); }
        } else { setAuthError({ type: 'unknown', message: appError.message || 'Failed to load app' }); }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({ type: 'unknown', message: error.message || 'An unexpected error occurred' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      if (error.status === 401 || error.status === 403) { setAuthError({ type: 'auth_required', message: 'Authentication required' }); }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) { base44.auth.logout(window.location.href); } else { base44.auth.logout(); }
  };

  const navigateToLogin = () => { base44.auth.redirectToLogin(window.location.href); };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, appPublicSettings, logout, navigateToLogin, checkAppState }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
```

## src/lib/utils.js

```js
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const isIframe = window.self !== window.top;
```

## src/lib/query-client.js

```js
import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: { refetchOnWindowFocus: false, retry: 1 },
	},
});
```

## src/lib/app-params.js

```js
const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase();

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) return defaultValue;
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) { storage.setItem(storageKey, searchParam); return searchParam; }
	if (defaultValue) { storage.setItem(storageKey, defaultValue); return defaultValue; }
	const storedValue = storage.getItem(storageKey);
	if (storedValue) return storedValue;
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}

export const appParams = { ...getAppParams() }
```

## src/hooks/usePermessi.js

```js
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { PERMESSI_DEFAULT, SEZIONI_APP } from "@/lib/permissions";

export function usePermessi() {
  const { user } = useAuth();
  const ruoloRaw = user?.role || "collaboratore";
  const ruolo = ruoloRaw === "user" ? "collaboratore" : ruoloRaw;
  const isAdmin = ruolo === "admin";

  const { data: permessiRaw = [], isLoading } = useQuery({
    queryKey: ["permessi-sezione"],
    queryFn: () => base44.entities.PermessoSezione.list(),
    enabled: !!user,
  });

  let sezioniPermesse;
  if (isAdmin) {
    sezioniPermesse = SEZIONI_APP.map(s => s.key);
  } else {
    const configRecord = permessiRaw.find(p => p.ruolo === ruolo);
    sezioniPermesse = configRecord?.sezioni_permesse || PERMESSI_DEFAULT[ruolo] || [];
  }

  const puoVedere = (key) => {
    if (isAdmin) return true;
    if (SEZIONI_APP.find(s => s.key === key)?.adminOnly) return false;
    return sezioniPermesse.includes(key);
  };

  return { ruolo, isAdmin, sezioniPermesse, puoVedere, isLoading };
}
```

## Backend functions (in Workflow: ricrea con stessi nomi)

Le pagine chiamano 3 backend functions via `base44.functions.invoke`:
- `sync_cronoprogramma` (azione "sync") — sincronizza il cronoprogramma bidirezionalmente con Workflow via endpoint HTTP + secret condiviso.
- `get_permessi_ferie` (param `{ data }`) — restituisce `{ permessi: [{ nome, tipo }] }` leggendo il calendario Google (ferie/permessi) per la data.
- `registra_uso_furgone` (payload uso furgone) — crea il record UsoFurgone e invia email di notifica all'amministrazione.

Il codice di queste 3 funzioni si trova in `base44/functions/<nome>/entry.ts` del progetto CantierFlow.