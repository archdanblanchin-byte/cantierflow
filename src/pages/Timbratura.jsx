import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  MapPin, Loader2, Clock, LogIn, Coffee, PlayCircle, LogOut, Navigation,
  AlertTriangle, CheckCircle2, Plus, FileText, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { distanzaM, getPosizione, STEP_CONFIG, arrotondaQuarti, fmtOre } from "@/lib/timbratureUtils";
import { calcolaOrePerCantiere, generaRapportiniDaGiornata } from "@/lib/rapportiniFromTimbrature";
import { getRuoloLabel } from "@/lib/permissions";
import NewCantiereModal from "@/components/wizard/NewCantiereModal";
import BottomNav from "@/components/BottomNav";

export default function Timbratura() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingTipo, setLoadingTipo] = useState(null);
  const [error, setError] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [eliminando, setEliminando] = useState(null);
  const isAdmin = user?.role === "admin";
  const [lastTimbro, setLastTimbro] = useState(null);
  const [selectedCantiereId, setSelectedCantiereId] = useState("");
  const [showNewCantiere, setShowNewCantiere] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const oggi = new Date();
  const inizio = new Date(oggi); inizio.setHours(0, 0, 0, 0);
  const fine = new Date(oggi); fine.setHours(23, 59, 59, 999);
  const giornoKey = format(inizio, "yyyy-MM-dd");

  const { data: cantieri = [], refetch: refetchCantieri } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list(),
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timbrature-giornata", user?.email, giornoKey],
    queryFn: () => base44.entities.Timbratura.filter({
      user_email: user.email,
      data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
    }),
    enabled: !!user,
  });

  const timbratureOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

  // Trova sessione attiva: ultimo ingresso senza uscita/spostamento successivo
  let activeSession = null;
  for (let i = timbratureOrd.length - 1; i >= 0; i--) {
    if (timbratureOrd[i].tipo_evento === "ingresso") {
      const after = timbratureOrd.slice(i + 1);
      const closed = after.some((t) => t.tipo_evento === "uscita" || t.tipo_evento === "spostamento");
      if (!closed) activeSession = { ingresso: timbratureOrd[i], events: after };
      break;
    }
  }

  const activeCantiere = activeSession
    ? cantieri.find((c) => c.id === activeSession.ingresso.cantiere_id) || { id: activeSession.ingresso.cantiere_id, nome: activeSession.ingresso.cantiere_nome }
    : null;
  const inPausa = activeSession
    ? activeSession.events.some((t) => t.tipo_evento === "pausa_inizio") && !activeSession.events.some((t) => t.tipo_evento === "pausa_fine")
    : false;

  const calcolaOre = () => {
    if (!activeSession) return 0;
    const tIn = new Date(activeSession.ingresso.data_ora);
    let pausaMs = 0;
    let pIn = null;
    activeSession.events.forEach((t) => {
      if (t.tipo_evento === "pausa_inizio") pIn = new Date(t.data_ora);
      else if (t.tipo_evento === "pausa_fine" && pIn) { pausaMs += new Date(t.data_ora) - pIn; pIn = null; }
    });
    if (inPausa && pIn) return arrotondaQuarti(pIn - tIn);
    return arrotondaQuarti((new Date() - tIn) - pausaMs);
  };
  const oreInCorso = calcolaOre();
  const orePerCantiere = calcolaOrePerCantiere(timbratureOrd).filter((c) => c.ore > 0);

  const canIngresso = !activeSession;
  const canPausa = !!activeSession;
  const canClose = !!activeSession && !inPausa;

  const handleTimbra = async (tipoEvento) => {
    setLoadingTipo(tipoEvento);
    setError(null);
    try {
      if (!user) throw new Error("Utente non autenticato");
      let cantiere = activeCantiere;
      if (tipoEvento === "ingresso") {
        if (!selectedCantiereId) { setError("Seleziona un cantiere"); setLoadingTipo(null); return; }
        cantiere = cantieri.find((c) => c.id === selectedCantiereId);
      }
      if (!cantiere) throw new Error("Cantiere non valido");
      const pos = await getPosizione();
      let distanza = null;
      let inCantiere = true;
      if (cantiere.latitudine && cantiere.longitudine) {
        distanza = distanzaM(pos.lat, pos.lon, cantiere.latitudine, cantiere.longitudine);
        inCantiere = distanza <= (cantiere.raggio_metri || 150);
      }
      const record = await base44.entities.Timbratura.create({
        cantiere_id: cantiere.id,
        cantiere_nome: cantiere.nome,
        rapportino_id: null,
        user_email: user.email,
        user_nome: user.full_name || "",
        tipo_evento: tipoEvento,
        data_ora: new Date().toISOString(),
        latitudine: pos.lat,
        longitudine: pos.lon,
        distanza_metri: distanza,
        in_cantiere: inCantiere,
      });
      setLastTimbro(record);
      if (!inCantiere && cantiere.latitudine) {
        setError(`Posizione fuori cantiere! Sei a ${distanza}m (massimo: ${cantiere.raggio_metri || 150}m).`);
      }
      if (tipoEvento === "ingresso") setSelectedCantiereId("");
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata", user.email, giornoKey] });
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornaliere"] });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTipo(null);
    }
  };

  const handleGeneraRapportini = async () => {
    if (!user) return;
    setGenerando(true);
    try {
      const esistenti = await base44.entities.Rapportino.filter({ user_email: user.email });
      const creati = await generaRapportiniDaGiornata({
        user,
        giorno: inizio,
        timbrature: timbratureOrd,
        rapportiniEsistenti: esistenti,
      });
      queryClient.invalidateQueries({ queryKey: ["rapportini"] });
      if (creati.length === 0) {
        toast.info("Nessun nuovo rapportino: esistono già bozze per questi cantieri");
      } else {
        toast.success(
          `Creat${creati.length === 1 ? "o" : "i"} ${creati.length} rapportin${creati.length === 1 ? "o" : "i"} in bozza`
        );
      }
    } catch (e) {
      toast.error("Errore: " + e.message);
    } finally {
      setGenerando(false);
    }
  };

  const handleEliminaTimbro = async (t) => {
    try {
      await base44.entities.Timbratura.delete(t.id);
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata", user.email, giornoKey] });
      toast.success("Timbratura eliminata");
    } catch (e) {
      toast.error("Errore: " + e.message);
    } finally {
      setEliminando(null);
    }
  };

  const pausaTipo = inPausa ? "pausa_fine" : "pausa_inizio";
  const pausaLabel = inPausa ? "Riprendi lavoro" : "Pausa pranzo";
  const PausaIcon = inPausa ? PlayCircle : Coffee;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Timbratura</h1>
              <p className="text-xs text-muted-foreground capitalize">{format(oggi, "EEEE d MMMM", { locale: it })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Utente */}
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

        {/* Selezione cantiere (solo se nessuna sessione attiva) */}
        {!activeSession && (
          <Card className="p-4 space-y-3 border-primary/20">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere</Label>
              <div className="flex gap-2 mt-1.5">
                <Select value={selectedCantiereId} onValueChange={setSelectedCantiereId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Seleziona cantiere..." /></SelectTrigger>
                  <SelectContent>
                    {cantieri.filter((c) => c.attivo !== false).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowNewCantiere(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Sessione attiva */}
        {activeSession && activeCantiere && (
          <Card className="p-4 space-y-3 border-primary/20">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">{activeCantiere.nome}</p>
              <Badge className={inPausa ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-emerald-100 text-emerald-700 border-emerald-300"}>
                {inPausa ? "In pausa" : "In lavoro"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-primary/10 p-3 text-center">
                <p className="text-xl font-bold text-primary">{fmtOre(oreInCorso)}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Ore in corso</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">{format(new Date(activeSession.ingresso.data_ora), "HH:mm")}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Inizio</p>
              </div>
            </div>
          </Card>
        )}

        {/* 4 Bottoni */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleTimbra("ingresso")}
            disabled={!!loadingTipo || !canIngresso}
            className="h-14 text-sm font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {loadingTipo === "ingresso" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Inizia lavoro
          </Button>
          <Button
            onClick={() => handleTimbra(pausaTipo)}
            disabled={!!loadingTipo || !canPausa}
            className={`h-14 text-sm font-semibold gap-1.5 ${inPausa ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-500 hover:bg-amber-600"}`}
          >
            {loadingTipo === pausaTipo ? <Loader2 className="w-5 h-5 animate-spin" /> : <PausaIcon className="w-5 h-5" />}
            {pausaLabel}
          </Button>
          <Button
            onClick={() => handleTimbra("spostamento")}
            disabled={!!loadingTipo || !canClose}
            className="h-14 text-sm font-semibold gap-1.5 bg-orange-500 hover:bg-orange-600"
          >
            {loadingTipo === "spostamento" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
            Spostamento
          </Button>
          <Button
            onClick={() => handleTimbra("uscita")}
            disabled={!!loadingTipo || !canClose}
            className="h-14 text-sm font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700"
          >
            {loadingTipo === "uscita" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            Chiudi giornata
          </Button>
        </div>

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
              <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {lastTimbro.cantiere_nome}</p>
              <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {lastTimbro.latitudine?.toFixed(5)}, {lastTimbro.longitudine?.toFixed(5)}</p>
              {lastTimbro.distanza_metri != null && (
                <p>Distanza:{" "}
                  <span className={lastTimbro.in_cantiere ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>{lastTimbro.distanza_metri}m</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Giornata completata */}
        {!activeSession && timbratureOrd.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-emerald-900">Nessuna sessione attiva</p>
              <p className="text-xs text-emerald-700">Seleziona un cantiere e premi Inizio per iniziare</p>
            </div>
          </div>
        )}

        {/* Storico giornata */}
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
                        {format(new Date(t.data_ora), "HH:mm", { locale: it })} · {t.cantiere_nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.in_cantiere === false && (
                      <Badge variant="destructive" className="text-[9px] gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Fuori</Badge>
                    )}
                    {t.distanza_metri != null && t.distanza_metri > 5000 && (
                      <Badge variant="destructive" className="text-[9px] gap-0.5 bg-orange-100 text-orange-800 border-orange-300"><MapPin className="w-2.5 h-2.5" /> &gt;5km</Badge>
                    )}
                    {t.in_cantiere === true && (
                      <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-300">OK</Badge>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setEliminando(t)} title="Elimina timbratura">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Genera rapportini dalla giornata */}
        {orePerCantiere.length > 0 && (
          <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Genera rapportini dalla giornata</p>
            </div>
            <div className="space-y-1.5">
              {orePerCantiere.map((c) => (
                <div key={c.cantiere_id} className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate flex-1">{c.cantiere_nome}</span>
                  <span className="text-muted-foreground ml-2">{fmtOre(c.ore)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGeneraRapportini} disabled={generando} className="flex-1 gap-2">
                {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {generando ? "Generazione..." : "Genera rapportini"}
              </Button>
              <Button variant="outline" onClick={() => navigate("/rapportini")}>
                Vai a rapportini
              </Button>
            </div>
          </Card>
        )}
      </div>

      <NewCantiereModal
        open={showNewCantiere}
        onClose={() => setShowNewCantiere(false)}
        onCreated={(c) => { refetchCantieri(); setSelectedCantiereId(c.id); }}
      />
      <AlertDialog open={!!eliminando} onOpenChange={(o) => !o && setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la timbratura?</AlertDialogTitle>
            <AlertDialogDescription>
              {eliminando && `${STEP_CONFIG[eliminando.tipo_evento]?.label || eliminando.tipo_evento} del ${format(new Date(eliminando.data_ora), "dd/MM/yyyy HH:mm")}. Operazione irreversibile.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleEliminaTimbro(eliminando)}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BottomNav />
    </div>
  );
}