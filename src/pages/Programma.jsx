import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Sun, CloudRain, ClipboardCheck, Trash2, CheckSquare, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { usePermessi } from "@/hooks/usePermessi";
import ProgrammazioneCard from "@/components/programmazione/ProgrammazioneCard";
import ProgrammazioneFormDialog from "@/components/programmazione/ProgrammazioneFormDialog";

export default function Programma() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const embed = params.get("embed") === "1";
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const domani = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [dataSelezionata, setDataSelezionata] = useState(domani);
  const { isGestore } = usePermessi();
  const shiftDay = (delta) => {
    setDir(delta);
    const d = new Date(dataSelezionata + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setDataSelezionata(`${y}-${m}-${day}`);
  };

  const { data: programmi = [], isLoading } = useQuery({
    queryKey: ["programma", dataSelezionata],
    queryFn: () => base44.entities.Programmazione.filter({ data: dataSelezionata, stato: "pubblicato" }, "tipo_giornata"),
  });

  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // Note condivise di cantiere (non completate) per mostrare la pallina rosa
  const { data: noteCantiere = [] } = useQuery({
    queryKey: ["note-cantiere"],
    queryFn: () => base44.entities.Nota.list("-created_date", 500),
  });
  const noteByCantiere = useMemo(() => {
    const map = {};
    noteCantiere.forEach((n) => {
      if (!n.cantiere_id || n.completato) return;
      (map[n.cantiere_id] = map[n.cantiere_id] || []).push(n);
    });
    return map;
  }, [noteCantiere]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [dir, setDir] = useState(0);

  const reload = () => {
    qc.invalidateQueries({ queryKey: ["programma", dataSelezionata] });
    qc.invalidateQueries({ queryKey: ["programmazioni", dataSelezionata] });
  };

  const handleEdit = (item) => { setEditing(item); setDialogOpen(true); };

  const handleDelete = async (item) => {
    if (!confirm("Eliminare questo programma?")) return;
    try {
      await base44.entities.Programmazione.delete(item.id);
      toast.success("Programma eliminato");
      reload();
    } catch {
      toast.error("Errore nell'eliminazione");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const enterSelect = () => { setSelectMode(true); setSelectedIds(new Set()); };
  const exitSelect = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const handleDeleteGroup = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Eliminare ${selectedIds.size} programmi selezionati?`)) return;
    try {
      for (const id of selectedIds) {
        await base44.entities.Programmazione.delete(id);
      }
      toast.success(`${selectedIds.size} programmi eliminati`);
      exitSelect();
      reload();
    } catch {
      toast.error("Errore nell'eliminazione di gruppo");
    }
  };

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
            <ProgrammazioneCard
              key={p.id}
              item={p}
              readonly
              canManage={isGestore}
              selectable={selectMode}
              selected={selectedIds.has(p.id)}
              onToggleSelect={() => toggleSelect(p.id)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              cantiereNotes={noteByCantiere[p.cantiere_id] || []}
              currentUser={user}
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
            <h1 className="font-bold text-lg">Programma</h1>
            <p className="text-xs text-muted-foreground">Programmazioni pubblicate</p>
          </div>
          {isGestore && !selectMode && (
            <Button variant="outline" size="icon" onClick={enterSelect} title="Seleziona multipla">
              <CheckSquare className="w-4 h-4" />
            </Button>
          )}
          {isGestore && selectMode && (
            <Button variant="ghost" size="sm" onClick={exitSelect}>
              <X className="w-4 h-4" />Annulla
            </Button>
          )}
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3 flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)} title="Giorno precedente">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Input type="date" value={dataSelezionata} onChange={(e) => setDataSelezionata(e.target.value)} className="flex-1 text-center" />
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)} title="Giorno successivo">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {selectMode && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-sm sticky top-[120px] z-10">
            <span className="text-sm font-medium">{selectedIds.size} selezionate</span>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={selectedIds.size === 0}
              onClick={handleDeleteGroup}
            >
              <Trash2 className="w-4 h-4" />Elimina selezionate
            </Button>
          </div>
        )}
        <AnimatePresence mode="popLayout" custom={dir}>
          <motion.div
            key={dataSelezionata}
            initial={dir === 0 ? { opacity: 0 } : dir > 0 ? { x: 60, opacity: 0 } : { x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={dir === 0 ? { opacity: 0 } : dir > 0 ? { x: -60, opacity: 0 } : { x: 60, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
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
          </motion.div>
        </AnimatePresence>
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