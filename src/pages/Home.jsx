import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileText, ArrowLeft, HardHat,
  ClipboardList, Building2, Camera, CalendarDays, BarChart2,
  Truck, Droplets, UtensilsCrossed, ShieldCheck, GraduationCap
} from "lucide-react";
import ReportCard from "@/components/home/ReportCard";

const MENU_ITEMS = [
  { label: "Rapportino", icon: ClipboardList, path: "/rapportini", color: "bg-blue-500" },
  { label: "Cantiere", icon: Building2, path: "/cantieri", color: "bg-emerald-500" },
  { label: "Foto", icon: Camera, path: "/foto", color: "bg-purple-500" },
  { label: "Programma", icon: CalendarDays, path: "/programma", color: "bg-orange-500" },
  { label: "Cronoprogramma", icon: BarChart2, path: "/cronoprogramma", color: "bg-cyan-500" },
  { label: "Furgoni", icon: Truck, path: "/furgoni", color: "bg-yellow-500" },
  { label: "Documenti", icon: FileText, path: "/documenti", color: "bg-indigo-500" },
  { label: "Idropulitrice", icon: Droplets, path: "/idropulitrice", color: "bg-sky-500" },
  { label: "Ristorante", icon: UtensilsCrossed, path: "/ristorante", color: "bg-rose-500" },
  { label: "Permessi", icon: ShieldCheck, path: "/permessi", color: "bg-teal-500" },
  { label: "Corsi", icon: GraduationCap, path: "/corsi", color: "bg-violet-500" },
];

function MenuGrid() {
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
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.label}
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
  const { data: rapportini = [], isLoading } = useQuery({
    queryKey: ["rapportini"],
    queryFn: () => base44.entities.Rapportino.list("-created_date", 50),
  });

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
    </div>
  );
}

export default function Home({ showRapportini }) {
  if (showRapportini) return <RapportiniList />;
  return <MenuGrid />;
}