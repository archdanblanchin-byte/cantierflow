import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sun, CloudRain, ClipboardCheck } from "lucide-react";
import ProgrammazioneCard from "@/components/programmazione/ProgrammazioneCard";

export default function Programma() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [dataSelezionata, setDataSelezionata] = useState(today);

  const { data: programmi = [], isLoading } = useQuery({
    queryKey: ["programma", dataSelezionata],
    queryFn: () => base44.entities.Programmazione.filter({ data: dataSelezionata, stato: "pubblicato" }, "tipo_giornata"),
  });

  const normali = programmi.filter((p) => p.tipo_giornata === "normale");
  const pioggia = programmi.filter((p) => p.tipo_giornata === "pioggia");

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
        <p className="text-sm text-muted-foreground pl-9">Nessuna programmazione pubblicata</p>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <ProgrammazioneCard key={p.id} item={p} readonly />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Programma</h1>
            <p className="text-xs text-muted-foreground">Programmazioni pubblicate</p>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <Input type="date" value={dataSelezionata} onChange={(e) => setDataSelezionata(e.target.value)} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Caricamento...</p>
        ) : programmi.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Nessun programma pubblicato</p>
            <p className="text-sm text-muted-foreground mt-1">Crea e pubblica una programmazione</p>
          </div>
        ) : (
          <>
            {renderGroup(normali, "Giornata normale", Sun, "bg-amber-500")}
            {renderGroup(pioggia, "Giornata di pioggia", CloudRain, "bg-blue-500")}
          </>
        )}
      </div>
    </div>
  );
}