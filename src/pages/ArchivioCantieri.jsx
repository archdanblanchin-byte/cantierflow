import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Archive, MapPin, Clock, ChevronRight, Search, Building2 } from "lucide-react";

function statoOf(c) {
  if (c.stato) return c.stato;
  return c.attivo === false ? "chiuso" : "aperto";
}

export default function ArchivioCantieri() {
  const navigate = useNavigate();
  const [annoFilter, setAnnoFilter] = useState("tutti");
  const [query, setQuery] = useState("");

  const { data: cantieri = [], isLoading } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list("-created_date"),
  });

  const { data: rapportini = [] } = useQuery({
    queryKey: ["rapportini"],
    queryFn: () => base44.entities.Rapportino.list(),
  });

  const orePerCantiere = (cantiereId) =>
    rapportini
      .filter((r) => r.cantiere_id === cantiereId)
      .reduce((sum, r) => {
        const oreCollab = (r.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0);
        return sum + (oreCollab || r.ore_totali_squadra || 0);
      }, 0);

  // Solo cantieri chiusi
  const chiusi = useMemo(() => cantieri.filter((c) => statoOf(c) === "chiuso"), [cantieri]);

  const anni = useMemo(() => {
    const set = new Set();
    chiusi.forEach((c) => set.add(c.anno || (c.data_chiusura ? new Date(c.data_chiusura).getFullYear() : new Date().getFullYear())));
    return [...set].sort((a, b) => Number(b) - Number(a));
  }, [chiusi]);

  const filtrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chiusi.filter((c) => {
      if (annoFilter !== "tutti" && Number(c.anno || (c.data_chiusura ? new Date(c.data_chiusura).getFullYear() : new Date().getFullYear())) !== Number(annoFilter)) return false;
      if (!q) return true;
      return [c.nome, c.cliente, c.codice, c.citta, c.indirizzo].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [chiusi, annoFilter, query]);

  // Raggruppa per anno (decrescente)
  const grouped = useMemo(() => {
    const map = {};
    filtrati.forEach((c) => {
      const anno = c.anno || (c.data_chiusura ? new Date(c.data_chiusura).getFullYear() : new Date().getFullYear());
      if (!map[anno]) map[anno] = [];
      map[anno].push(c);
    });
    return Object.keys(map)
      .sort((a, b) => Number(b) - Number(a))
      .map((anno) => ({ anno: Number(anno), items: map[anno] }));
  }, [filtrati]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Archive className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Archivio Cantieri</h1>
              <p className="text-xs text-muted-foreground">{chiusi.length} cantieri chiusi</p>
            </div>
          </div>

          {/* Ricerca per cliente / nome */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per cliente, nome, città..."
              className="pl-9"
            />
          </div>

          {/* Filtro anno */}
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setAnnoFilter("tutti")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                annoFilter === "tutti" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              Tutti gli anni
            </button>
            {anni.map((a) => (
              <button
                key={a}
                onClick={() => setAnnoFilter(a)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  annoFilter === a ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessun cantiere chiuso trovato</p>
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.anno} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-[148px] z-[5] bg-background/90 backdrop-blur py-1">
                <h2 className="text-sm font-bold text-primary">{g.anno}</h2>
                <span className="text-xs text-muted-foreground">{g.items.length} cantieri</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {g.items.map((c) => {
                const ore = orePerCantiere(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/archivio-cantieri/${c.id}`)}
                    className="w-full text-left rounded-xl border border-border bg-card p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] uppercase bg-muted text-muted-foreground">Chiuso</Badge>
                          {c.codice && <span className="text-[10px] text-muted-foreground font-mono">{c.codice}</span>}
                        </div>
                        <p className="font-semibold truncate">{c.nome}</p>
                        {c.cliente && <p className="text-xs text-muted-foreground">Cliente: <span className="font-medium text-foreground">{c.cliente}</span></p>}
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
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}