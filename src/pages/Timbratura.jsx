import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import SheetSelect from "@/components/ui/sheet-select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MapPin, Loader2, Clock, LogIn, Coffee, PlayCircle, LogOut,
  AlertTriangle, CheckCircle2, FileText, Trash2, Pencil, Calendar, Users, Navigation } from
"lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { getPosizione, getCapannone, valutaPosizione, kmTraCantieri, STEP_CONFIG, arrotondaQuarti, fmtOre } from "@/lib/timbratureUtils";
import { calcolaOrePerCantiere, classificaSpostamentiGiornata, minutiScopertiGiornata } from "@/lib/rapportiniFromTimbrature";
import { getRuoloLabel } from "@/lib/permissions";
import NewCantiereModal from "@/components/wizard/NewCantiereModal";
import CantierePickerDialog from "@/components/timbrature/CantierePickerDialog";
import NotaSpostamentoLavorativo from "@/components/timbrature/NotaSpostamentoLavorativo";
import ConfermaPosizioneDialog from "@/components/timbrature/ConfermaPosizioneDialog";
import DomandeGuidaDialog from "@/components/timbrature/DomandeGuidaDialog";

// Finestra di tempo entro cui un utente può annullare/modificare un timbro accidentale (1 ora)
const UNDO_WINDOW_MS = 60 * 60 * 1000;
const canUndo = (t) => {
  if (!t) return false;
  const ref = t.created_date || t.data_ora;
  return Date.now() - new Date(ref).getTime() < UNDO_WINDOW_MS;
};

