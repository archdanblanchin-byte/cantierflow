import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Sun, CloudRain } from "lucide-react";
import { toast } from "sonner";
import ProgrammazioneCard from "@/components/programmazione/ProgrammazioneCard";
import ProgrammazioneFormDialog from "@/components/programmazione/ProgrammazioneFormDialog";

export default function Programmazione() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [dataSelezionata, setDataSelezionata] = useState(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: programmi = [], isLoading } = useQuery({
    queryKey: ["programmazioni", dataSelezionata],
    queryFn: () => base44.entities.Programmazione.filter({ data: dataSelezionata }, "tipo_giornata"),
  });

  const normali = programmi.filter((p) => p.tipo_giornata === "normale");
  const pioggia = programmi.filter((p) => p.tipo_giornata === "pioggia");

  const reload = () => {
    qc.invalidateQueries({ queryKey: ["programmazioni", dataSelezionata] });
    qc.invalidateQueries({ queryKey: ["programma"] });
  };

  const handleNew = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (item) => { setEditing(item); setDialogOpen(true); };

  const handleDelete = async (item) => {
    if (!confirm("Eliminare questa programmazione?")) return;
    try {
      await base44.entities.Programmazione.delete(item.id);
      toast.success("Programmazione eliminata");
      reload();
    } catch {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handlePublish = async (item) => {
    try {
      await base44.entities.Programmazione.update(item.id, { stato: "pubblicato" });
      toast.success("Programmazione pubblicata");
      reload();
    } catch {
      toast.error("Errore nella pubblicazione");
    }
  };

  const renderGroup = (items, label, Icon, color) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-9">Nessuna programmazione</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <ProgrammazioneCard
              key={p.id}
              item={p}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPublish={handlePublish}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {!embed && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-lg">Programmazione</h1>
            <p className="text-xs text-muted-foreground">Pianifica e pubblica le giornate</p>
          </div>
          <Button className="gap-2" onClick={handleNew}>
            <Plus className="w-4 h-4" />Nuova
          </Button>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <Input type="date" value={dataSelezionata} onChange={(e) => setDataSelezionata(e.target.value)} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Caricamento...</p>
        ) : (
          <>
            {renderGroup(normali, "Giornata normale", Sun, "bg-amber-500")}
            {renderGroup(pioggia, "Giornata di pioggia", CloudRain, "bg-blue-500")}
          </>
        )}
      </div>

      <ProgrammazioneFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={reload}
        editing={editing}
        defaultData={dataSelezionata}
      />
    </div>
  );
}