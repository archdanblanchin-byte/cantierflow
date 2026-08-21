import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, RefreshCw, CalendarRange } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import CronoItem from "@/components/cronoprogramma/CronoItem";
import CronoFormDialog from "@/components/cronoprogramma/CronoFormDialog";
import { useToast } from "@/components/ui/use-toast";

function genSyncId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

export default function Cronoprogramma() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["cronoprogramma"],
    queryFn: () => base44.entities.Cronoprogramma.list("ordine", 500),
  });

  const syncMut = useMutation({
    mutationFn: () => base44.functions.invoke("sync_cronoprogramma", { action: "sync" }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["cronoprogramma"] });
      const d = res?.data || {};
      toast({ title: "Sincronizzato", description: `Importati: ${d.pulled ?? 0} · Inviati: ${d.pushed ?? 0}` });
    },
    onError: (err) => {
      toast({ title: "Errore sincronizzazione", description: err?.response?.data?.error || err.message, variant: "destructive" });
    },
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.Cronoprogramma.create({ ...data, sync_id: genSyncId(), sync_version: 1, origine: "locale" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cronoprogramma"] }); setDialogOpen(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data, version }) => base44.entities.Cronoprogramma.update(id, { ...data, sync_version: (version || 0) + 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cronoprogramma"] }); setDialogOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Cronoprogramma.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cronoprogramma"] }),
  });

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item) => { setEditing(item); setDialogOpen(true); };
  const onSubmit = (data) => {
    if (editing) updateMut.mutate({ id: editing.id, data, version: editing.sync_version });
    else createMut.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2"><CalendarRange className="w-5 h-5" /> Cronoprogramma</h1>
            <p className="text-xs text-muted-foreground">Sincronizzato con l'app Workflow</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            <RefreshCw className={`w-4 h-4 ${syncMut.isPending ? "animate-spin" : ""}`} />
            Sincronizza
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={openNew}>
            <Plus className="w-4 h-4" /> Aggiungi fase
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <CalendarRange className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="font-medium">Nessuna fase nel cronoprogramma</p>
            <p className="text-sm mt-1">Aggiungi una fase o sincronizza con l'app Workflow.</p>
          </Card>
        ) : (
          items.map((item) => (
            <CronoItem
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => { if (confirm("Eliminare questa fase?")) deleteMut.mutate(item.id); }}
            />
          ))
        )}
      </div>

      <CronoFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={onSubmit}
        initial={editing}
      />
      <BottomNav />
    </div>
  );
}