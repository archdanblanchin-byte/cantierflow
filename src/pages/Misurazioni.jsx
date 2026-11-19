import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ruler, Trash2, FolderOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { arr } from "@/lib/misure";

export default function Misurazioni() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");

  const { data: progetti = [], isLoading } = useQuery({
    queryKey: ["misure-progetti"],
    queryFn: async () => arr(await base44.entities.SurveyProject.list("-created_date", 200)),
  });

  const crea = async () => {
    if (!nome.trim()) return;
    const p = await base44.entities.SurveyProject.create({ name: nome.trim() });
    setNome("");
    navigate(`/strumenti/misurazioni/${p.id}`);
  };

  const elimina = async (p) => {
    if (!window.confirm("Eliminare il progetto e tutte le sue pagine e misurazioni?")) return;
    await base44.entities.Measurement.deleteMany({ project_id: p.id });
    await base44.entities.SurveyPage.deleteMany({ project_id: p.id });
    await base44.entities.SurveyProject.delete(p.id);
    qc.invalidateQueries({ queryKey: ["misure-progetti"] });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/strumenti")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center"><Ruler className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Misurazioni</h1>
            <p className="text-xs text-muted-foreground">Misurazione di planimetrie e disegni tecnici</p>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); crea(); }}>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome nuovo progetto (es. Condominio Via Roma)" />
          <Button type="submit" disabled={!nome.trim()}>Nuovo progetto</Button>
        </form>
        {!isLoading && progetti.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-40" />
            Nessun progetto. Creane uno per iniziare.
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {progetti.map((p) => (
            <div key={p.id} onClick={() => navigate(`/strumenti/misurazioni/${p.id}`)}
              className="group relative bg-card rounded-xl border border-border p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3" style={{ backgroundColor: p.color || "#0ea5e9" }}>
                <Ruler className="w-5 h-5" />
              </div>
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.description || "Nessuna descrizione"}</div>
              <button type="button" onClick={(e) => { e.stopPropagation(); elimina(p); }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}