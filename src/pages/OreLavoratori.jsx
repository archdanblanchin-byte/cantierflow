import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, ChevronDown, ChevronUp, Users, CalendarDays, FileText } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";

export default function OreLavoratori() {
  const navigate = useNavigate();
  const now = new Date();
  const [dataDa, setDataDa] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dataA, setDataA] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [expanded, setExpanded] = useState(null);

  const { data: rapportini = [], isLoading: loadingRapportini } = useQuery({
    queryKey: ["rapportini-all"],
    queryFn: () => base44.entities.Rapportino.list("-data", 500),
  });

  const { data: collaboratori = [], isLoading: loadingCollab } = useQuery({
    queryKey: ["collaboratori-all"],
    queryFn: () => base44.entities.Collaboratore.list(),
  });

  const isLoading = loadingRapportini || loadingCollab;

  const rapportiniFiltrati = useMemo(() => {
    if (!rapportini.length) return [];
    const da = new Date(dataDa + "T00:00:00");
    const a = new Date(dataA + "T23:59:59");
    return rapportini.filter(r => {
      const d = new Date(r.data);
      return d >= da && d <= a;
    });
  }, [rapportini, dataDa, dataA]);

  const { orePerCollaboratore, totaleOre, totaleRapportini } = useMemo(() => {
    const map = {};
    rapportiniFiltrati.forEach(r => {
      const dataFormatted = format(new Date(r.data), "yyyy-MM-dd");
      (r.collaboratori || []).forEach(c => {
        const id = c.collaboratore_id || `nome:${c.nome}`;
        if (!map[id]) map[id] = { totaleOre: 0, giorni: [] };
        map[id].totaleOre += (c.ore_lavorate || 0);
        map[id].giorni.push({
          data: dataFormatted,
          cantiere: r.cantiere_nome || "—",
          ore: c.ore_lavorate || 0,
          stato: r.stato,
          rapportino_id: r.id,
        });
      });
    });
    const totaleOre = Object.values(map).reduce((s, v) => s + v.totaleOre, 0);
    return { orePerCollaboratore: map, totaleOre, totaleRapportini: rapportiniFiltrati.length };
  }, [rapportiniFiltrati]);

  const listaLavoratori = useMemo(() => {
    return collaboratori.map(c => {
      const dati = orePerCollaboratore[c.id] || orePerCollaboratore[`nome:${c.nome}`] || { totaleOre: 0, giorni: [] };
      const giorni = [...dati.giorni].sort((a, b) => b.data.localeCompare(a.data));
      return {
        id: c.id,
        nome: c.nome,
        ruolo: c.ruolo,
        totaleOre: dati.totaleOre,
        giorni,
        giorniLavorati: new Set(giorni.map(g => g.data)).size,
      };
    }).sort((a, b) => b.totaleOre - a.totaleOre);
  }, [collaboratori, orePerCollaboratore]);

  const setThisMonth = () => {
    setDataDa(format(startOfMonth(now), "yyyy-MM-dd"));
    setDataA(format(endOfMonth(now), "yyyy-MM-dd"));
  };
  const setThisYear = () => {
    setDataDa(`${now.getFullYear()}-01-01`);
    setDataA(`${now.getFullYear()}-12-31`);
  };
  const setAll = () => {
    setDataDa("2000-01-01");
    setDataA("2099-12-31");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Ore Lavoratori</h1>
            <p className="text-xs text-muted-foreground">Riepilogo ore per operaio</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Filtro date */}
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Da</label>
              <Input type="date" value={dataDa} onChange={e => setDataDa(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">A</label>
              <Input type="date" value={dataA} onChange={e => setDataA(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={setThisMonth}>Questo mese</Button>
            <Button variant="outline" size="sm" onClick={setThisYear}>Quest'anno</Button>
            <Button variant="outline" size="sm" onClick={setAll}>Tutto</Button>
          </div>
        </Card>

        {/* Riepilogo generale */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{collaboratori.length}</p>
            <p className="text-[10px] text-muted-foreground">Operai</p>
          </Card>
          <Card className="p-3 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{totaleOre.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Ore totali</p>
          </Card>
          <Card className="p-3 text-center">
            <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{totaleRapportini}</p>
            <p className="text-[10px] text-muted-foreground">Rapportini</p>
          </Card>
        </div>

        {/* Lista lavoratori */}
        <div className="space-y-2">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : listaLavoratori.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nessun collaboratore in anagrafe</p>
          ) : (
            listaLavoratori.map(l => {
              const isOpen = expanded === l.id;
              return (
                <Card key={l.id} className="overflow-hidden">
                  <button
                    className="w-full p-3 flex items-center gap-3 text-left"
                    onClick={() => setExpanded(isOpen ? null : l.id)}
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {l.nome?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.giorniLavorati} giornate {l.ruolo ? `· ${l.ruolo}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-primary">{l.totaleOre.toFixed(1)}<span className="text-xs font-normal">h</span></p>
                    </div>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="border-t bg-muted/30 divide-y">
                      {l.giorni.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-muted-foreground text-center">
                          Nessuna ora registrata nel periodo selezionato
                        </p>
                      ) : (
                        l.giorni.map((g, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium capitalize">
                                {format(parseISO(g.data), "EEE dd MMM yyyy", { locale: it })}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">{g.cantiere}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {g.stato === "bozza" && (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">bozza</Badge>
                              )}
                              <span className="text-sm font-semibold">{g.ore.toFixed(1)}h</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}