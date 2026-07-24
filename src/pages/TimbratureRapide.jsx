import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Clock } from "lucide-react";
import TimbraturaRapidaPanel from "@/components/timbrature/TimbraturaRapidaPanel";
import TimbraturaTimeline from "@/components/timbrature/TimbraturaTimeline";
import BottomNav from "@/components/BottomNav";

export default function TimbratureRapide() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [cantiereId, setCantiereId] = useState("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.filter({ attivo: true }),
  });

  const oggi = new Date();
  const inizio = new Date(oggi);
  inizio.setHours(0, 0, 0, 0);
  const fine = new Date(oggi);
  fine.setHours(23, 59, 59, 999);

  const { data: timbrature = [], isLoading } = useQuery({
    queryKey: ["timbrature-giornaliere", user?.email, format(inizio, "yyyy-MM-dd")],
    queryFn: () => base44.entities.Timbratura.filter({
      user_email: user.email,
      data_ora: { $gte: inizio.toISOString(), $lt: fine.toISOString() },
    }),
    enabled: !!user,
  });

  const cantiereSelezionato = cantieri.find(c => c.id === cantiereId);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <header className="flex items-center justify-between pt-2">
          <div>
            <h1 className="text-2xl font-bold">Timbrature</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {format(oggi, "EEEE d MMMM yyyy", { locale: it })}
            </p>
          </div>
          <Clock className="w-8 h-8 text-primary/30" />
        </header>

        {isLoading && (
          <Card className="p-8 text-center text-muted-foreground">
            <p>Caricamento...</p>
          </Card>
        )}

        {!isLoading && user && (
          <TimbraturaRapidaPanel
            timbrature={timbrature}
            cantiere={cantiereSelezionato}
            cantieri={cantieri}
            user={user}
            onCantiereChange={setCantiereId}
            onTimbrata={() => queryClient.invalidateQueries({ queryKey: ["timbrature-giornaliere"] })}
          />
        )}

        <TimbraturaTimeline timbrature={timbrature} />
      </div>
      <BottomNav />
    </div>
  );
}