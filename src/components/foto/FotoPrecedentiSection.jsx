import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { caricaCantieri } from "@/lib/campioni";
import FotoCard from "@/components/foto/FotoCard";
import AggiungiFotoModal from "@/components/foto/AggiungiFotoModal";

// Le foto caricate prima della riorganizzazione della sezione: restano qui,
// in Andamento cantiere, con lo stesso caricamento e la stessa scheda di prima.
export default function FotoPrecedentiSection() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [aperto, setAperto] = useState(false);

  const { data: foto = [], isLoading } = useQuery({
    queryKey: ["foto-precedenti"],
    queryFn: async () => {
      const page = await base44.entities.Foto.list({ sort: "-created_date", limit: 100 });
      return page?.items || [];
    },
  });

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-foto"],
    queryFn: caricaCantieri,
    enabled: aperto,
  });

  const ricarica = () => queryClient.invalidateQueries({ queryKey: ["foto-precedenti"] });

  const elimina = async (f) => {
    if (!window.confirm("Eliminare questa foto?")) return;
    await base44.entities.Foto.delete(f.id);
    ricarica();
  };

  return (
    <div className="space-y-3 pt-4 mt-2 border-t border-border">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Foto caricate in precedenza</h3>
          <p className="text-[11px] text-muted-foreground">{isLoading ? "..." : `${foto.length} foto`}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAperto(true)}>
          <Plus className="w-3.5 h-3.5" /> Aggiungi
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : foto.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center rounded-2xl border border-dashed border-border">
          Nessuna foto caricata in precedenza
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {foto.map((f) => (
            <FotoCard key={f.id} foto={f} onDelete={isAdmin ? elimina : undefined} />
          ))}
        </div>
      )}

      <AggiungiFotoModal open={aperto} onClose={() => setAperto(false)} cantieri={cantieri} onSaved={ricarica} />
    </div>
  );
}