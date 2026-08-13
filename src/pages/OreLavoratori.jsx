import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Users, Route, CalendarDays } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { it } from "date-fns/locale";
import { fmtOre } from "@/lib/timbratureUtils";
import { calcolaGiornata } from "@/lib/oreLavoratoriUtils";
import CalendarioMese from "@/components/orelavoratori/CalendarioMese";
import GiornoDetailDialog from "@/components/orelavoratori/GiornoDetailDialog";

export default function OreLavoratori() {
  const navigate = useNavigate();
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [mese, setMese] = useState(startOfMonth(new Date()));
  const [giornoKey, setGiornoKey] = useState(null);

  const { data: collaboratori = [], isLoading: loadingCollab } = useQuery({
    queryKey: ["collaboratori-all"],
    queryFn: () => base44.entities.Collaboratore.list(),
  });

  const email = selectedCollab?.user_email;

  const { data: timbrature = [], isLoading: loadingTimb } = useQuery({
    queryKey: ["timbrature-collab", email],
    queryFn: () => base44.entities.Timbratura.filter({ user_email: email }, "-data_ora", 5000),
    enabled: !!email,
  });

  const { data: trasferte = [], isLoading: loadingTras } = useQuery({
    queryKey: ["trasferte-collab", email],
    queryFn: () => base44.entities.Trasferta.filter({ user_email: email }, "-data", 5000),
    enabled: !!email,
  });

  // Mappa timbrature per giorno del mese corrente
  const giorniMap = useMemo(() => {
    if (!email) return {};
    const map = {};
    const inizio = startOfMonth(mese);
    const fine = endOfMonth(mese);
    timbrature.forEach((t) => {
      const d = new Date(t.data_ora);
      if (d >= inizio && d <= fine) {
        const key = format(d, "yyyy-MM-dd");
        (map[key] = map[key] || []).push(t);
      }
    });
    return map;
  }, [timbrature, mese, email]);

  const trasferteMap = useMemo(() => {
    if (!email) return {};
    const map = {};
    const inizio = startOfMonth(mese);
    const fine = endOfMonth(mese);
    trasferte.forEach((t) => {
      if (!t.data) return;
      const d = new Date(t.data + "T00:00:00");
      if (d >= inizio && d <= fine) map[format(d, "yyyy-MM-dd")] = t;
    });
    return map;
  }, [trasferte, mese, email]);

  // Totali mese
  const { totaleOreMese, totaleKmMese, giorniLavoratiMese } = useMemo(() => {
    let ore = 0;
    let km = 0;
    const lavorati = new Set();
    Object.entries(giorniMap).forEach(([key, tims]) => {
      const det = calcolaGiornata(tims);
      if (det.oreTotali > 0) {
        ore += det.oreTotali;
        lavorati.add(key);
      }
    });
    Object.values(trasferteMap).forEach((tr) => {
      km += tr.km_totali || 0;
    });
    return { totaleOreMese: ore, totaleKmMese: km, giorniLavoratiMese: lavorati.size };
  }, [giorniMap, trasferteMap]);

  const giornoSelezionato = giornoKey ? new Date(giornoKey + "T00:00:00") : null;
  const dettaglioGiorno = giornoKey ? calcolaGiornata(giorniMap[giornoKey] || []) : null;
  const trasfertaGiorno = giornoKey ? trasferteMap[giornoKey] : null;

  const prevMese = () => setMese((m) => startOfMonth(addMonths(m, -1)));
  const nextMese = () => setMese((m) => startOfMonth(addMonths(m, 1)));

  // VISTA COLLABORATORE selezionato → calendario
  if (selectedCollab) {
    const loadingDetail = loadingTimb || loadingTras;
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
                {selectedCollab.user_email || "Nessuna email associata"}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {!email ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Questo collaboratore non ha un'email associata: impossibile caricare timbrature e trasferte.
            </Card>
          ) : loadingDetail ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <>
              {/* Navigatore mese */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="icon" onClick={prevMese}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <p className="font-semibold capitalize">{format(mese, "MMMM yyyy", { locale: it })}</p>
                <Button variant="outline" size="icon" onClick={nextMese}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Totali mese */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold text-primary">{fmtOre(totaleOreMese)}</p>
                  <p className="text-[10px] text-muted-foreground">Ore mese</p>
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

              {/* Calendario */}
              <Card className="p-3">
                <CalendarioMese
                  mese={mese}
                  giorniMap={giorniMap}
                  trasferteMap={trasferteMap}
                  onGiornoClick={(d, key) => setGiornoKey(key)}
                />
              </Card>
              <p className="text-[11px] text-muted-foreground text-center">
                Tocca un giorno con dati per vedere cantieri, spostamenti e trasferta
              </p>
            </>
          )}
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

  // VISTA LISTA COLLABORATORI
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
                      {c.user_email || "Nessuna email"}
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