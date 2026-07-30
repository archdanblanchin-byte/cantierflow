import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin, Loader2, Clock, LogIn, Coffee, PlayCircle, LogOut, Navigation,
  AlertTriangle, CheckCircle2, User, X,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { distanzaM, getPosizione, STEP_CONFIG, arrotondaQuarti, fmtOre } from "@/lib/timbratureUtils";
import { getRuoloLabel } from "@/lib/permissions";

export default function TimbraturaRapportino({ cantiere, cantieri, rapportinoId, onEnsureDraft, onChange }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loadingTipo, setLoadingTipo] = useState(null);
  const [error, setError] = useState(null);
  const [lastTimbro, setLastTimbro] = useState(null);
  const [showSpostamento, setShowSpostamento] = useState(false);
  const [destinazione, setDestinazione] = useState("");
  const [mezzoProprio, setMezzoProprio] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const oggi = new Date();
  const inizio = new Date(oggi); inizio.setHours(0, 0, 0, 0);
  const fine = new Date(oggi); fine.setHours(23, 59, 59, 999);
  const giornoKey = format(inizio, "yyyy-MM-dd");

  const { data: timbrature = [], isLoading } = useQuery({
    queryKey: ["timbrature-giornata-cantiere", user?.email, cantiere?.id, giornoKey],
    queryFn: () => base44.entities.Timbratura.filter({
      user_email: user.email,
      cantiere_id: cantiere.id,
      data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
    }),
    enabled: !!user && !!cantiere?.id,
  });

  // Collegamento automatico timbrature orfane al rapportino
  useEffect(() => {
    if (!rapportinoId || !user || !cantiere?.id) return;
    const orfane = timbrature.some((t) => t.rapportino_id !== rapportinoId);
    if (!orfane) return;
    base44.entities.Timbratura.updateMany(
      {
        user_email: user.email,
        cantiere_id: cantiere.id,
        data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
        rapportino_id: { $ne: rapportinoId },
      },
      { $set: { rapportino_id: rapportinoId } }
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata-cantiere", user.email, cantiere.id, giornoKey] });
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornaliere"] });
    }).catch(() => {});
  }, [rapportinoId, timbrature.length]);

  const timbratureOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const getT = (tipo) => timbratureOrd.find((t) => t.tipo_evento === tipo);
  const t_ingresso = getT("ingresso");
  const t_pausa_inizio = getT("pausa_inizio");
  const t_pausa_fine = getT("pausa_fine");
  const t_uscita = getT("uscita");

  const pausaInCorso = t_pausa_inizio && !t_pausa_fine;
  const giornataCompleta = !!t_uscita;

  // Disponibilità bottoni
  const canIngresso = !t_ingresso && !t_uscita;
  const canPausa = t_ingresso && !t_uscita;
  const canSpostamento = t_ingresso && !t_uscita && !pausaInCorso;
  const canUscita = t_ingresso && !t_uscita && !pausaInCorso;

  // Calcolo ore
  const calcolaOreTotali = () => {
    if (!t_ingresso) return 0;
    const end = t_uscita ? new Date(t_uscita.data_ora) : new Date();
    if (t_pausa_inizio && t_pausa_fine) {
      return arrotondaQuarti(new Date(t_pausa_inizio.data_ora) - new Date(t_ingresso.data_ora)) + arrotondaQuarti(end - new Date(t_pausa_fine.data_ora));
    }
    if (pausaInCorso) {
      return arrotondaQuarti(new Date(t_pausa_inizio.data_ora) - new Date(t_ingresso.data_ora));
    }
    return arrotondaQuarti(end - new Date(t_ingresso.data_ora));
  };
  const oreTotaliHours = calcolaOreTotali();
  const durataPausa = arrotondaQuarti(t_pausa_inizio && t_pausa_fine ? new Date(t_pausa_fine.data_ora) - new Date(t_pausa_inizio.data_ora) : 0);

  useEffect(() => {
    if (t_uscita && oreTotaliHours > 0 && onChange) {
      onChange({ ore_totali_squadra: oreTotaliHours });
    }
  }, [t_uscita?.id, oreTotaliHours]);

  const raggio = cantiere?.raggio_metri || 150;
  const cantiereCoords = cantiere?.latitudine && cantiere?.longitudine;

  const handleTimbra = async (tipoEvento, extraData = {}) => {
    setLoadingTipo(tipoEvento);
    setError(null);
    try {
      if (!user) throw new Error("Utente non autenticato");
      let rId = rapportinoId;
      if (!rId && onEnsureDraft) {
        try { rId = await onEnsureDraft(); } catch {}
      }
      const pos = await getPosizione();
      let distanza = null;
      let inCantiere = true;
      if (cantiereCoords) {
        distanza = distanzaM(pos.lat, pos.lon, cantiere.latitudine, cantiere.longitudine);
        inCantiere = distanza <= raggio;
      }
      const now = new Date().toISOString();
      const record = await base44.entities.Timbratura.create({
        cantiere_id: cantiere.id,
        cantiere_nome: cantiere.nome,
        rapportino_id: rId || null,
        user_email: user.email,
        user_nome: user.full_name || "",
        tipo_evento: tipoEvento,
        data_ora: now,
        latitudine: pos.lat,
        longitudine: pos.lon,
        distanza_metri: distanza,
        in_cantiere: inCantiere,
        ...extraData,
      });
      setLastTimbro(record);
      if (!inCantiere && cantiereCoords) {
        setError(`Posizione fuori cantiere! Sei a ${distanza}m dal cantiere (massimo consentito: ${raggio}m). Verifica di essere sul posto.`);
      }
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata-cantiere", user.email, cantiere.id, giornoKey] });
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornaliere"] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTipo(null);
    }
  };

  const handleSpostamento = async () => {
    if (!destinazione) {
      setError("Seleziona il cantiere di destinazione");
      return;
    }
    const dest = (cantieri || []).find(c => c.id === destinazione);
    await handleTimbra("spostamento", {
      cantiere_destinazione_id: destinazione,
      cantiere_destinazione_nome: dest?.nome || "",
      mezzo_proprio: mezzoProprio,
    });
    if (!error) {
      setShowSpostamento(false);
      setDestinazione("");
      setMezzoProprio(false);
    }
  };

  const pausaTipo = pausaInCorso ? "pausa_fine" : "pausa_inizio";
  const pausaLabel = pausaInCorso ? "Fine Pausa" : "Inizio Pausa";
  const PausaIcon = pausaInCorso ? PlayCircle : Coffee;

  return (
    <Card className="p-4 space-y-4 border-primary/20">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">Timbratura</h2>
      </div>

      {/* Chi timbra */}
      {user && (
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
            {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
            <p className="text-[11px] text-muted-foreground">{getRuoloLabel(user.role)} · {user.email}</p>
          </div>
        </div>
      )}

      {/* Coordinate cantiere */}
      {cantiereCoords ? (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-xs">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">Cantiere: {cantiere.latitudine.toFixed(5)}, {cantiere.longitudine.toFixed(5)}</p>
            <p className="text-muted-foreground">Raggio accettazione: {raggio}m
              <a href={`https://www.google.com/maps?q=${cantiere.latitudine},${cantiere.longitudine}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline">→ Maps</a>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-amber-700">Il cantiere non ha coordinate GPS impostate. Impossibile validare la posizione del timbro.</p>
        </div>
      )}

      {/* Riepilogo ore */}
      {t_ingresso && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-xl font-bold text-primary">{fmtOre(oreTotaliHours)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{t_uscita ? "Ore totali" : "Ore in corso"}</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-xl font-bold">{fmtOre(durataPausa)}</p>
            <p className="text-[10px] text-muted-foreground uppercase">Pausa</p>
          </div>
        </div>
      )}

      {/* 4 Bottoni */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => handleTimbra("ingresso")}
          disabled={!!loadingTipo || !canIngresso}
          className="h-14 text-sm font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700"
        >
          {loadingTipo === "ingresso" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          Inizio Cantiere
        </Button>
        <Button
          onClick={() => handleTimbra(pausaTipo)}
          disabled={!!loadingTipo || !canPausa}
          className={`h-14 text-sm font-semibold gap-1.5 ${pausaInCorso ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-500 hover:bg-amber-600"}`}
        >
          {loadingTipo === pausaTipo ? <Loader2 className="w-5 h-5 animate-spin" /> : <PausaIcon className="w-5 h-5" />}
          {pausaLabel}
        </Button>
        <Button
          onClick={() => setShowSpostamento(true)}
          disabled={!!loadingTipo || !canSpostamento}
          className="h-14 text-sm font-semibold gap-1.5 bg-orange-500 hover:bg-orange-600"
        >
          <Navigation className="w-5 h-5" />
          Spostamento
        </Button>
        <Button
          onClick={() => handleTimbra("uscita")}
          disabled={!!loadingTipo || !canUscita}
          className="h-14 text-sm font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700"
        >
          {loadingTipo === "uscita" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
          Chiudi Cantiere
        </Button>
      </div>

      {/* Form spostamento */}
      {showSpostamento && (
        <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-orange-900">Spostamento verso</p>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSpostamento(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Select value={destinazione} onValueChange={setDestinazione}>
            <SelectTrigger className="h-9 text-sm bg-white">
              <SelectValue placeholder="Seleziona cantiere destinazione..." />
            </SelectTrigger>
            <SelectContent>
              {(cantieri || []).filter(c => c.id !== cantiere?.id && c.attivo !== false).map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-xs text-orange-900 cursor-pointer">
            <input type="checkbox" checked={mezzoProprio} onChange={e => setMezzoProprio(e.target.checked)} className="rounded" />
            Mezzo proprio
          </label>
          <Button onClick={handleSpostamento} disabled={!!loadingTipo || !destinazione} className="w-full bg-orange-600 hover:bg-orange-700 gap-2">
            {loadingTipo === "spostamento" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Conferma spostamento
          </Button>
        </div>
      )}

      {/* Errore */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      {/* Ultimo timbro */}
      {lastTimbro && !error && (
        <div className="p-3 rounded-lg border bg-card space-y-2">
          <div className="flex items-center gap-2">
            {lastTimbro.in_cantiere ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <p className="text-sm font-medium">{STEP_CONFIG[lastTimbro.tipo_evento]?.label || lastTimbro.tipo_evento}</p>
            <span className="text-xs text-muted-foreground ml-auto">{format(new Date(lastTimbro.data_ora), "HH:mm", { locale: it })}</span>
          </div>
          <div className="text-xs space-y-1 text-muted-foreground">
            <p className="flex items-center gap-1.5"><User className="w-3 h-3" /> {lastTimbro.user_nome || lastTimbro.user_email}</p>
            <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {lastTimbro.latitudine?.toFixed(5)}, {lastTimbro.longitudine?.toFixed(5)}</p>
            {lastTimbro.distanza_metri != null && (
              <p>Distanza dal cantiere:{" "}
                <span className={lastTimbro.in_cantiere ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>{lastTimbro.distanza_metri}m</span>
              </p>
            )}
            {lastTimbro.cantiere_destinazione_nome && (
              <p>Destinazione: <span className="font-medium text-foreground">{lastTimbro.cantiere_destinazione_nome}</span></p>
            )}
          </div>
          <a href={`https://www.google.com/maps?q=${lastTimbro.latitudine},${lastTimbro.longitudine}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Vedi posizione su Maps →
          </a>
        </div>
      )}

      {/* Giornata completa */}
      {giornataCompleta && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-emerald-900">Giornata completata</p>
            <p className="text-xs text-emerald-700">Totale: {fmtOre(oreTotaliHours)} • Pausa: {fmtOre(durataPausa)}</p>
          </div>
        </div>
      )}

      {/* Storico */}
      {timbratureOrd.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Storico ({timbratureOrd.length})</p>
          {timbratureOrd.map((t) => {
            const cfg = STEP_CONFIG[t.tipo_evento] || {};
            const Icon = cfg.icon || Clock;
            return (
              <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{cfg.label || t.tipo_evento}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {format(new Date(t.data_ora), "HH:mm", { locale: it })} · {t.user_nome || t.user_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {t.in_cantiere === false && (
                    <Badge variant="destructive" className="text-[9px] gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> Fuori
                    </Badge>
                  )}
                  {t.in_cantiere === true && (
                    <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-300">OK</Badge>
                  )}
                  <a href={`https://www.google.com/maps?q=${t.latitudine},${t.longitudine}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary">
                    <MapPin className="w-3 h-3" /> {t.distanza_metri != null ? `${t.distanza_metri}m` : "Maps"}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}