import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Plus, FileText, UserCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ReportCard from "@/components/home/ReportCard";
import PullToRefresh from "@/components/PullToRefresh";
import SyncButton from "@/components/SyncButton";
import NotificationsBell from "@/components/NotificationsBell";
import { SEZIONI_APP } from "@/lib/permissions";
import { usePermessi } from "@/hooks/usePermessi";
import { usePermessoRapportinoManuale } from "@/hooks/usePermessoRapportinoManuale";

function MenuGrid() {
  const { puoVedere } = usePermessi();
  const items = SEZIONI_APP.filter(s => puoVedere(s.key));
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/69df26522754d022dfa80e75/c29eb2d9b_Blanchin-Simbolo-Colore-Copia.png"
              alt="EveryDay 4.0"
              className="w-11 h-11 rounded-xl object-cover shadow-lg"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">EveryDay 4.0</h1>
              <p className="text-xs text-muted-foreground">Seleziona una sezione</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <NotificationsBell />
              <SyncButton />
              <Link to="/account">
                <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors">
                  <UserCircle className="w-6 h-6 text-muted-foreground" />
                </div>
              </Link>
            </div>
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
    </div>
  );
}

function RapportiniList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canCreate } = usePermessoRapportinoManuale();
  const { data: rapportini = [], isLoading } = useQuery({
    queryKey: ["rapportini"],
    queryFn: () => base44.entities.Rapportino.list("-data", 50),
  });
  // I rapportini dei cantieri chiusi restano visibili: rappresentano le ore
  // lavorate dei collaboratori e devono restare consultabili anche dopo la
  // chiusura del cantiere (le ore non "spariscono").
  const visibili = useMemo(
    () =>
      [...rapportini].sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0)),
    [rapportini]
  );
  const [query, setQuery] = useState("");
  const filtrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibili;
    return visibili.filter((r) => [r.cantiere_nome, r.note_generali].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [visibili, query]);

  const gruppi = useMemo(() => {
    const map = {};
    filtrati.forEach((r) => {
      const key = r.data ? format(new Date(r.data), "yyyy-MM-dd") : "senza-data";
      (map[key] = map[key] || []).push(r);
    });
    return Object.keys(map).sort((a, b) => b.localeCompare(a)).map((k) => ({ key: k, items: map[k] }));
  }, [filtrati]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["rapportini"] });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-bold text-lg">Rapportini</h1>
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "..." : `${filtrati.length} rapportin${filtrati.length === 1 ? "o" : "i"}`}
                </p>
              </div>
            </div>
            {canCreate && (
              <Link to="/nuovo">
                <Button className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" />
                  Nuovo
                </Button>
              </Link>
            )}
          </div>
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca per cantiere..." className="pl-9" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <PullToRefresh onRefresh={handleRefresh}>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : filtrati.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessun rapportino</p>
            <p className="text-sm text-muted-foreground mt-1">Crea il tuo primo rapportino di cantiere</p>
            {canCreate && (
              <Link to="/nuovo">
                <Button className="mt-4 gap-2"><Plus className="w-4 h-4" />Crea Rapportino</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {gruppi.map((g) => (
              <div key={g.key} className="space-y-2">
                <div className="sticky top-[120px] z-[5] bg-background/90 backdrop-blur py-1">
                  <p className="text-xs font-semibold text-muted-foreground capitalize">
                    {g.key === "senza-data" ? "Senza data" : format(new Date(g.key), "EEEE d MMMM yyyy", { locale: it })}
                  </p>
                </div>
                <div className="space-y-3">
                  {g.items.map((r) => <ReportCard key={r.id} report={r} />)}
                </div>
              </div>
            ))}
          </div>
        )}
        </PullToRefresh>
      </div>
    </div>
  );
}

export default function Home({ showRapportini }) {
  if (showRapportini) return <RapportiniList />;
  return <MenuGrid />;
}