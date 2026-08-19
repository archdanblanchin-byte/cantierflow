# Bundle finestre CantierFlow → Workflow

Questo file contiene il codice sorgente delle **13 finestre** (pagine) principali di CantierFlow, da ricreare nell'app Workflow. Ogni sezione corrisponde a un file; ricrea lo stesso percorso/cartelle in Workflow.

## Cosa serve oltre alle pagine

Per far funzionare le pagine devi copiare anche:

**Entità (base44/entities/):** `Rapportino`, `Cantiere`, `Collaboratore`, `Furgone`, `NotaFurgone`, `Timbratura`, `Programmazione`, `Cronoprogramma`, `Trasferta`, `ConfigurazioneTrasferta`, `Foto`, `TipoLavorazione`, `MaterialeBase`, `TipoDocumento`, `AnagrafaAttrezzo`, `PermessoSezione`, `UsoFurgone`, `Ristorante`, `AnagrafaIdropulitrice`.

**Lib (src/lib/):** `permissions.js`, `timbratureUtils.js`, `rapportiniFromTimbrature.js`, `oreLavoratoriUtils.js`, `AuthContext.jsx`, `utils.js`, `query-client.js`, `app-params.js`.

**Hooks (src/hooks/):** `usePermessi.js`.

**Componenti (src/components/):** `BottomNav.jsx`, `home/ReportCard.jsx`, `foto/FotoCard.jsx`, `foto/AggiungiFotoModal.jsx`, `anagrafe/*`, `programmazione/*`, `orelavoratori/*`, `cronoprogramma/*`, `permessi/PermessiPage.jsx`, `wizard/NewCantiereModal.jsx`, `ui/*` (shadcn standard, già presente).

> I componenti UI shadcn (`Button`, `Input`, `Dialog`, `Select`, `Card`, `Badge`, `Label`, `Skeleton`, `Textarea`, `AlertDialog`, `useToast`) sono standard in ogni app Base44 e non vanno copiati.

---

## 1. src/pages/Home.jsx (Rapportini)

```jsx
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, ArrowLeft, HardHat, UserCircle } from "lucide-react";
import ReportCard from "@/components/home/ReportCard";
import { SEZIONI_APP } from "@/lib/permissions";
import { usePermessi } from "@/hooks/usePermessi";
import BottomNav from "@/components/BottomNav";

function MenuGrid() {
  const { puoVedere } = usePermessi();
  const items = SEZIONI_APP.filter(s => puoVedere(s.key));
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <HardHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Gestione Cantiere</h1>
              <p className="text-xs text-muted-foreground">Seleziona una sezione</p>
            </div>
            <Link to="/account" className="ml-auto">
              <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors">
                <UserCircle className="w-6 h-6 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-4 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group aspect-square"
            >
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold text-center leading-tight text-foreground">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function RapportiniList() {
  const navigate = useNavigate();
  const { data: rapportini = [], isLoading } = useQuery({
    queryKey: ["rapportini"],
    queryFn: () => base44.entities.Rapportino.list("-created_date", 50),
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-lg">Rapportini</h1>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "..." : `${rapportini.length} rapportin${rapportini.length === 1 ? "o" : "i"}`}
                </p>
              </div>
            </div>
            <Link to="/nuovo">
              <Button className="gap-2 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" />
                Nuovo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : rapportini.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessun rapportino</p>
            <p className="text-sm text-muted-foreground mt-1">Crea il tuo primo rapportino di cantiere</p>
            <Link to="/nuovo">
              <Button className="mt-4 gap-2"><Plus className="w-4 h-4" />Crea Rapportino</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rapportini.map((r) => <ReportCard key={r.id} report={r} />)}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default function Home({ showRapportini }) {
  if (showRapportini) return <RapportiniList />;
  return <MenuGrid />;
}
```

---

## 2. src/pages/Timbratura.jsx

