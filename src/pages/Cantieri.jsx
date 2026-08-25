import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MapPin, Clock, ChevronRight, Building2, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CantiereListPdfButton from "@/components/cantiere/CantiereListPdfButton";

const STATO_TABS = [
  { key: "aperto", label: "Aperti", color: "default" },
  { key: "sospeso", label: "Sospesi", color: "secondary" },
  { key: "chiuso", label: "Chiusi", color: "secondary" },
  { key: "tutti", label: "Tutti", color: "secondary" },
];

function statoOf(c) {
  if (c.stato) return c.stato;
  return c.attivo === false ? "chiuso" : "aperto";
}

const STATO_BADGE = {
  aperto: { label: "Aperto", variant: "default" },
  sospeso: { label: "Sospeso", variant: "secondary" },
  chiuso: { label: "Chiuso", variant: "secondary" },
};

export default function Cantieri() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ruolo = user?.role === "user" ? "collaboratore" : user?.role;
  const canManage = ruolo === "admin" || ruolo === "responsabile_tecnico";
  const isAdmin = ruolo === "admin";
  const qc = useQueryClient();
  const [tab, setTab] = useState("aperto");
  const [closeTarget, setCloseTarget] = useState(null);

  const chiudiCantiere = async (c) => {
    try {
      await base44.entities.Cantiere.update(c.id, {
        stato: "chiuso",
        attivo: false,
        data_chiusura: c.data_chiusura || new Date().toISOString().slice(0, 10),
      });
      qc.invalidateQueries({ queryKey: ["cantieri"] });
      toast.success(`Cantiere "${c.nome}" chiuso`);
    } catch (e) {
      toast.error("Errore: " + (e?.message || e));
    }
  };

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

  // Filtra per tab
  const filtrati = useMemo(() => {
    if (tab === "tutti") return cantieri;
    return cantieri.filter((c) => statoOf(c) === tab);
  }, [cantieri, tab]);

  // Raggruppa per anno (decrescente)
  const grouped = useMemo(() => {
    const map = {};
    filtrati.forEach((c) => {
      const anno = c.anno || (c.created_date ? new Date(c.created_date).getFullYear() : new Date().getFullYear());
      if (!map[anno]) map[anno] = [];
      map[anno].push(c);
    });
    return Object.keys(map)
      .sort((a, b) => Number(b) - Number(a))
      .map((anno) => ({ anno: Number(anno), items: map[anno] }));
  }, [filtrati]);

  const counts = useMemo(() => {
    const c = { aperto: 0, sospeso: 0, chiuso: 0, tutti: cantieri.length };
    cantieri.forEach((x) => { c[statoOf(x)] = (c[statoOf(x)] || 0) + 1; });
    return c;
  }, [cantieri]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt sticky top-0 z-10">
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

        {/* Tab stato */}
        <div className="max-w-2xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto">
          {STATO_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {t.label} <span className="opacity-70">({counts[t.key] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessun cantiere in questa sezione</p>
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.anno} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-[112px] z-[5] bg-background/90 backdrop-blur py-1">
                <h2 className="text-sm font-bold text-primary">{g.anno}</h2>
                <span className="text-xs text-muted-foreground">{g.items.length} cantieri</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {g.items.map((c) => {
                const ore = orePerCantiere(c.id);
                const sd = statoOf(c);
                const badge = STATO_BADGE[sd];
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                    <div className="flex items-start justify-between gap-3">
                      {isAdmin && (
                        <div className="flex flex-col gap-1 flex-shrink-0 pt-0.5">
                          {sd !== "chiuso" && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Chiudi cantiere" onClick={() => setCloseTarget(c)}>
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                          <CantiereListPdfButton cantiere={c} rapportini={rapportini.filter((r) => r.cantiere_id === c.id)} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={badge.variant}
                            className={`text-[10px] uppercase ${sd === "sospeso" ? "bg-amber-100 text-amber-700 border-amber-200" : sd === "chiuso" ? "bg-muted text-muted-foreground" : ""}`}
                          >
                            {badge.label}
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
                          {c.ore_stimate > 0 && <span>/ {c.ore_stimate}h stimate</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Link to={`/cantieri/${c.id}`}>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                            Apri <ChevronRight className="w-3 h-3" />
                          </Button>
                        </Link>
                        {c.indirizzo && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((c.indirizzo || "") + " " + (c.citta || ""))}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="gap-1.5 text-xs w-full">
                              <MapPin className="w-3 h-3" />Mappa
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!closeTarget} onOpenChange={(o) => !o && setCloseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chiudere il cantiere?</AlertDialogTitle>
            <AlertDialogDescription>
              Confermi la chiusura di "{closeTarget?.nome}"? Puoi riaprirlo dal dettaglio cantiere in qualsiasi momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (closeTarget) chiudiCantiere(closeTarget); setCloseTarget(null); }}>
              Chiudi cantiere
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}