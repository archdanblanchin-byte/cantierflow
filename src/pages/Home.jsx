import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, FileText, HardHat } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReportCard from "@/components/home/ReportCard";

export default function Home() {
  const { data: rapportini = [], isLoading } = useQuery({
    queryKey: ["rapportini"],
    queryFn: () => base44.entities.Rapportino.list("-created_date", 50),
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <HardHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Rapportini</h1>
              <p className="text-sm text-muted-foreground">Gestione rapportini di cantiere</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground font-medium">
            {isLoading ? "..." : `${rapportini.length} rapportin${rapportini.length === 1 ? "o" : "i"}`}
          </span>
          <Link to="/nuovo">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Nuovo
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : rapportini.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessun rapportino</p>
            <p className="text-sm text-muted-foreground mt-1">Crea il tuo primo rapportino di cantiere</p>
            <Link to="/nuovo">
              <Button className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Crea Rapportino
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rapportini.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}