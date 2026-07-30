import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, Users, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import CollaboratoreGiornata from "@/components/trasferte/CollaboratoreGiornata";
import BottomNav from "@/components/BottomNav";

export default function DashboardTrasferte() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [dataSelezionata, setDataSelezionata] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const inizio = new Date(dataSelezionata + "T00:00:00");
  const fine = new Date(dataSelezionata + "T23:59:59");

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.filter({}),
  });

  const { data: collaboratori = [] } = useQuery({
    queryKey: ["collaboratori"],
    queryFn: () => base44.entities.Collaboratore.filter({}),
  });

  const { data: timbrature = [], isLoading } = useQuery({
    queryKey: ["timbrature-giorno-all", dataSelezionata],
    queryFn: () => base44.entities.Timbratura.filter({
      data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
    }),
  });

  const { data: trasferte = [] } = useQuery({
    queryKey: ["trasferte-giorno", dataSelezionata],
    queryFn: () => base44.entities.Trasferta.filter({
      data: dataSelezionata,
    }),
  });

  // Raggruppa timbrature per user_email
  const perUtente = {};
  (timbrature || []).forEach(t => {
    if (!t.user_email) return;
    if (!perUtente[t.user_email]) perUtente[t.user_email] = [];
    perUtente[t.user_email].push(t);
  });

  const utentiList = Object.entries(perUtente).map(([email, timbs]) => {
    const collab = (collaboratori || []).find(c => c.user_email === email);
    const nome = collab?.nome || timbs[0]?.user_nome || email;
    return { email, nome, timbrature: timbs, tracking_posizione: collab?.tracking_posizione };
  }).sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  const cambiaData = (offset) => {
    const d = new Date(dataSelezionata + "T00:00:00");
    d.setDate(d.getDate() + offset);
    setDataSelezionata(format(d, "yyyy-MM-dd"));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Route className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Dashboard Trasferte</h1>
              <p className="text-sm text-muted-foreground">Riepilogo giornaliero collaboratori</p>
            </div>
          </div>
        </header>

        <Card className="p-3 flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => cambiaData(-1)}>
            <CalendarDays className="w-4 h-4" />
          </Button>
          <Input
            type="date"
            value={dataSelezionata}
            onChange={(e) => setDataSelezionata(e.target.value)}
            className="flex-1 text-center"
          />
          <Button variant="outline" size="icon" onClick={() => cambiaData(1)}>
            <CalendarDays className="w-4 h-4" />
          </Button>
        </Card>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{utentiList.length} collaboratori attivi il {format(inizio, "d MMMM yyyy", { locale: it })}</span>
        </div>

        {isLoading && <Card className="p-8 text-center text-muted-foreground">Caricamento...</Card>}

        {!isLoading && utentiList.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessuna timbratura per questa data</p>
          </Card>
        )}

        {!isLoading && utentiList.map(u => (
          <CollaboratoreGiornata
            key={u.email}
            email={u.email}
            nome={u.nome}
            trackingPosizione={u.tracking_posizione}
            timbrature={u.timbrature}
            cantieri={cantieri}
            data={dataSelezionata}
            trasfertaEsistente={(trasferte || []).find(t => t.user_email === u.email)}
            onSalvata={() => queryClient.invalidateQueries({ queryKey: ["trasferte-giorno", dataSelezionata] })}
          />
        ))}
      </div>
      <BottomNav />
    </div>
  );
}