```jsx
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  MapPin, Loader2, Clock, LogIn, Coffee, PlayCircle, LogOut, Navigation,
  AlertTriangle, CheckCircle2, Plus, FileText, Trash2, Pencil } from
"lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { distanzaM, getPosizione, STEP_CONFIG, arrotondaQuarti, fmtOre } from "@/lib/timbratureUtils";
import { calcolaOrePerCantiere, generaRapportiniDaGiornata, syncRapportinoOreDaTimbratura } from "@/lib/rapportiniFromTimbrature";
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
  const [editando, setEditando] = useState(null);
  const [editForm, setEditForm] = useState({ cantiere_id: "", tipo_evento: "ingresso", data_ora: "" });
  const isAdmin = user?.role === "admin";
  const [lastTimbro, setLastTimbro] = useState(null);
  const [selectedCantiereId, setSelectedCantiereId] = useState("");
  const [showNewCantiere, setShowNewCantiere] = useState(false);

  useEffect(() => {base44.auth.me().then(setUser).catch(() => {});}, []);

  const oggi = new Date();
  const inizio = new Date(oggi);inizio.setHours(0, 0, 0, 0);
  const fine = new Date(oggi);fine.setHours(23, 59, 59, 999);
  const giornoKey = format(inizio, "yyyy-MM-dd");

  const { data: cantieri = [], refetch: refetchCantieri } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list()
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timbrature-giornata", user?.email, giornoKey],
    queryFn: () => base44.entities.Timbratura.filter({
      user_email: user.email,
      data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() }
    }),
    enabled: !!user
  });

  const timbratureOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

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
        if (!selectedCantiereId) {setError("Seleziona un cantiere");setLoadingTipo(null);return;}
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
        in_cantiere: inCantiere
      });
      setLastTimbro(record);
      if (!inCantiere && cantiere.latitudine) {
        setError(`Posizione fuori cantiere! Sei a ${distanza}m (massimo: ${cantiere.raggio_metri || 150}m).`);
      }
      if (tipoEvento === "ingresso") setSelectedCantiereId("");
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata", user.email, giornoKey] });
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornaliere"] });
      syncRapportinoOreDaTimbratura({
        user_email: user.email,
        cantiere_id: cantiere.id,
        giorno: inizio,
      }).then(() => queryClient.invalidateQueries({ queryKey: ["rapportini"] }))
        .catch(() => {});
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
        rapportiniEsistenti: esistenti
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

  const apriEdit = (t) => {
    const d = new Date(t.data_ora);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditForm({ cantiere_id: t.cantiere_id || "", tipo_evento: t.tipo_evento, data_ora: local });
    setEditando(t);
  };
  const handleSalvaEdit = async () => {
    try {
      if (!editForm.cantiere_id || !editForm.data_ora) {toast.error("Cantiere e orario obbligatori");return;}
      const cantiere = cantieri.find((c) => c.id === editForm.cantiere_id);
      await base44.entities.Timbratura.update(editando.id, {
        tipo_evento: editForm.tipo_evento,
        data_ora: new Date(editForm.data_ora).toISOString(),
        cantiere_id: editForm.cantiere_id,
        cantiere_nome: cantiere?.nome || editando.cantiere_nome
      });
      queryClient.invalidateQueries({ queryKey: ["timbrature-giornata", user.email, giornoKey] });
      const cantieriDaSync = new Set([editando.cantiere_id, editForm.cantiere_id].filter(Boolean));
      await Promise.all([...cantieriDaSync].map((cid) =>
        syncRapportinoOreDaTimbratura({ user_email: editando.user_email || user.email, cantiere_id: cid, giorno: editando.data_ora })
      ));
      queryClient.invalidateQueries({ queryKey: ["rapportini"] });
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
      syncRapportinoOreDaTimbratura({
        user_email: t.user_email || user.email,
        cantiere_id: t.cantiere_id,
        giorno: t.data_ora,
      }).then(() => queryClient.invalidateQueries({ queryKey: ["rapportini"] }))
        .catch(() => {});
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

        {!activeSession &&
        <Card className="p-4 space-y-3 border-primary/20">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere</Label>
              <div className="flex gap-2 mt-1.5">
                <Select value={selectedCantiereId} onValueChange={setSelectedCantiereId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Seleziona cantiere..." /></SelectTrigger>
                  <SelectContent>
                    {cantieri.filter((c) => c.attivo !== false).map((c) =>
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  )}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowNewCantiere(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        }

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

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => handleTimbra("ingresso")}
            disabled={!!loadingTipo || !canIngresso}
            className="h-14 text-sm font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            {loadingTipo === "ingresso" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Inizia lavoro
          </Button>
          <Button
            onClick={() => handleTimbra(pausaTipo)}
            disabled={!!loadingTipo || !canPausa}
            className={`h-14 text-sm font-semibold gap-1.5 ${inPausa ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-500 hover:bg-amber-600"}`}>
            {loadingTipo === pausaTipo ? <Loader2 className="w-5 h-5 animate-spin" /> : <PausaIcon className="w-5 h-5" />}
            {pausaLabel}
          </Button>
          <Button
            onClick={() => handleTimbra("spostamento")}
            disabled={!!loadingTipo || !canClose}
            className="h-14 text-sm font-semibold gap-1.5 bg-orange-500 hover:bg-orange-600">
            {loadingTipo === "spostamento" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
            Spostamento
          </Button>
          <Button
            onClick={() => handleTimbra("uscita")}
            disabled={!!loadingTipo || !canClose}
            className="h-14 text-sm font-semibold gap-1.5 bg-rose-600 hover:bg-rose-700">
            {loadingTipo === "uscita" ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            Chiudi giornata
          </Button>
        </div>

        {error &&
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700">{error}</p>
          </div>
        }

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

        {!activeSession && timbratureOrd.length > 0 &&
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-emerald-900">Nessuna sessione attiva</p>
              <p className="text-xs text-emerald-700">Seleziona un cantiere e premi Inizio per iniziare</p>
            </div>
          </div>
        }

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
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAdmin &&
                  <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => apriEdit(t)} title="Modifica timbratura">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setEliminando(t)} title="Elimina timbratura">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                  }
                  </div>
                </div>);
          })}
          </div>
        }

        {orePerCantiere.length > 0 &&
        <Card className="p-4 space-y-3 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold">Genera rapportini dalla giornata</p>
            </div>
            <div className="space-y-1.5">
              {orePerCantiere.map((c) =>
            <div key={c.cantiere_id} className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate flex-1">{c.cantiere_nome}</span>
                  <span className="text-muted-foreground ml-2">{fmtOre(c.ore)}</span>
                </div>
            )}
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
        }
      </div>

      <NewCantiereModal
        open={showNewCantiere}
        onClose={() => setShowNewCantiere(false)}
        onCreated={(c) => {refetchCantieri();setSelectedCantiereId(c.id);}} />

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica timbratura</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Cantiere</Label>
              <Select value={editForm.cantiere_id} onValueChange={(v) => setEditForm((f) => ({ ...f, cantiere_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleziona cantiere" /></SelectTrigger>
                <SelectContent>
                  {cantieri.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo evento</Label>
              <Select value={editForm.tipo_evento} onValueChange={(v) => setEditForm((f) => ({ ...f, tipo_evento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingresso">Ingresso</SelectItem>
                  <SelectItem value="pausa_inizio">Pausa inizio</SelectItem>
                  <SelectItem value="pausa_fine">Pausa fine</SelectItem>
                  <SelectItem value="spostamento">Spostamento</SelectItem>
                  <SelectItem value="uscita">Uscita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data e ora</Label>
              <Input type="datetime-local" value={editForm.data_ora} onChange={(e) => setEditForm((f) => ({ ...f, data_ora: e.target.value }))} />
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
      <BottomNav />
    </div>);

}
```

---

## 3. src/pages/Cantieri.jsx

```jsx
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MapPin, Clock, ChevronRight, Building2, ArrowLeft } from "lucide-react";

export default function Cantieri() {
  const navigate = useNavigate();

  const { data: cantieri = [], isLoading } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list("-created_date"),
  });

  const { data: rapportini = [] } = useQuery({
    queryKey: ["rapportini"],
    queryFn: () => base44.entities.Rapportino.list(),
  });

  const orePerCantiere = (cantiereId) => {
    return rapportini
      .filter((r) => r.cantiere_id === cantiereId)
      .reduce((sum, r) => {
        const oreCollab = (r.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0);
        return sum + (oreCollab || r.ore_totali_squadra || 0);
      }, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-lg">Cantieri</h1>
                <p className="text-xs text-muted-foreground">Gestione cantieri</p>
              </div>
            </div>
            <Link to="/cantieri/nuovo">
              <Button className="gap-2 shadow-md shadow-primary/20">
                <Plus className="w-4 h-4" />
                Aggiungi
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : cantieri.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessun cantiere</p>
            <Link to="/cantieri/nuovo">
              <Button className="mt-4 gap-2"><Plus className="w-4 h-4" />Aggiungi Cantiere</Button>
            </Link>
          </div>
        ) : (
          cantieri.map((c) => {
            const ore = orePerCantiere(c.id);
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={c.attivo ? "default" : "secondary"} className="text-[10px] uppercase">
                        {c.attivo !== false ? "Attivo" : "Chiuso"}
                      </Badge>
                      {c.codice && <span className="text-[10px] text-muted-foreground font-mono">{c.codice}</span>}
                    </div>
                    <p className="font-semibold truncate">{c.nome}</p>
                    {(c.citta || c.indirizzo) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{c.citta}{c.citta && c.indirizzo ? " — " : ""}{c.indirizzo}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ore.toFixed(1)}h lavorate
                      </span>
                      {c.ore_stimate > 0 && (
                        <span>/ {c.ore_stimate}h stimate</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link to={`/cantieri/${c.id}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        Apri <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                    {c.indirizzo && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((c.indirizzo || "") + " " + (c.citta || ""))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="ghost" className="gap-1.5 text-xs w-full">
                          <MapPin className="w-3 h-3" />Mappa
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

---

## 4. src/pages/Foto.jsx

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Camera, Image } from "lucide-react";
import FotoCard from "@/components/foto/FotoCard";
import AggiungiFotoModal from "@/components/foto/AggiungiFotoModal";

export default function FotoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: foto = [], isLoading: loadingFoto } = useQuery({
    queryKey: ["foto"],
    queryFn: () => base44.entities.Foto.list("-created_date", 100),
  });

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list(),
  });

  const handleDelete = async (f) => {
    await base44.entities.Foto.delete(f.id);
    queryClient.invalidateQueries({ queryKey: ["foto"] });
  };

  const handleEdit = async (f) => {
    // Apri editor — per ora naviga al dettaglio (futuro: inline edit)
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">Foto</h1>
              <p className="text-xs text-muted-foreground">
                {loadingFoto ? "..." : `${foto.length} foto`}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Aggiungi
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loadingFoto ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
          </div>
        ) : foto.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessuna foto</p>
            <p className="text-sm text-muted-foreground mt-1">Aggiungi la prima foto o codice colore</p>
            <Button className="mt-4 gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />Aggiungi foto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {foto.map((f) => (
              <FotoCard key={f.id} foto={f} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <AggiungiFotoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        cantieri={cantieri}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["foto"] })}
      />
    </div>
  );
}
```

---

## 5. src/pages/Anagrafe.jsx

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Truck, Wrench, FileText, BookOpen, Package } from "lucide-react";
import AnagrafePage from "@/components/anagrafe/AnagrafePage";
import FurgoniPage from "@/components/anagrafe/FurgoniPage";
import LavorazioniPage from "@/components/anagrafe/LavorazioniPage";

const SEZIONI = [
  { key: "collaboratori", label: "Collaboratori", icon: Users, color: "bg-blue-500", entity: "Collaboratore", fields: [
    { key: "nome", label: "Nome", required: true },
    { key: "ruolo", label: "Ruolo" },
  ]},
  { key: "furgoni", label: "Furgoni", icon: Truck, color: "bg-yellow-500", entity: "Furgone", fields: [
    { key: "nome", label: "Nome / Targa", required: true },
    { key: "note", label: "Note" },
  ]},
  { key: "attrezzi", label: "Attrezzi", icon: Wrench, color: "bg-orange-500", entity: "AnagrafaAttrezzo", fields: [
    { key: "nome", label: "Nome attrezzo", required: true },
    { key: "note", label: "Note" },
  ]},
  { key: "documenti", label: "Documenti Tipo", icon: FileText, color: "bg-indigo-500", entity: "TipoDocumento", fields: [
    { key: "nome", label: "Nome documento", required: true },
    { key: "note", label: "Note" },
  ]},
  { key: "lavorazioni", label: "Lavorazioni", icon: BookOpen, color: "bg-emerald-500", entity: "TipoLavorazione", fields: [
    { key: "nome", label: "Nome lavorazione", required: true },
    { key: "descrizione", label: "Descrizione" },
  ]},
  { key: "materiali", label: "Materiali", icon: Package, color: "bg-amber-600", entity: "MaterialeBase", fields: [
    { key: "nome", label: "Nome materiale", required: true },
    { key: "unita_misura", label: "Unità di misura" },
  ]},
];

export default function Anagrafe() {
  const navigate = useNavigate();
  const [sezioneAttiva, setSezioneAttiva] = useState(null);

  const sezione = SEZIONI.find(s => s.key === sezioneAttiva);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => sezioneAttiva ? setSezioneAttiva(null) : navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">{sezione ? sezione.label : "Anagrafe"}</h1>
            <p className="text-xs text-muted-foreground">{sezione ? "Gestione elenco" : "Collaboratori, furgoni, attrezzi, documenti, lavorazioni e materiali"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!sezioneAttiva ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SEZIONI.map((s) => (
              <button
                key={s.key}
                onClick={() => setSezioneAttiva(s.key)}
                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group aspect-square"
              >
                <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        ) : sezioneAttiva === "furgoni" ? (
          <FurgoniPage />
        ) : sezioneAttiva === "lavorazioni" ? (
          <LavorazioniPage />
        ) : (
          <AnagrafePage sezione={sezione} />
        )}
      </div>
    </div>
  );
}
```

---

## 6. src/pages/OreLavoratori.jsx

```jsx
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Users, Route, CalendarDays, Navigation } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { it } from "date-fns/locale";
import { fmtOre, classificaTrasfertaSplit } from "@/lib/timbratureUtils";
import { buildDettaglioGiorno, calcolaSpostamenti, calcolaTrasfertaGiorno } from "@/lib/oreLavoratoriUtils";
import CalendarioMese from "@/components/orelavoratori/CalendarioMese";
import GiornoDetailDialog from "@/components/orelavoratori/GiornoDetailDialog";

export default function OreLavoratori() {
  const navigate = useNavigate();
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [mese, setMese] = useState(startOfMonth(new Date()));
  const [giornoKey, setGiornoKey] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const { data: collaboratori = [], isLoading: loadingCollab } = useQuery({
    queryKey: ["collaboratori-all"],
    queryFn: () => base44.entities.Collaboratore.list(),
  });

  const { data: rapportini = [] } = useQuery({
    queryKey: ["rapportini-all"],
    queryFn: () => base44.entities.Rapportino.list("-data", 2000),
  });

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-all"],
    queryFn: () => base44.entities.Cantiere.list(),
  });

  const { data: configTrasferta = [] } = useQuery({
    queryKey: ["config-trasferta"],
    queryFn: () => base44.entities.ConfigurazioneTrasferta.list(),
  });
  const config = configTrasferta[0] || null;

  const email = selectedCollab?.user_email || null;

  const inizioISO = startOfMonth(mese).toISOString();
  const fineISO = endOfMonth(mese).toISOString();
  const inizioStr = format(startOfMonth(mese), "yyyy-MM-dd");
  const fineStr = format(endOfMonth(mese), "yyyy-MM-dd");

  const { data: timbrature = [], isLoading: loadingTimb } = useQuery({
    queryKey: ["timbrature-mese", inizioISO, fineISO],
    queryFn: () =>
      base44.entities.Timbratura.filter(
        { data_ora: { $gte: inizioISO, $lt: fineISO } },
        "-data_ora",
        5000
      ),
    enabled: !!selectedCollab,
  });

  const { data: trasferte = [] } = useQuery({
    queryKey: ["trasferte-mese", inizioStr, fineStr],
    queryFn: () =>
      base44.entities.Trasferta.filter(
        { data: { $gte: inizioStr, $lte: fineStr } },
        "-data",
        2000
      ),
    enabled: !!selectedCollab,
  });

  const norm = (s) => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
  const matchCollab = (record) => {
    if (!selectedCollab) return false;
    const nomeCollab = norm(selectedCollab.nome);
    if (email && record.user_email === email) return true;
    if (record.user_nome && nomeCollab && norm(record.user_nome) === nomeCollab) return true;
    if (me?.email && record.user_email === me.email && me.full_name && nomeCollab && email !== me.email) {
      const f = norm(me.full_name);
      if (f === nomeCollab || (nomeCollab.length >= 3 && (f.includes(nomeCollab) || nomeCollab.includes(f)))) return true;
    }
    return false;
  };

  const vociGiornoMap = useMemo(() => {
    if (!selectedCollab) return {};
    const map = {};
    const inizio = startOfMonth(mese);
    const fine = endOfMonth(mese);
    rapportini.forEach((r) => {
      const d = new Date(r.data);
      if (d < inizio || d > fine) return;
      const key = format(d, "yyyy-MM-dd");
      (r.collaboratori || []).forEach((c) => {
        const match = c.collaboratore_id === selectedCollab.id ||
          (c.nome && selectedCollab.nome && c.nome === selectedCollab.nome);
        if (!match) return;
        if (!map[key]) map[key] = [];
        map[key].push({
          cantiere: r.cantiere_nome,
          ore: c.ore_lavorate || 0,
          stato: r.stato,
          rapportino_id: r.id,
          note_imprevisti: c.note_imprevisti || "",
        });
      });
    });
    return map;
  }, [rapportini, selectedCollab, mese]);

  const timbGiornoMap = useMemo(() => {
    const map = {};
    timbrature.forEach((t) => {
      if (!matchCollab(t)) return;
      const key = format(new Date(t.data_ora), "yyyy-MM-dd");
      (map[key] = map[key] || []).push(t);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timbrature, selectedCollab, email, mese]);

  const trasferteMap = useMemo(() => {
    const map = {};
    trasferte.forEach((t) => {
      if (!matchCollab(t)) return;
      if (!t.data) return;
      const key = format(new Date(t.data + "T00:00:00"), "yyyy-MM-dd");
      const split = classificaTrasfertaSplit(t.km_andata, t.km_ritorno, config);
      let label = split.label;
      if (t.fascia_andata && t.fascia_ritorno && t.fascia_andata !== t.fascia_ritorno) {
        label = `½ ${t.fascia_andata} + ½ ${t.fascia_ritorno}`;
      }
      map[key] = {
        tipo_trasferta: t.tipo_trasferta || split.tipo_trasferta,
        fascia_andata: t.fascia_andata || split.fascia_andata,
        fascia_ritorno: t.fascia_ritorno || split.fascia_ritorno,
        km_totali: t.km_totali ?? split.km_totali,
        km_andata: t.km_andata ?? split.km_andata,
        km_ritorno: t.km_ritorno ?? split.km_ritorno,
        primo_cantiere_nome: t.primo_cantiere_nome,
        ultimo_cantiere_nome: t.ultimo_cantiere_nome,
        mezzo_proprio: t.mezzo_proprio,
        confermata: t.confermata,
        label,
      };
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trasferte, selectedCollab, email, mese, config]);

  const giorniSintesi = useMemo(() => {
    const sintesi = {};
    const keys = new Set([...Object.keys(vociGiornoMap), ...Object.keys(timbGiornoMap), ...Object.keys(trasferteMap)]);
    keys.forEach((key) => {
      const voci = vociGiornoMap[key] || [];
      const hasNote = voci.some((v) => v.note_imprevisti);
      const oreCantieri = voci.reduce((s, v) => s + (v.ore || 0), 0);
      const timsGiorno = timbGiornoMap[key] || [];
      const spost = timsGiorno.length ? calcolaSpostamenti(timsGiorno) : [];
      const oreSpost = spost.reduce((s, sp) => s + sp.durata, 0);
      const ore = Math.round((oreCantieri + oreSpost) * 4) / 4;
      const trasfertaConfermata = trasferteMap[key];
      const trasfertaAuto = timsGiorno.length ? calcolaTrasfertaGiorno(timsGiorno, cantieri, config) : null;
      sintesi[key] = {
        ore,
        oreSpost: Math.round(oreSpost * 4) / 4,
        trasferta: trasfertaConfermata || trasfertaAuto || null,
        hasNote,
      };
    });
    return sintesi;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vociGiornoMap, timbGiornoMap, trasferteMap, cantieri, config]);

  const { totaleOreCantieri, totaleOreSpost, totaleKmMese, giorniLavoratiMese } = useMemo(() => {
    let cantieri = 0, spost = 0, km = 0, lavorati = 0;
    Object.values(giorniSintesi).forEach((s) => {
      if (s.ore > 0) lavorati++;
      cantieri += s.ore - (s.oreSpost || 0);
      spost += s.oreSpost || 0;
      if (s.trasferta?.km_totali != null) km += s.trasferta.km_totali;
    });
    return {
      totaleOreCantieri: Math.round(cantieri * 4) / 4,
      totaleOreSpost: Math.round(spost * 4) / 4,
      totaleKmMese: km,
      giorniLavoratiMese: lavorati,
    };
  }, [giorniSintesi]);

  const giornoSelezionato = giornoKey ? new Date(giornoKey + "T00:00:00") : null;
  const dettaglioGiorno = giornoKey
    ? buildDettaglioGiorno(vociGiornoMap[giornoKey] || [], timbGiornoMap[giornoKey] || [])
    : null;
  const trasfertaGiorno = giornoKey ? (giorniSintesi[giornoKey]?.trasferta || null) : null;

  const prevMese = () => setMese((m) => startOfMonth(addMonths(m, -1)));
  const nextMese = () => setMese((m) => startOfMonth(addMonths(m, 1)));

  if (selectedCollab) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCollab(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{selectedCollab.nome}</h1>
              <p className="text-xs text-muted-foreground">
                {selectedCollab.ruolo ? `${selectedCollab.ruolo} · ` : ""}
                {email ? "Timbrature + rapportini" : "Abbinato per nome (no email)"}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevMese}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <p className="font-semibold capitalize">{format(mese, "MMMM yyyy", { locale: it })}</p>
            <Button variant="outline" size="icon" onClick={nextMese}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center">
              <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-primary">{fmtOre(totaleOreCantieri)}</p>
              <p className="text-[10px] text-muted-foreground">Ore cantieri</p>
            </Card>
            <Card className="p-3 text-center">
              <Navigation className="w-4 h-4 text-orange-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-orange-600">{fmtOre(totaleOreSpost)}</p>
              <p className="text-[10px] text-muted-foreground">Ore spostamenti</p>
            </Card>
            <Card className="p-3 text-center">
              <CalendarDays className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold">{giorniLavoratiMese}</p>
              <p className="text-[10px] text-muted-foreground">Giorni lavorati</p>
            </Card>
            <Card className="p-3 text-center">
              <Route className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold">{totaleKmMese.toFixed(0)} km</p>
              <p className="text-[10px] text-muted-foreground">Km trasferte</p>
            </Card>
          </div>

          <Card className="p-3">
            <CalendarioMese
              mese={mese}
              giorniSintesi={giorniSintesi}
              onGiornoClick={(key) => setGiornoKey(key)}
            />
          </Card>
          <p className="text-[11px] text-muted-foreground text-center">
            Tocca un giorno con dati per vedere cantieri, spostamenti, trasferta e note
          </p>
        </div>

        <GiornoDetailDialog
          open={!!giornoKey}
          onOpenChange={(v) => !v && setGiornoKey(null)}
          data={giornoSelezionato}
          dettaglio={dettaglioGiorno}
          trasferta={trasfertaGiorno}
          collaboratoreNome={selectedCollab.nome}
        />

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Ore Lavoratori</h1>
            <p className="text-xs text-muted-foreground">Tocca un collaboratore per il calendario ore e trasferte</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{collaboratori.length}</p>
            <p className="text-[10px] text-muted-foreground">Collaboratori</p>
          </Card>
          <Card className="p-3 text-center">
            <CalendarDays className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold capitalize">{format(new Date(), "MMM", { locale: it })}</p>
            <p className="text-[10px] text-muted-foreground">Mese corrente</p>
          </Card>
        </div>

        <div className="space-y-2">
          {loadingCollab ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : collaboratori.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nessun collaboratore in anagrafe</p>
          ) : (
            collaboratori.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <button
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-accent/40 transition-colors"
                  onClick={() => {
                    setSelectedCollab(c);
                    setMese(startOfMonth(new Date()));
                    setGiornoKey(null);
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {c.nome?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.ruolo ? `${c.ruolo} · ` : ""}
                      {c.user_email ? "con timbrature" : "abbinato per nome"}
                    </p>
                  </div>
                  {!c.attivo && <Badge variant="outline" className="text-[10px]">inattivo</Badge>}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
```

---

## 7. src/pages/Programmazione.jsx

```jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Sun, CloudRain } from "lucide-react";
import { toast } from "sonner";
import ProgrammazioneCard from "@/components/programmazione/ProgrammazioneCard";
import ProgrammazioneFormDialog from "@/components/programmazione/ProgrammazioneFormDialog";

export default function Programmazione() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [dataSelezionata, setDataSelezionata] = useState(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: programmi = [], isLoading } = useQuery({
    queryKey: ["programmazioni", dataSelezionata],
    queryFn: () => base44.entities.Programmazione.filter({ data: dataSelezionata }, "tipo_giornata"),
  });

  const normali = programmi.filter((p) => p.tipo_giornata === "normale");
  const pioggia = programmi.filter((p) => p.tipo_giornata === "pioggia");

  const reload = () => {
    qc.invalidateQueries({ queryKey: ["programmazioni", dataSelezionata] });
    qc.invalidateQueries({ queryKey: ["programma"] });
  };

  const handleNew = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (item) => { setEditing(item); setDialogOpen(true); };

  const handleDelete = async (item) => {
    if (!confirm("Eliminare questa programmazione?")) return;
    try {
      await base44.entities.Programmazione.delete(item.id);
      toast.success("Programmazione eliminata");
      reload();
    } catch {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handlePublish = async (item) => {
    try {
      await base44.entities.Programmazione.update(item.id, { stato: "pubblicato" });
      toast.success("Programmazione pubblicata");
      reload();
    } catch {
      toast.error("Errore nella pubblicazione");
    }
  };

  const renderGroup = (items, label, Icon, color) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-9">Nessuna programmazione</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <ProgrammazioneCard
              key={p.id}
              item={p}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPublish={handlePublish}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {!embed && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-lg">Programmazione</h1>
            <p className="text-xs text-muted-foreground">Pianifica e pubblica le giornate</p>
          </div>
          <Button className="gap-2" onClick={handleNew}>
            <Plus className="w-4 h-4" />Nuova
          </Button>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <Input type="date" value={dataSelezionata} onChange={(e) => setDataSelezionata(e.target.value)} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Caricamento...</p>
        ) : (
          <>
            {renderGroup(normali, "Giornata normale", Sun, "bg-amber-500")}
            {renderGroup(pioggia, "Giornata di pioggia", CloudRain, "bg-blue-500")}
          </>
        )}
      </div>

      <ProgrammazioneFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={reload}
        editing={editing}
        defaultData={dataSelezionata}
      />
    </div>
  );
}
```

---

## 8. src/pages/Programma.jsx

```jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sun, CloudRain, ClipboardCheck } from "lucide-react";
import ProgrammazioneCard from "@/components/programmazione/ProgrammazioneCard";

export default function Programma() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";
  const today = new Date().toISOString().slice(0, 10);
  const [dataSelezionata, setDataSelezionata] = useState(today);

  const { data: programmi = [], isLoading } = useQuery({
    queryKey: ["programma", dataSelezionata],
    queryFn: () => base44.entities.Programmazione.filter({ data: dataSelezionata, stato: "pubblicato" }, "tipo_giornata"),
  });

  const normali = programmi.filter((p) => p.tipo_giornata === "normale");
  const pioggia = programmi.filter((p) => p.tipo_giornata === "pioggia");

  const renderGroup = (items, label, Icon, color) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-9">Nessuna programmazione pubblicata</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <ProgrammazioneCard key={p.id} item={p} readonly />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {!embed && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-lg">Programma</h1>
            <p className="text-xs text-muted-foreground">Programmazioni pubblicate</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <Input type="date" value={dataSelezionata} onChange={(e) => setDataSelezionata(e.target.value)} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Caricamento...</p>
        ) : programmi.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessun programma pubblicato</p>
            <p className="text-sm text-muted-foreground mt-1">Crea e pubblica una programmazione</p>
          </div>
        ) : (
          <>
            {renderGroup(normali, "Giornata normale", Sun, "bg-amber-500")}
            {renderGroup(pioggia, "Giornata di pioggia", CloudRain, "bg-blue-500")}
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 9. src/pages/Cronoprogramma.jsx

```jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, RefreshCw, CalendarRange } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CronoItem from "@/components/cronoprogramma/CronoItem";
import CronoFormDialog from "@/components/cronoprogramma/CronoFormDialog";
import { useToast } from "@/components/ui/use-toast";

function genSyncId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

export default function Cronoprogramma() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cronoprogramma"],
    queryFn: () => base44.entities.Cronoprogramma.list("ordine", 500),
  });

  const syncMut = useMutation({
    mutationFn: () => base44.functions.invoke("sync_cronoprogramma", { action: "sync" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["cronoprogramma"] });
      const d = res?.data || {};
      toast({ title: "Sincronizzato", description: `Importati: ${d.pulled ?? 0} · Inviati: ${d.pushed ?? 0}` });
    },
    onError: (err) => {
      toast({ title: "Errore sincronizzazione", description: err?.response?.data?.error || err.message, variant: "destructive" });
    },
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Cronoprogramma.create({ ...data, sync_id: genSyncId(), sync_version: 1, origine: "locale" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cronoprogramma"] }); setDialogOpen(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data, version }) => base44.entities.Cronoprogramma.update(id, { ...data, sync_version: (version || 0) + 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cronoprogramma"] }); setDialogOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Cronoprogramma.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cronoprogramma"] }),
  });

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setEditing(item); setDialogOpen(true); };
  const onSubmit = (data) => {
    if (editing) updateMut.mutate({ id: editing.id, data, version: editing.sync_version });
    else createMut.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2"><CalendarRange className="w-5 h-5" /> Cronoprogramma</h1>
            <p className="text-xs text-muted-foreground">Sincronizzato con l'app Workflow</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            <RefreshCw className={`w-4 h-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
            Sincronizza
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={openNew}>
            <Plus className="w-4 h-4" /> Aggiungi fase
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <CalendarRange className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium">Nessuna fase nel cronoprogramma</p>
            <p className="text-sm mt-1">Aggiungi una fase o sincronizza con l'app Workflow.</p>
          </Card>
        ) : (
          items.map((item) => (
            <CronoItem
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => { if (confirm("Eliminare questa fase?")) deleteMut.mutate(item.id); }}
            />
          ))
        )}
      </div>

      <CronoFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={onSubmit}
        initial={editing}
      />
      <BottomNav />
    </div>
  );
}
```

---

## 10. src/pages/Corsi.jsx

```jsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

// ID calendario decodificato dal parametro cid dell'URL fornito
const CALENDAR_ID =
  "14408cec4b4c5d2629e7da4071cb08a98cdd1a2fbff5a74c3689fb3adcd73702@group.calendar.google.com";
const EMBED_SRC = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
  CALENDAR_ID
)}&ctz=Europe%2FRome`;

export default function Corsi() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Corsi</h1>
              <p className="text-xs text-muted-foreground">Calendario corsi e formazione</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-2 py-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <iframe
            src={EMBED_SRC}
            title="Calendario Corsi"
            className="w-full"
            style={{ height: "78vh", border: 0 }}
            loading="lazy"
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
```

---

## 11. src/pages/Permessi.jsx

```jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import PermessiPage from "@/components/permessi/PermessiPage";

export default function Permessi() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-destructive/40 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">Accesso riservato agli amministratori</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> Torna alla Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Permessi</h1>
            <p className="text-xs text-muted-foreground">Sezioni visibili per ogni fascia</p>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PermessiPage />
      </div>
      <BottomNav />
    </div>
  );
}
```

---

## 12. src/pages/CalendarioPermessi.jsx (Permessi/Ferie)

```jsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

// ID calendario decodificato dal parametro cid dell'URL fornito
const CALENDAR_ID =
  "31cd35a0b050ccef3dc636f01d485ed06d5ca5855370e35862881d848bad18bb@group.calendar.google.com";
const EMBED_SRC = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
  CALENDAR_ID
)}&ctz=Europe%2FRome`;

export default function CalendarioPermessi() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Permessi</h1>
              <p className="text-xs text-muted-foreground">Calendario permessi e ferie</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2 py-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <iframe
            src={EMBED_SRC}
            title="Calendario Permessi"
            className="w-full"
            style={{ height: "75vh", border: 0 }}
            loading="lazy"
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
```

---

## 13. src/pages/UsoFurgoni.jsx

```jsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Car, Clock } from "lucide-react";
import moment from "moment";
import UsoFurgoneFormDialog from "@/components/usofurgone/UsoFurgoneFormDialog";

export default function UsoFurgoni() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["uso-furgoni"],
    queryFn: () => base44.entities.UsoFurgone.list("-data", 200),
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Uso Furgoni</h1>
            <p className="text-xs text-muted-foreground">Registra chi ha guidato un furgone</p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Nuovo
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessun uso registrato. Premi "Nuovo" per registrare.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(r => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-medium text-sm truncate">{r.furgone_nome || "—"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{moment(r.data).format("DD/MM/YYYY")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Conducente: {r.collaboratore_nome || "—"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {r.tipo_orario === "fascia" ? `${r.ora_inizio || "—"} - ${r.ora_fine || "—"}` : "Tutta la giornata"}
                </p>
                {r.nota && (
                  <p className="text-xs mt-2 p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 break-words">
                    {r.nota}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <UsoFurgoneFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
```

---

## Rotta in App.jsx

Aggiungi le route in `src/App.jsx`:

```jsx
<Route path="/" element={<Home />} />
<Route path="/rapportini" element={<Home showRapportini />} />
<Route path="/cantieri" element={<Cantieri />} />
<Route path="/foto" element={<Foto />} />
<Route path="/anagrafe" element={<Anagrafe />} />
<Route path="/programma" element={<Programma />} />
<Route path="/programmazione" element={<Programmazione />} />
<Route path="/cronoprogramma" element={<Cronoprogramma />} />
<Route path="/corsi" element={<Corsi />} />
<Route path="/permessi" element={<Permessi />} />
<Route path="/permessi-ferie" element={<CalendarioPermessi />} />
<Route path="/uso-furgoni" element={<UsoFurgoni />} />
<Route path="/timbratura" element={<Timbratura />} />
<Route path="/ore-lavoratori" element={<OreLavoratori />} />
``