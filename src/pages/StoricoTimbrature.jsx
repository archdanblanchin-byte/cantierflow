import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, ArrowLeft, Calendar, Clock, MapPin, User, Users, Loader2, Navigation, CheckSquare, Trash2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { fmtOre } from "@/lib/timbratureUtils";
import { calcolaOrePerCantiere } from "@/lib/rapportiniFromTimbrature";
import TimbraturaTimeline from "@/components/timbrature/TimbraturaTimeline";
import TimbraturaEditDialog from "@/components/timbrature/TimbraturaEditDialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

// Calcola le ore totali di una giornata a partire dalla lista di timbrature.
// Lo spostamento conta come chiusura del cantiere precedente (come l'uscita).
function oreGiornata(timbs) {
  return calcolaOrePerCantiere(timbs).reduce((s, c) => s + (c.ore || 0), 0);
}

export default function StoricoTimbrature() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [aperti, setAperti] = useState({});
  const [editTarget, setEditTarget] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleSaveEdit = async (payload) => {
    await base44.entities.Timbratura.update(editTarget.id, payload);
    toast({ title: "Timbratura aggiornata" });
    queryClient.invalidateQueries({ queryKey: ["storico-timbrature"] });
    queryClient.invalidateQueries({ queryKey: ["timbrature-giornata"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await base44.entities.Timbratura.delete(deleteTarget.id);
      toast({ title: "Timbratura eliminata" });
    } catch (err) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("not found")) {
        toast({ title: "Timbratura già rimossa" });
      } else {
        toast({ title: "Errore eliminazione", description: msg, variant: "destructive" });
        setDeleting(false);
        return;
      }
    }
    setDeleteTarget(null);
    setDeleting(false);
    queryClient.invalidateQueries({ queryKey: ["storico-timbrature"] });
    queryClient.invalidateQueries({ queryKey: ["timbrature-giornata"] });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const ids = giorni
      .filter((g) => selectedDays.has(g.key))
      .flatMap((g) => g.list.map((t) => t.id));
    if (ids.length === 0) {
      setBulkDeleteOpen(false);
      setBulkDeleting(false);
      return;
    }
    try {
      await base44.entities.Timbratura.deleteMany({ id: { $in: ids } });
      toast({ title: `${ids.length} timbrature eliminate` });
    } catch (err) {
      toast({ title: "Errore eliminazione", description: err?.message, variant: "destructive" });
      setBulkDeleting(false);
      return;
    }
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
    setSelectMode(false);
    setSelectedDays(new Set());
    queryClient.invalidateQueries({ queryKey: ["storico-timbrature"] });
    queryClient.invalidateQueries({ queryKey: ["timbrature-giornata"] });
  };

  const toggleDaySelection = (key) => {
    setSelectedDays((s) => {
      const ns = new Set(s);
      if (ns.has(key)) ns.delete(key); else ns.add(key);
      return ns;
    });
  };

  const isAdmin = user?.role === "admin";
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const { data: timbrature = [], isLoading } = useQuery({
    queryKey: ["storico-timbrature", user?.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) return base44.entities.Timbratura.list("-data_ora", 1000);
      return base44.entities.Timbratura.filter({ user_email: user.email }, "-data_ora", 1000);
    },
    enabled: !!user,
  });

  // Raggruppa per giorno (chiave locale yyyy-MM-dd)
  const giorni = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (t) => !q || [t.cantiere_nome, t.user_nome, t.user_email].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    const perGiorno = {};
    (timbrature || []).forEach((t) => {
      if (!matches(t)) return;
      const key = format(new Date(t.data_ora), "yyyy-MM-dd");
      (perGiorno[key] ||= []).push(t);
    });
    return Object.entries(perGiorno)
      .map(([key, list]) => ({
        key,
        list: list.slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora)),
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [timbrature, query]);

  const selectedCount = giorni
    .filter((g) => selectedDays.has(g.key))
    .reduce((s, g) => s + g.list.length, 0);

  const toggle = (key) => setAperti((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border safe-area-top-pt sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Indietro"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Storico timbri</h1>
              <p className="text-[11px] text-muted-foreground">
                {isAdmin ? "Tutti gli utenti" : "I tuoi timbri"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedDays(new Set()); }}
              className={`ml-auto w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
                selectMode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted border-border hover:bg-accent"
              }`}
              aria-label="Seleziona"
              title={selectMode ? "Annulla selezione" : "Seleziona in blocco"}
            >
              <CheckSquare className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca per cantiere o persona..." className="pl-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2.5">
        {isLoading &&
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {!isLoading && giorni.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessuna timbratura registrata</p>
          </Card>
        )}

        {giorni.map((giorno) => {
          const aperto = !!aperti[giorno.key];
          const ore = oreGiornata(giorno.list);
          const oreSpost = calcolaOrePerCantiere(giorno.list).reduce((s, c) => s + (c.ore_spostamento || 0), 0);
          const nCantieri = new Set(
            giorno.list.map((t) => t.cantiere_id).filter(Boolean)
          ).size;
          const nTimbri = giorno.list.length;
          const nUtenti = isAdmin
            ? new Set(giorno.list.map((t) => t.user_email).filter(Boolean)).size
            : 1;
          const dataLabel = format(new Date(giorno.key + "T00:00:00"), "EEEE d MMMM yyyy", {
            locale: it,
          });

          // Per admin: raggruppa i timbri del giorno per utente
          const perUtente = {};
          if (isAdmin) {
            giorno.list.forEach((t) => {
              const k = t.user_email || "—";
              (perUtente[k] ||= []).push(t);
            });
          }

          const isSelected = selectedDays.has(giorno.key);
          return (
            <Card key={giorno.key} className={`overflow-hidden ${selectMode && isSelected ? "ring-2 ring-primary" : ""}`}>
              <button
                onClick={() => selectMode ? toggleDaySelection(giorno.key) : toggle(giorno.key)}
                className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-accent/40 transition-colors"
              >
                {selectMode && (
                  <Checkbox checked={isSelected} className="shrink-0 pointer-events-none" />
                )}
                <div className={`w-10 h-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0 ${selectMode ? "hidden" : ""}`}>
                  <span className="text-[10px] font-semibold uppercase leading-none text-primary">
                    {format(new Date(giorno.key + "T00:00:00"), "MMM", { locale: it })}
                  </span>
                  <span className="text-base font-bold leading-none text-primary">
                    {format(new Date(giorno.key + "T00:00:00"), "d")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize truncate">{dataLabel}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
                      <Clock className="w-2.5 h-2.5" />
                      {fmtOre(ore)}
                    </Badge>
                    {oreSpost > 0 && (
                      <Badge variant="secondary" className="text-[10px] gap-1 font-medium text-orange-700">
                        <Navigation className="w-2.5 h-2.5" />
                        {fmtOre(oreSpost)}
                      </Badge>
                    )}
                    {oreSpost > 0 && (
                      <Badge className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20 font-semibold">
                        Tot {fmtOre(ore + oreSpost)}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
                      <MapPin className="w-2.5 h-2.5" />
                      {nCantieri} cant.
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
                      {nTimbri} timbri
                    </Badge>
                    {isAdmin && nUtenti > 1 && (
                      <Badge className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
                        <Users className="w-2.5 h-2.5" />
                        {nUtenti} utenti
                      </Badge>
                    )}
                  </div>
                </div>
                {aperto ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </button>

              {aperto && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-4 border-t border-border">
                  {!isAdmin ? (
                    <TimbraturaTimeline
                      timbrature={giorno.list}
                      canEdit={giorno.key === todayKey}
                      onEdit={(t) => { setEditTarget(t); setEditOpen(true); }}
                      onDelete={(t) => setDeleteTarget(t)}
                    />
                  ) : (
                    Object.entries(perUtente).map(([email, timbs]) => {
                      const u = timbs[0];
                      return (
                        <div key={email} className="space-y-2 pt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {(u.user_nome || email || "?")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {u.user_nome || email}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">{email}</p>
                            </div>
                          </div>
                          <TimbraturaTimeline
                            timbrature={timbs}
                            isAdmin
                            onEdit={(t) => { setEditTarget(t); setEditOpen(true); }}
                            onDelete={(t) => setDeleteTarget(t)}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Modifica timbratura (solo admin) */}
      <TimbraturaEditDialog
        open={editOpen}
        timbratura={editTarget}
        onOpenChange={setEditOpen}
        onSave={handleSaveEdit}
      />

      {/* Barra azione multipla (solo admin, modalità selezione) */}
      {selectMode && (
        <div className="fixed bottom-16 left-0 right-0 z-20 safe-area-bottom-pb px-4">
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-lg p-3 flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedCount > 0
                ? `${selectedCount} timbrature selezionate`
                : "Nessuna giornata selezionata"}
            </p>
            <button
              onClick={() => selectedCount > 0 && setBulkDeleteOpen(true)}
              disabled={selectedCount === 0}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-md bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50 hover:bg-destructive/90 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Elimina in blocco
            </button>
          </div>
        </div>
      )}

      {/* Conferma eliminazione multipla (solo admin) */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={(o) => !o && setBulkDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {selectedCount} timbrature?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno eliminate tutte le timbrature dei giorni selezionati. L'azione è definitiva e non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conferma eliminazione singola (solo admin) */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la timbratura?</AlertDialogTitle>
            <AlertDialogDescription>
              L'azione è definitiva e non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}