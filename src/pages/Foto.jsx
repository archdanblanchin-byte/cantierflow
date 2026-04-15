import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Camera, Image } from "lucide-react";
import FotoCard from "@/components/foto/FotoCard";
import AggiungiFotoModal from "@/components/foto/AggiungiFotoModal";

export default function FotoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: foto = [], isLoading: loadingFoto } = useQuery({
    queryKey: ["foto"],
    queryFn: () => base44.entities.Foto.list("-created_date", 100),
  });

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list(),
  });

  const handleDelete = async (f) => {
    await base44.entities.Foto.delete(f.id);
    queryClient.invalidateQueries({ queryKey: ["foto"] });
  };

  const handleEdit = async (f) => {
    // Apri editor — per ora naviga al dettaglio (futuro: inline edit)
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">Foto</h1>
              <p className="text-xs text-muted-foreground">
                {loadingFoto ? "..." : `${foto.length} foto`}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Aggiungi
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loadingFoto ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
          </div>
        ) : foto.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessuna foto</p>
            <p className="text-sm text-muted-foreground mt-1">Aggiungi la prima foto o codice colore</p>
            <Button className="mt-4 gap-2" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" />Aggiungi foto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {foto.map((f) => (
              <FotoCard key={f.id} foto={f} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <AggiungiFotoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        cantieri={cantieri}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["foto"] })}
      />
    </div>
  );
}