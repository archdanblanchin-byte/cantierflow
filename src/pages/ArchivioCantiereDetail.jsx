import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import ReportPDFButton, { ReportPDFContent } from "@/components/ReportPDF";

export default function ArchivioCantiereDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [cantiere, setCantiere] = useState(null);
  const [loading, setLoading] = useState(true);

  const { data: rapportini = [] } = useQuery({
    queryKey: ["rapportini_cantiere", id],
    queryFn: () => base44.entities.Rapportino.filter({ cantiere_id: id }),
    enabled: !!id,
  });

  const { data: fotoCantiere = [] } = useQuery({
    queryKey: ["foto_cantiere", id],
    queryFn: () => base44.entities.Foto.filter({ cantiere_id: id }),
    enabled: !!id,
  });

  const { data: trasferte = [] } = useQuery({
    queryKey: ["trasferte_cantiere", id],
    queryFn: async () => {
      const all = await base44.entities.Trasferta.list();
      return all.filter((t) => t.primo_cantiere_id === id || t.ultimo_cantiere_id === id);
    },
    enabled: !!id,
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timbrature_cantiere", id],
    queryFn: () => base44.entities.Timbratura.filter({ cantiere_id: id }),
    enabled: !!id,
  });

  useEffect(() => {
    base44.entities.Cantiere.filter({ id }).then((res) => {
      setCantiere(res[0] || null);
      setLoading(false);
    });
  }, [id]);

  const spostamenti = (timbrature || []).filter((t) => t.tipo_evento === "spostamento");

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  if (!cantiere) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Cantiere non trovato</p>
      <Button variant="ghost" onClick={() => navigate("/archivio-cantieri")} className="mt-4">Torna all'archivio</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/archivio-cantieri")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-bold truncate">{cantiere.nome}</h1>
              <p className="text-xs text-muted-foreground">Archivio · sola lettura</p>
            </div>
          </div>
          <ReportPDFButton cantiere={cantiere} rapportini={rapportini} foto={fotoCantiere} trasferte={trasferte} spostamenti={spostamenti} />
        </div>
      </div>

      {/* Report PDF visibile e scorrevole: contiene tutte le info del cantiere */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <ReportPDFContent cantiere={cantiere} rapportini={rapportini} foto={fotoCantiere} trasferte={trasferte} spostamenti={spostamenti} />
        </div>
      </div>
    </div>
  );
}