export default function Timbratura() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingTipo, setLoadingTipo] = useState(null);
  const [error, setError] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState({ cantiere_id: "", tipo_evento: "ingresso", data_ora: "" });
  const isAdmin = user?.role === "admin";
  // Admin e responsabile tecnico possono accedere alla vista "Tutte le timbrature"
  // in una pagina separata (non mischiata con la vista personale del giorno).
  const canAccessTutte = isAdmin || user?.role === "responsabile_tecnico";
  const [lastTimbro, setLastTimbro] = useState(null);
  const [showNewCantiere, setShowNewCantiere] = useState(false);
  // Apertura lavoro in attesa della scelta del cantiere nel picker dialog
  const [pendingCantiereAction, setPendingCantiereAction] = useState(null);
  // Conferma posizione (al capannone o fuori raggio) prima di registrare il timbro
  const [confermaPosizione, setConfermaPosizione] = useState(null);
  // Domande guidate alla chiusura del cantiere
  const [domandeGuida, setDomandeGuida] = useState(null);

  useEffect(() => {base44.auth.me().then(setUser).catch(() => {});}, []);

  const oggi = new Date();
  const inizio = new Date(oggi);inizio.setHours(0, 0, 0, 0);
  const fine = new Date(oggi);fine.setHours(23, 59, 59, 999);
  const giornoKey = format(inizio, "yyyy-MM-dd");

  const { data: cantieri = [], refetch: refetchCantieri } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list()
  });

  const { data: collaboratoriList = [] } = useQuery({
    queryKey: ["collaboratori"],
    queryFn: () => base44.entities.Collaboratore.list()
  });

  const { data: configTrasferta = [] } = useQuery({
    queryKey: ["config-trasferta"],
    queryFn: () => base44.entities.ConfigurazioneTrasferta.list()
  });
  const capannone = getCapannone(configTrasferta[0]);

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timbrature-giornata", user?.email, giornoKey],
    queryFn: () => base44.entities.Timbratura.filter({
      user_email: user.email,
      data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() }
    }),
    enabled: !!user
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

  const activeCantiere = activeSession ?
  cantieri.find((c) => c.id === activeSession.ingresso.cantiere_id) || { id: activeSession.ingresso.cantiere_id, nome: activeSession.ingresso.cantiere_nome } :
  null;
  const inPausa = activeSession ?
  activeSession.events.some((t) => t.tipo_evento === "pausa_inizio") && !activeSession.events.some((t) => t.tipo_evento === "pausa_fine") :
  false;

  // Pausa pranzo già fatta oggi: il pulsante non deve essere riutilizzabile
  const pausaFatta = timbratureOrd.some((t) => t.tipo_evento === "pausa_inizio");

  // Ultimo timbro della giornata (per eventuale annullamento rapido)
  const ultimoTimbro = timbratureOrd.length > 0 ? timbratureOrd[timbratureOrd.length - 1] : null;

  const calcolaOre = () => {
    if (!activeSession) return 0;
    const tIn = new Date(activeSession.ingresso.data_ora);
    let pausaMs = 0;
    let pIn = null;
    activeSession.events.forEach((t) => {
      if (t.tipo_evento === "pausa_inizio") pIn = new Date(t.data_ora);else
      if (t.tipo_evento === "pausa_fine" && pIn) {pausaMs += new Date(t.data_ora) - pIn;pIn = null;}
    });
    if (inPausa && pIn) return arrotondaQuarti(pIn - tIn);
    return arrotondaQuarti(new Date() - tIn - pausaMs);
  };
  const oreInCorso = calcolaOre();
  const orePerCantiere = calcolaOrePerCantiere(timbratureOrd).filter((c) => c.ore > 0);

  // Spostamenti tra cantieri della giornata, con i km stimati tra i due cantieri
  const spostamentiOggi = (() => {
    const out = [];
    timbratureOrd.forEach((t, i) => {
      if (t.tipo_evento !== "uscita") return;
      const next = timbratureOrd.slice(i + 1).find((x) => x.tipo_evento === "ingresso");
      if (!next || next.cantiere_id === t.cantiere_id) return;
      const km = kmTraCantieri(
        cantieri.find((c) => c.id === t.cantiere_id),
        cantieri.find((c) => c.id === next.cantiere_id)
      );
      out.push({
        da: t.cantiere_nome,
        a: next.cantiere_nome,
        min: Math.round((new Date(next.data_ora) - new Date(t.data_ora)) / 60000),
        km
      });
    });
    return out;
  })();

  // Totali giornata con regola delle 8 ore: se il totale lavorato (esclusi
  // gli spostamenti) è inferiore a 8h, gli spostamenti contano come ore
  // lavorative; se raggiunge o supera le 8h, contano come trasferta.
  const classGiornata = classificaSpostamentiGiornata(timbratureOrd);
  const totLavorazione = classGiornata.totLavorazione;
  const totSpostamento = classGiornata.totSpostamento;
  const spostamentoTipo = classGiornata.spostamentoTipo; // 'lavorative' | 'trasferta'
  const isTrasferta = spostamentoTipo === "trasferta";
  // Se trasferta: il totale lavorativo è solo la lavorazione; lo spostamento è separato.
  // Se lavorative: il totale include anche lo spostamento.
  const totGiornaliero = isTrasferta ? totLavorazione : totLavorazione + totSpostamento;
  // Pausa pranzo totale giornaliera (NON conteggiata nelle ore lavorative, solo visibile)
  const totPausa = (() => {
    let ms = 0; let pIn = null;
    timbratureOrd.forEach((t) => {
      if (t.tipo_evento === "pausa_inizio") pIn = new Date(t.data_ora);
      else if (t.tipo_evento === "pausa_fine" && pIn) { ms += new Date(t.data_ora) - pIn; pIn = null; }
    });
    if (inPausa && pIn) ms += new Date() - pIn;
    return arrotondaQuarti(ms);
  })();



  // Il rapportino unico di cantiere e giornata si crea al primo ingresso e si
  // riallinea da solo a ogni timbratura della squadra (anche di altri operatori).
  // Il calcolo gira sul server: così chi timbra dopo non crea un doppione.
  const aggiornaRapportino = async (giorno) => {
    try {
      const g = giorno ? new Date(giorno) : new Date();
      const i = new Date(g);i.setHours(0, 0, 0, 0);
      const f = new Date(g);f.setHours(23, 59, 59, 999);
      await base44.functions.invoke("sync_rapportini_giornata", {
        inizio: i.toISOString(),
        fine: f.toISOString()
      });
      queryClient.invalidateQueries({ queryKey: ["rapportini"] });
    } catch (e) {
      // il rapportino si riallinea al prossimo timbro
    }
  };

  const registraTimbro = async (tipoEvento, cantiere, { pos, v, extra = {} } = {}) => {
    const record = await base44.entities.Timbratura.create({
      cantiere_id: cantiere.id,
      cantiere_nome: cantiere.nome,
      rapportino_id: null,
      user_email: user.email,
      user_nome: user.full_name || "",
      tipo_evento: tipoEvento,
      data_ora: new Date().toISOString(),
      latitudine: pos?.lat ?? null,
      longitudine: pos?.lon ?? null,
      distanza_metri: v?.distanza ?? null,
      in_cantiere: v ? v.entroRaggio : true,
      ...extra
    });
    setLastTimbro(record);
    if (v && v.distanza != null && !v.entroRaggio) {
      setError(`Posizione fuori cantiere: sei a ${(v.distanza / 1000).toFixed(1)} km dal cantiere (raggio ${(v.raggio / 1000).toFixed(1)} km).`);
    }
    queryClient.invalidateQueries({ queryKey: ["timbrature-giornata", user.email, giornoKey] });
    queryClient.invalidateQueries({ queryKey: ["timbrature-giornaliere"] });
    await aggiornaRapportino(record.data_ora);
    return record;
  };

  // Avvia il lavoro: valuta la posizione e, se è al capannone o fuori raggio,
  // chiede conferma all'operatore prima di registrare il timbro.
  const avviaIngresso = async (cantiere) => {
    setLoadingTipo("ingresso");
    setError(null);
    try {
      if (!user) throw new Error("Utente non autenticato");
      const pos = await getPosizione().catch(() => null);
      if (!pos) toast.info("Posizione non disponibile: timbro registrato senza GPS.");
      const v = valutaPosizione(pos, cantiere, capannone);
      if (v.alCapannone || !v.entroRaggio) {
        setConfermaPosizione({
          tipo: v.alCapannone ? "capannone" : "fuori_raggio",
          azione: "ingresso",
          cantiere, distanza: v.distanza, raggio: v.raggio, pos
        });
        return;
      }
      await registraTimbro("ingresso", cantiere, { pos, v });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTipo(null);
    }
  };

  // Registra l'uscita e, se il tempo non è tutto coperto, apre le domande guidate
  const eseguiUscita = async (pos, v, extra = {}) => {
    const record = await registraTimbro("uscita", activeCantiere, { pos, v, extra });
    const timb = await base44.entities.Timbratura.filter({
      user_email: user.email,
      data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() }
    });
    const mancanti = minutiScopertiGiornata(timb);
    if (mancanti >= 30) setDomandeGuida({ timbro: record, minutiMancanti: mancanti });
  };

  // Registra il timbro confermato fuori posizione (capannone o altro luogo),
  // in ingresso o in uscita, conservando la posizione GPS del timbro: è quella
  // che determina la trasferta al posto delle coordinate del cantiere.
  const registraConfermaPosizione = async (extra) => {
    const c = confermaPosizione;
    setConfermaPosizione(null);
    setLoadingTipo(c.azione);
    const v = { distanza: c.distanza, entroRaggio: false, raggio: c.raggio };
    try {
      if (c.azione === "uscita") {
        await eseguiUscita(c.pos, v, extra);
      } else {
        await registraTimbro("ingresso", c.cantiere, { pos: c.pos, v, extra });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTipo(null);
    }
  };

  const confermaCapannone = () =>
  registraConfermaPosizione({
    confermato_capannone: true,
    lavoro_altro_luogo: true,
    luogo_lavoro: capannone.nome,
    nota: "Lavoro dal capannone per questo cantiere"
  });

  const confermaAltroLuogo = ({ luogo }) =>
  registraConfermaPosizione({
    lavoro_altro_luogo: true,
    luogo_lavoro: luogo,
    nota: `Lavoro per il cantiere da: ${luogo}`
  });

  const handlePausa = async (tipoEvento) => {
    setLoadingTipo(tipoEvento);
    setError(null);
    try {
      const pos = await getPosizione().catch(() => null);
      const v = valutaPosizione(pos, activeCantiere, capannone);
      await registraTimbro(tipoEvento, activeCantiere, { pos, v });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTipo(null);
    }
  };

  // Chiude il cantiere: se la posizione è fuori raggio (o al capannone) chiede
  // prima conferma, così anche la tratta di ritorno si basa sulla posizione reale.
  const handleUscita = async () => {
    setLoadingTipo("uscita");
    setError(null);
    try {
      if (!user) throw new Error("Utente non autenticato");
      const pos = await getPosizione().catch(() => null);
      const v = valutaPosizione(pos, activeCantiere, capannone);
      if (v.alCapannone || !v.entroRaggio) {
        setConfermaPosizione({
          tipo: v.alCapannone ? "capannone" : "fuori_raggio",
          azione: "uscita",
          cantiere: activeCantiere, distanza: v.distanza, raggio: v.raggio, pos
        });
        return;
      }
      await eseguiUscita(pos, v);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingTipo(null);
    }
  };

  // Le risposte alle domande guidate diventano la nota individuale della timbratura
  const salvaRisposteGuida = async ({ spostamento, fermata, mezzoProprio, nota }) => {
    const d = domandeGuida;
    setDomandeGuida(null);
    const parti = [];
    if (spostamento) parti.push("Tempo mancante fatto di spostamento");
    if (fermata) parti.push("Fermata in corso d'opera / acquisto materiale");
    if (mezzoProprio) parti.push("Ha usato il mezzo proprio");
    if (nota && nota.trim()) parti.push(nota.trim());
    try {
      await base44.entities.Timbratura.update(d.timbro.id, {
        nota: parti.join(" · "),
        risposte_guidata: {
          spostamento: !!spostamento,
          fermata: !!fermata,
          mezzo_proprio: !!mezzoProprio
        }
      });
      await aggiornaRapportino(d.timbro.data_ora);
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata", user.email, giornoKey] });
    } catch (e) {
      toast.error("Nota non salvata: " + e.message);
    }
  };

  // Esegue l'azione in attesa dopo che l'utente ha scelto il cantiere nel picker
  const handleCantiereScelto = async (cantiere) => {
    setPendingCantiereAction(null);
    avviaIngresso(cantiere);
  };



  const apriEdit = (t) => {
    const d = new Date(t.data_ora);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditForm({ cantiere_id: t.cantiere_id || "", tipo_evento: t.tipo_evento, data_ora: local });
    setEditando(t);
  };
  const handleSalvaEdit = async () => {
    try {
      // I non-admin possono modificare solo il tipo evento (es. correggere chiusura->spostamento),
      // non l'orario né il cantiere.
      const payload = { tipo_evento: editForm.tipo_evento };
      if (isAdmin) {
        if (!editForm.cantiere_id || !editForm.data_ora) {toast.error("Cantiere e orario obbligatori");return;}
        const cantiere = cantieri.find((c) => c.id === editForm.cantiere_id);
        payload.data_ora = new Date(editForm.data_ora).toISOString();
        payload.cantiere_id = editForm.cantiere_id;
        payload.cantiere_nome = cantiere?.nome || editando.cantiere_nome;
      }
      await base44.entities.Timbratura.update(editando.id, payload);
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata", user.email, giornoKey] });
      // Riallinea i rapportini dei giorni coinvolti (origine e destinazione)
      const giorni = [...new Set([editando.data_ora, editForm.data_ora].filter(Boolean).map((d) => new Date(d).toDateString()))];
      for (const g of giorni) await aggiornaRapportino(g);
      toast.success("Timbratura aggiornata");
      setEditando(null);
    } catch (e) {
      toast.error("Errore: " + e.message);
    }
  };

  const handleEliminaTimbro = async (t) => {
    try {
      await base44.entities.Timbratura.delete(t.id);
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata", user.email, giornoKey] });
      // Ricalcola le ore del rapportino del cantiere/giorno del timbro eliminato
      aggiornaRapportino(t.data_ora);
      toast.success("Timbratura eliminata");
    } catch (e) {
      toast.error("Errore: " + e.message);
    } finally {
      setEliminando(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Timbratura</h1>
              <p className="text-xs text-muted-foreground capitalize">{format(oggi, "EEEE d MMMM", { locale: it })}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {canAccessTutte && (
                <button
                  onClick={() => navigate("/tutte-timbrature")}
                  className="h-9 px-3 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1.5 hover:bg-primary/20 transition-colors"
                  title="Tutte le timbrature (tutti gli utenti)"
                >
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary hidden sm:inline">Tutte</span>
                </button>
              )}
              <button
                onClick={() => navigate("/storico-timbrature")}
                className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
                title="Le mie timbrature (storico)"
              >
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Utente */}
        {user &&
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
              {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
              <p className="text-[11px] text-muted-foreground">{getRuoloLabel(user.role)} · {user.email}</p>
            </div>
          </div>
        }

        {/* Sessione attiva */}
        {activeSession && activeCantiere &&
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
        }

        {/* Pannello azioni — le 4 timbrature, sempre a disposizione */}
        <div className="space-y-2">
          <Button
            onClick={() => setPendingCantiereAction("ingresso")}
            disabled={!!loadingTipo || !!activeSession}
            className="h-16 w-full text-base font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700">
            {loadingTipo === "ingresso" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Avvia lavoro in cantiere
          </Button>
          <Button
            onClick={handleUscita}
            disabled={!!loadingTipo || !activeSession}
            className="h-14 w-full text-sm font-semibold gap-2 bg-rose-600 hover:bg-rose-700">
            {loadingTipo === "uscita" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            Chiudi lavoro in cantiere
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handlePausa("pausa_inizio")}
              disabled={!!loadingTipo || !activeSession || inPausa || pausaFatta}
              className="h-14 text-xs font-semibold gap-1.5 bg-amber-500 hover:bg-amber-600">
              {loadingTipo === "pausa_inizio" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coffee className="w-4 h-4" />}
              Inizia pausa pranzo
            </Button>
            <Button
              onClick={() => handlePausa("pausa_fine")}
              disabled={!!loadingTipo || !inPausa}
              className="h-14 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700">
              {loadingTipo === "pausa_fine" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Fine pausa pranzo
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {activeSession
              ? "Per lavorare in un altro cantiere chiudi prima il lavoro: il tempo tra la chiusura e la nuova apertura viene contato automaticamente come spostamento."
              : "Lo spostamento non si timbra: il sistema lo ricava dall'intervallo tra la chiusura di un cantiere e l'apertura del successivo."}
          </p>
        </div>

        {/* Annulla ultimo timbro (entro 1 ora) */}
        {ultimoTimbro && canUndo(ultimoTimbro) &&
        <Card className="p-3 border-amber-300 bg-amber-50">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900">Annulla ultimo timbro?</p>
                <p className="text-[11px] text-amber-700 truncate">
                  {STEP_CONFIG[ultimoTimbro.tipo_evento]?.label || ultimoTimbro.tipo_evento} · {format(new Date(ultimoTimbro.data_ora), "HH:mm")} · {ultimoTimbro.cantiere_nome}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => apriEdit(ultimoTimbro)} className="gap-1.5 shrink-0 h-8">
                <Pencil className="w-3.5 h-3.5" /> Modifica
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setEliminando(ultimoTimbro)} className="gap-1.5 shrink-0 h-8">
                <Trash2 className="w-3.5 h-3.5" /> Annulla
              </Button>
            </div>
          </Card>
        }

        {/* Spostamenti di oggi: minuti e km tra un cantiere e il successivo */}
        {spostamentiOggi.length > 0 &&
        <Card className="p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Spostamenti di oggi</p>
            {spostamentiOggi.map((s, i) =>
            <div key={i} className="flex items-center gap-2 text-xs">
                <Navigation className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span className="flex-1 truncate">{s.da} → {s.a}</span>
                <span className="font-medium">{s.min} min</span>
                {s.km != null && <span className="font-semibold text-orange-600">· {s.km} km</span>}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Lo spostamento è ricavato in automatico tra la chiusura di un cantiere e l'apertura del successivo: non serve timbrarlo.
            </p>
          </Card>
        }

        {/* Riepilogo giornata con regola delle 8 ore */}
        {(totLavorazione > 0 || totSpostamento > 0) &&
        <Card className="p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Riepilogo giornata</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                <p className="text-base font-bold text-emerald-700">{fmtOre(totLavorazione)}</p>
                <p className="text-[10px] text-emerald-700/70 uppercase">Lavorazione</p>
              </div>
              <div className={`rounded-lg border p-2.5 text-center ${isTrasferta ? "bg-amber-50 border-amber-300" : "bg-orange-50 border-orange-200"}`}>
                <p className={`text-base font-bold ${isTrasferta ? "text-amber-700" : "text-orange-700"}`}>{fmtOre(totSpostamento)}</p>
                <p className={`text-[10px] uppercase ${isTrasferta ? "text-amber-700/70" : "text-orange-700/70"}`}>Spostamento</p>
              </div>
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-2.5 text-center">
                <p className="text-base font-bold text-primary">{fmtOre(totGiornaliero)}</p>
                <p className="text-[10px] text-primary/70 uppercase">Totale</p>
              </div>
            </div>
            {totSpostamento > 0 && (
            <div className={`flex items-center gap-2 rounded-lg p-2.5 text-xs font-medium ${isTrasferta ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"}`}>
              {isTrasferta ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              <span>
                {isTrasferta
                  ? <>Spostamento contato come <strong>trasferta</strong> (ore lavorate {fmtOre(totLavorazione)} ≥ 8h)</>
                  : <>Spostamento contato come <strong>ore lavorative</strong> (ore lavorate {fmtOre(totLavorazione)} &lt; 8h)</>}
              </span>
            </div>
            )}
            {totSpostamento > 0 && !isTrasferta && <NotaSpostamentoLavorativo />}
            {totPausa > 0 && (
              <p className="text-[11px] text-muted-foreground text-center">
                Pausa pranzo: <span className="font-medium">{fmtOre(totPausa)}</span> (non conteggiata nelle ore lavorative)
              </p>
            )}
          </Card>
        }

        {/* Errore */}
        {error &&
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        }

        {/* Ultimo timbro */}
        {lastTimbro && !error &&
        <div className="p-3 rounded-lg border bg-card space-y-2">
            <div className="flex items-center gap-2">
              {lastTimbro.in_cantiere ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              <p className="text-sm font-medium">{STEP_CONFIG[lastTimbro.tipo_evento]?.label || lastTimbro.tipo_evento}</p>
              <span className="text-xs text-muted-foreground ml-auto">{format(new Date(lastTimbro.data_ora), "HH:mm", { locale: it })}</span>
            </div>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {lastTimbro.cantiere_nome}</p>
              <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {lastTimbro.latitudine?.toFixed(5)}, {lastTimbro.longitudine?.toFixed(5)}</p>
              {lastTimbro.distanza_metri != null &&
            <p>Distanza:{" "}
                  <span className={lastTimbro.distanza_metri > 5000 ? "text-orange-600 font-medium" : lastTimbro.in_cantiere ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                    {(lastTimbro.distanza_metri / 1000).toFixed(lastTimbro.distanza_metri < 1000 ? 2 : 1)} km dal cantiere
                  </span>
                </p>
            }
            </div>
          </div>
        }

        {/* Giornata completata */}
        {!activeSession && timbratureOrd.length > 0 &&
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-emerald-900">Nessuna sessione attiva</p>
              <p className="text-xs text-emerald-700">Seleziona un cantiere e premi Inizio per iniziare</p>
            </div>
          </div>
        }

        {/* Storico giornata */}
        {timbratureOrd.length > 0 &&
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
                        {t.distanza_metri != null &&
                      <span className={t.distanza_metri > 5000 ? "text-orange-600 font-medium" : ""}>
                            {" · "}{(t.distanza_metri / 1000).toFixed(t.distanza_metri < 1000 ? 2 : 1)} km dal cantiere</span>
                      }
                      {t.nota && <p className="text-[11px] italic text-primary truncate">📝 {t.nota}</p>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.in_cantiere === false &&
                  <Badge variant="destructive" className="text-[9px] gap-0.5 hidden"><AlertTriangle className="w-2.5 h-2.5" /> Fuori</Badge>
                  }
                    {isAdmin && t.distanza_metri != null && t.distanza_metri > 5000 &&
                  <Badge variant="destructive" className="text-[9px] gap-0.5 bg-orange-100 text-orange-800 border-orange-300 hidden"><MapPin className="w-2.5 h-2.5" /> &gt;5km</Badge>
                  }
                    {t.in_cantiere === true &&
                  <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-300 hidden">OK</Badge>
                  }
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => apriEdit(t)} title="Modifica timbratura">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setEliminando(t)} title="Elimina timbratura">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  </div>
                </div>);

          })}
          </div>
        }

        {/* Rapportini della giornata — creati e aggiornati in automatico */}
        {timbratureOrd.length > 0 &&
        <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Rapportini della giornata</p>
            </div>
            {orePerCantiere.length > 0 &&
            <div className="space-y-1.5">
              {orePerCantiere.map((c) =>
              <div key={c.cantiere_id} className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate flex-1">{c.cantiere_nome}</span>
                  <span className="text-muted-foreground ml-2">
                    {fmtOre(c.ore)}
                    {(c.ore_spostamento || 0) > 0 && (
                      <span className="text-orange-600"> + {fmtOre(c.ore_spostamento)} spost.</span>
                    )}
                  </span>
                </div>
              )}
            </div>
            }
            <p className="text-[11px] text-muted-foreground">
              Il rapportino di ogni cantiere esiste già e si aggiorna da solo con le ore di tutta la squadra.
            </p>
            <Button onClick={() => navigate("/rapportini")} className="w-full gap-2">
              <FileText className="w-4 h-4" /> Vai al rapportino
            </Button>
          </Card>
        }
      </div>

      <ConfermaPosizioneDialog
        open={!!confermaPosizione}
        tipo={confermaPosizione?.tipo}
        cantiere={confermaPosizione?.cantiere}
        distanza={confermaPosizione?.distanza}
        raggio={confermaPosizione?.raggio}
        loading={!!loadingTipo}
        onConfermaCapannone={confermaCapannone}
        onConfermaAltroLuogo={confermaAltroLuogo}
        onCambiaCantiere={() => { setConfermaPosizione(null); setPendingCantiereAction("ingresso"); }}
        onClose={() => setConfermaPosizione(null)}
      />

      <DomandeGuidaDialog
        open={!!domandeGuida}
        minutiMancanti={domandeGuida?.minutiMancanti}
        onConferma={salvaRisposteGuida}
        onSalta={() => setDomandeGuida(null)}
      />

      <CantierePickerDialog
        open={!!pendingCantiereAction}
        onClose={() => setPendingCantiereAction(null)}
        onConfirm={handleCantiereScelto}
        cantieri={cantieri}
        title="In quale cantiere inizi a lavorare?"
        loading={!!loadingTipo}
        onNewCantiere={() => setShowNewCantiere(true)}
      />
      <NewCantiereModal
        open={showNewCantiere}
        onClose={() => setShowNewCantiere(false)}
        onCreated={(c) => {
          refetchCantieri();
          // Se c'era un'azione in attesa nel picker, usa subito il nuovo cantiere
          if (pendingCantiereAction) {
            setPendingCantiereAction(null);
            avviaIngresso(c);
          }
        }} />
      
      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica timbratura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Cantiere {!isAdmin && <span className="text-[10px] text-muted-foreground">(non modificabile)</span>}</Label>
              <SheetSelect
                value={editForm.cantiere_id}
                onValueChange={(v) => setEditForm((f) => ({ ...f, cantiere_id: v }))}
                options={cantieri.map((c) => ({ value: c.id, label: c.nome }))}
                placeholder="Seleziona cantiere"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo evento</Label>
              <SheetSelect
                value={editForm.tipo_evento}
                onValueChange={(v) => setEditForm((f) => ({ ...f, tipo_evento: v }))}
                options={[
                  { value: "ingresso", label: "Ingresso" },
                  { value: "pausa_inizio", label: "Pausa inizio" },
                  { value: "pausa_fine", label: "Pausa fine" },
                  { value: "spostamento", label: "Spostamento" },
                  { value: "uscita", label: "Uscita" },
                ]}
                placeholder="Seleziona..."
              />
            </div>
            <div className="space-y-1">
              <Label>Data e ora {!isAdmin && <span className="text-[10px] text-muted-foreground">(non modificabile)</span>}</Label>
              <Input type="datetime-local" value={editForm.data_ora} onChange={(e) => setEditForm((f) => ({ ...f, data_ora: e.target.value }))} disabled={!isAdmin} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Annulla</Button>
            <Button onClick={handleSalvaEdit}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    </div>);

}