import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, StickyNote, Mic, PenLine, Inbox, Send } from "lucide-react";
import NotaVocaleRecorder from "@/components/note/NotaVocaleRecorder";
import NotaFormDialog from "@/components/note/NotaFormDialog";
import NotaCard from "@/components/note/NotaCard";
import NotificationsBell from "@/components/NotificationsBell";

export default function Note() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("mie"); // mie | ricevute
  const [showRecorder, setShowRecorder] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [initial, setInitial] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: cantieri = [] } = useQuery({ queryKey: ["cantieri"], queryFn: () => base44.entities.Cantiere.list() });
  const { data: furgoni = [] } = useQuery({ queryKey: ["furgoni"], queryFn: () => base44.entities.Furgone.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["collaboratori"], queryFn: () => base44.entities.Collaboratore.list() });

  const colleghi = [
    ...users.map((u) => ({ nome: u.full_name || u.email })),
    ...collaboratori.map((c) => ({ nome: c.nome })),
  ];

  const { data: note = [], isLoading } = useQuery({
    queryKey: ["note"],
    queryFn: () => base44.entities.Nota.list("-created_date", 200),
    enabled: !!user,
  });

  const mie = note.filter((n) => n.created_by === user?.email);
  const ricevute = note.filter((n) => (n.destinatari_email || []).includes(user?.email));
  const list = tab === "mie" ? mie : ricevute;

  const handleResult = (parsed) => {
    setInitial(parsed);
    setShowRecorder(false);
    setFormOpen(true);
  };

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["note"] });
    queryClient.invalidateQueries({ queryKey: ["note-ricevute"] });
  };

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
            <p className="text-[11px] text-muted-foreground">Vocali, promemoria, liste e messaggi</p>
          </div>
          <div className="ml-auto"><NotificationsBell /></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="space-y-2">
          {!showRecorder ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2 h-11" onClick={() => setShowRecorder(true)}>
                <Mic className="w-4 h-4 text-rose-500" /> Nota vocale
              </Button>
              <Button variant="outline" className="gap-2 h-11" onClick={() => { setInitial(null); setFormOpen(true); }}>
                <PenLine className="w-4 h-4" /> Scrivi manualmente
              </Button>
            </div>
          ) : (
            <NotaVocaleRecorder cantieri={cantieri} furgoni={furgoni} colleghi={colleghi} onResult={handleResult} />
          )}
        </div>

        <div className="flex gap-2">
          <Button variant={tab === "mie" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setTab("mie")}>
            <Send className="w-3.5 h-3.5" /> Le mie ({mie.length})
          </Button>
          <Button variant={tab === "ricevute" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setTab("ricevute")}>
            <Inbox className="w-3.5 h-3.5" /> Ricevute ({ricevute.length})
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{tab === "mie" ? "Nessuna nota creata" : "Nessuna nota ricevuta"}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((n) => <NotaCard key={n.id} nota={n} currentUser={user} />)}
          </div>
        )}
      </div>

      <NotaFormDialog open={formOpen} onOpenChange={setFormOpen} initial={initial} onSaved={onSaved} />
    </div>
  );
}