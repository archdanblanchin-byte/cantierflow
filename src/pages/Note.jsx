import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, StickyNote, PenLine, Mic, Plus } from "lucide-react";
import NotaVocaleRecorder from "@/components/note/NotaVocaleRecorder";
import NotaReviewDialog from "@/components/note/NotaReviewDialog";
import NotaCard from "@/components/note/NotaCard";
import NotaEditorDialog from "@/components/note/NotaEditorDialog";
import NotificationsBell from "@/components/NotificationsBell";

/**
 * Note personali: appunti, checklist, disegni e file. Solo per chi li scrive.
 */
export default function Note() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [recording, setRecording] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cantieri = [] } = useQuery({ queryKey: ["cantieri"], queryFn: () => base44.entities.Cantiere.list() });
  const { data: furgoni = [] } = useQuery({ queryKey: ["furgoni"], queryFn: () => base44.entities.Furgone.list() });

  const { data: note = [], isLoading } = useQuery({
    queryKey: ["note"],
    queryFn: () => base44.entities.Nota.list("-created_date", 300),
    enabled: !!user,
  });

  // Solo note personali: niente task (che stanno nella loro finestra) né comunicazioni.
  const mie = note.filter((n) => n.privata !== false && n.tipo !== "task" && n.created_by === user?.email);

  const onSaved = () => queryClient.invalidateQueries({ queryKey: ["note"] });

  const nuova = () => { setEditing(null); setEditorOpen(true); };
  const modifica = (nota) => { setEditing(nota); setEditorOpen(true); };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors" aria-label="Indietro">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center">
            <StickyNote className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Note</h1>
            <p className="text-[11px] text-muted-foreground">Appunti, checklist, disegni e file · solo per te</p>
          </div>
          <div className="ml-auto"><NotificationsBell /></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button className="gap-2 h-11" onClick={nuova}>
            <Plus className="w-4 h-4" /> Nuova nota
          </Button>
          <Button variant="outline" className="gap-2 h-11" onClick={() => setRecording((r) => !r)}>
            <Mic className="w-4 h-4" /> Dettatura
          </Button>
        </div>

        {recording && (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dettatura · nota personale</span>
              <Button variant="ghost" size="sm" onClick={() => setRecording(false)}>Annulla</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Parla liberamente: l'IA crea una o più note personali (promemoria, liste).</p>
            <NotaVocaleRecorder
              mode="personale"
              cantieri={cantieri}
              furgoni={furgoni}
              onResult={(notes) => { setReviewNotes(notes); setRecording(false); setReviewOpen(true); }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : mie.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <PenLine className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nessuna nota. Tocca «Nuova nota» per iniziare.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {mie.map((n) => (
              <div key={n.id} onClick={() => modifica(n)}>
                <NotaCard nota={n} currentUser={user} />
              </div>
            ))}
          </div>
        )}
      </div>

      <NotaEditorDialog open={editorOpen} onOpenChange={setEditorOpen} initial={editing} onSaved={onSaved} />
      <NotaReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} notes={reviewNotes} onSaved={onSaved} mode="personale" />
    </div>
  );
}