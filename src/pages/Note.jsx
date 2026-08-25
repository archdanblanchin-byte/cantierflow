import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, StickyNote, PenLine, Inbox, Send, User, Share2, MapPin } from "lucide-react";
import NotaVocaleRecorder from "@/components/note/NotaVocaleRecorder";
import NotaFormDialog from "@/components/note/NotaFormDialog";
import NotaReviewDialog from "@/components/note/NotaReviewDialog";
import NotaCard from "@/components/note/NotaCard";
import NotificationsBell from "@/components/NotificationsBell";

export default function Note() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("personali"); // personali | colleghi | cantieri
  const [subCom, setSubCom] = useState("tutte"); // tutte | inviate | ricevute
  const [recorderMode, setRecorderMode] = useState(null); // null | "personale" | "comunicazione"
  const [formOpen, setFormOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState([]);

  useEffect(() => {base44.auth.me().then(setUser).catch(() => {});}, []);

  const { data: cantieri = [] } = useQuery({ queryKey: ["cantieri"], queryFn: () => base44.entities.Cantiere.list() });
  const { data: furgoni = [] } = useQuery({ queryKey: ["furgoni"], queryFn: () => base44.entities.Furgone.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["collaboratori"], queryFn: () => base44.entities.Collaboratore.list() });

  const colleghi = [
  ...users.map((u) => ({ nome: u.full_name || u.email })),
  ...collaboratori.map((c) => ({ nome: c.nome }))];


  const { data: note = [], isLoading } = useQuery({
    queryKey: ["note"],
    queryFn: () => base44.entities.Nota.list("-created_date", 200),
    enabled: !!user
  });

  // Personali: nessun destinatario e nessun cantiere (visibili solo all'autore)
  const personali = note.filter((n) => !n.cantiere_id && (n.destinatari_email || []).length === 0);
  // Condivise con colleghi: hanno destinatari, nessun cantiere
  const noteColleghi = note.filter((n) => !n.cantiere_id && (n.destinatari_email || []).length > 0);
  // Condivise con cantiere: collegate a un cantiere
  const noteCantieri = note.filter((n) => !!n.cantiere_id);
  const colleghiInviate = noteColleghi.filter((n) => n.created_by === user?.email);
  const colleghiRicevute = noteColleghi.filter((n) => (n.destinatari_email || []).includes(user?.email));
  const colleghiFiltered =
  subCom === "inviate" ? colleghiInviate : subCom === "ricevute" ? colleghiRicevute : noteColleghi;

  const sortByCompletato = (arr) => [...arr].sort((a, b) => {
    const ca = a.completato ? 1 : 0;
    const cb = b.completato ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return new Date(b.created_date) - new Date(a.created_date);
  });
  const activeList = tab === "personali" ? personali : tab === "colleghi" ? colleghiFiltered : noteCantieri;
  const list = sortByCompletato(activeList);
  const listAperte = list.filter((n) => !n.completato);
  const listCompletate = list.filter((n) => n.completato);

  const handleResult = (notesArray) => {
    setReviewNotes(notesArray);
    setRecorderMode(null);
    setReviewOpen(true);
  };

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["note"] });
    queryClient.invalidateQueries({ queryKey: ["note-ricevute"] });
    queryClient.invalidateQueries({ queryKey: ["note-cantiere"] });
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
            <p className="text-[11px] text-muted-foreground">Personali, colleghi o cantiere, anche più in una registrazione</p>
          </div>
          <div className="ml-auto"><NotificationsBell /></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {!recorderMode ?
        <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
              onClick={() => setRecorderMode("personale")}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-teal-500/30 transition-all">
              
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center"><User className="w-5 h-5 text-teal-600" /></div>
                <span className="text-sm font-semibold">Personale</span>
                <span className="text-[11px] text-muted-foreground text-center">Solo tu le vedi</span>
              </button>
              <button
              onClick={() => setRecorderMode("comunicazione")}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 hover:shadow-md hover:border-violet-500/30 transition-all">
              
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center"><Share2 className="w-5 h-5 text-violet-600" /></div>
                <span className="text-sm font-semibold">Comunicazione</span>
                <span className="text-[11px] text-muted-foreground text-center">Collegate a colleghi/ruoli</span>
              </button>
            </div>
            <Button variant="outline" className="gap-2 h-10 w-full" onClick={() => {setReviewNotes([]);setFormOpen(true);}}>
              <PenLine className="w-4 h-4" /> Scrivi manualmente una nota
            </Button>
          </div> :

        <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {recorderMode === "personale" ? "Nota personale" : "Nota di comunicazione"}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setRecorderMode(null)}>Annulla</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {recorderMode === "personale" ?
            "Parla liberamente: l'IA crea una o più note personali (promemoria, liste)." :
            "Parla liberamente: l'IA crea uno o più messaggi/liste per le persone citate."}
            </p>
            <NotaVocaleRecorder mode={recorderMode} cantieri={cantieri} furgoni={furgoni} colleghi={colleghi} onResult={handleResult} />
          </div>
        }

        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "personali" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setTab("personali")}>
            <User className="w-3.5 h-3.5" /> Personali ({personali.length})
          </Button>
          <Button variant={tab === "colleghi" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setTab("colleghi")}>
            <Share2 className="w-3.5 h-3.5" /> Colleghi ({noteColleghi.length})
          </Button>
          <Button variant={tab === "cantieri" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setTab("cantieri")}>
            <MapPin className="w-3.5 h-3.5" /> Cantiere ({noteCantieri.length})
          </Button>
        </div>

        {tab === "colleghi" &&
        <div className="flex gap-2 -mt-1">
            <Button variant={subCom === "tutte" ? "secondary" : "ghost"} size="sm" onClick={() => setSubCom("tutte")}>Tutte ({noteColleghi.length})</Button>
            <Button variant={subCom === "inviate" ? "secondary" : "ghost"} size="sm" className="gap-1" onClick={() => setSubCom("inviate")}><Send className="w-3 h-3" /> Inviate ({colleghiInviate.length})</Button>
            <Button variant={subCom === "ricevute" ? "secondary" : "ghost"} size="sm" className="gap-1" onClick={() => setSubCom("ricevute")}><Inbox className="w-3 h-3" /> Ricevute ({colleghiRicevute.length})</Button>
          </div>
        }

        {isLoading ?
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div> :
        list.length === 0 ?
        <div className="text-center py-12 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nessuna nota {tab === "personali" ? "personale" : tab === "colleghi" ? "di comunicazione" : "di cantiere"}</p>
          </div> :

        <div className="space-y-2.5">
            {listAperte.map((n) => <NotaCard key={n.id} nota={n} currentUser={user} />)}
            {listCompletate.length > 0 &&
          <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completate</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2.5">
                  {listCompletate.map((n) => <NotaCard key={n.id} nota={n} currentUser={user} />)}
                </div>
              </div>
          }
          </div>
        }
      </div>

      <NotaFormDialog open={formOpen} onOpenChange={setFormOpen} initial={null} onSaved={onSaved} />
      <NotaReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} notes={reviewNotes} onSaved={onSaved} />
    </div>);

}