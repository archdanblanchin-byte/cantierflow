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

  // Calcola ore totali per cantiere dai rapportini
  const orePerCantiere = (cantiereId) => {
    return rapportini
      .filter((r) => r.cantiere_id === cantiereId)
      .reduce((sum, r) => {
        const oreCollab = (r.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0);
        return sum + (oreCollab || r.ore_totali_squadra || 0);
      }, 0);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt">
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