import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LogIn, Coffee, LogOut, PlayCircle, MapPin, Loader2, Clock,
  AlertTriangle, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

function distanzaM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getPosizione() {
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

const STEP_CONFIG = {
  ingresso: { label: "Ingresso mattina", icon: LogIn, color: "bg-emerald-600 hover:bg-emerald-700" },
  pausa_inizio: { label: "Inizio pausa pranzo", icon: Coffee, color: "bg-amber-500 hover:bg-amber-600" },
  pausa_fine: { label: "Fine pausa pranzo", icon: PlayCircle, color: "bg-blue-600 hover:bg-blue-700" },
  uscita: { label: "Fine giornata", icon: LogOut, color: "bg-rose-600 hover:bg-rose-700" },
};

const ORDINE = ["ingresso", "pausa_inizio", "pausa_fine", "uscita"];

function arrotondaQuarti(ms) {
  if (!ms || ms < 0) return 0;
  const ore = ms / 3600000;
  return Math.round(ore * 4) / 4;
}

function fmtOre(oreQuarti) {
  if (!oreQuarti || oreQuarti <= 0) return "0h";
  const h = Math.floor(oreQuarti);
  const min = Math.round((oreQuarti - h) * 60);
  if (min === 0) return `${h}h`;
  return `${h}h ${min}min`;
}

export default function TimbraturaRapportino({ cantiere, rapportinoId, onEnsureDraft, onChange }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: timbrature = [], isLoading } = useQuery({
    queryKey: ["timbrature", rapportinoId],
    queryFn: () => base44.entities.Timbratura.filter({ rapportino_id: rapportinoId }),
    enabled: !!rapportinoId,
  });

  const timbratureOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const tipiFatti = new Set(timbratureOrd.map((t) => t.tipo_evento));
  const prossimoStep = ORDINE.find((s) => !tipiFatti.has(s)) || null;

  const getT = (tipo) => timbratureOrd.find((t) => t.tipo_evento === tipo);
  const t_ingresso = getT("ingresso");
  const t_pausa_inizio = getT("pausa_inizio");
  const t_pausa_fine = getT("pausa_fine");
  const t_uscita = getT("uscita");

  const oreMattina = arrotondaQuarti(t_ingresso && t_pausa_inizio ? new Date(t_pausa_inizio.data_ora) - new Date(t_ingresso.data_ora) : 0);
  const orePomeriggio = arrotondaQuarti(t_pausa_fine && t_uscita ? new Date(t_uscita.data_ora) - new Date(t_pausa_fine.data_ora) : 0);
  const durataPausa = arrotondaQuarti(t_pausa_inizio && t_pausa_fine ? new Date(t_pausa_fine.data_ora) - new Date(t_pausa_inizio.data_ora) : 0);
  const oreTotaliHours = oreMattina + orePomeriggio;

  // Auto-aggiorna ore_totali_squadra nel rapportino quando la giornata è completa
  useEffect(() => {
    if (t_uscita && oreTotaliHours > 0 && onChange) {
      onChange({ ore_totali_squadra: oreTotaliHours });
    }
  }, [t_uscita?.id, oreTotaliHours]);

  const handleTimbra = async (tipoEvento) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      let rId = rapportinoId;
      if (!rId && onEnsureDraft) rId = await onEnsureDraft();
      if (!rId) throw new Error("Salva il rapportino prima di timbrare");
      if (!user) throw new Error("Utente non autenticato");

      const pos = await getPosizione();

      let distanza = null;
      let inCantiere = true;
      if (cantiere?.latitudine && cantiere?.longitudine) {
        distanza = distanzaM(pos.lat, pos.lon, cantiere.latitudine, cantiere.longitudine);
        inCantiere = distanza <= (cantiere.raggio_metri || 150);
      }

      const now = new Date().toISOString();
      await base44.entities.Timbratura.create({
        cantiere_id: cantiere.id,
        cantiere_nome: cantiere.nome,
        rapportino_id: rId,
        user_email: user.email,
        user_nome: user.full_name || "",
        tipo_evento: tipoEvento,
        data_ora: now,
        latitudine: pos.lat,
        longitudine: pos.lon,
        distanza_metri: distanza,
        in_cantiere: inCantiere,
      });

      queryClient.invalidateQueries({ queryKey: ["timbrature", rId] });
      setSuccessMsg(`${STEP_CONFIG[tipoEvento].label} registrata alle ${format(new Date(), "HH:mm")}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const giornataCompleta = !!t_uscita;

  return (
    <Card className="p-5 space-y-4 border-primary/20">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">Timbratura</h2>
      </div>

      {t_ingresso && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-lg font-bold text-primary">{fmtOre(oreTotaliHours)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Ore squadra</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-center">
            <p className="text-lg font-bold text-amber-600">{fmtOre(oreMattina)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Mattina</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-lg font-bold text-blue-600">{fmtOre(orePomeriggio)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Pomeriggio</p>
          </div>
        </div>
      )}

      {!isLoading && prossimoStep && (
        <div className="space-y-2">
          <Button
            onClick={() => handleTimbra(prossimoStep)}
            disabled={loading}
            className={`w-full h-14 text-base font-semibold gap-2 ${STEP_CONFIG[prossimoStep].color}`}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              (() => { const Icon = STEP_CONFIG[prossimoStep].icon; return <Icon className="w-5 h-5" />; })()
            )}
            {STEP_CONFIG[prossimoStep].label}
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            Registra automaticamente orario e posizione GPS
          </p>
        </div>
      )}

      {giornataCompleta && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-emerald-900">Giornata completata</p>
            <p className="text-xs text-emerald-700">
              Totale: {fmtOre(oreTotaliHours)} • Pausa: {fmtOre(durataPausa)} • Ore squadra aggiornate automaticamente
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-700">{successMsg}</p>
        </div>
      )}

      {timbratureOrd.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Storico</p>
          {timbratureOrd.map((t) => {
            const cfg = STEP_CONFIG[t.tipo_evento] || {};
            const Icon = cfg.icon || Clock;
            return (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{cfg.label || t.tipo_evento}</p>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(t.data_ora), "HH:mm", { locale: it })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.in_cantiere === false && (
                    <Badge variant="destructive" className="text-[9px] gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> Fuori cantiere
                    </Badge>
                  )}
                  {t.distanza_metri != null && (
                    <a href={`https://www.google.com/maps?q=${t.latitudine},${t.longitudine}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary">
                      <MapPin className="w-3 h-3" /> {t.distanza_metri}m
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}