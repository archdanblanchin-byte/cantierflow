import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, StickyNote, PenLine, Inbox, Send, User, Share2, MapPin, Car, ListTodo, Plus, Mic, Boxes, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import NotaVocaleRecorder from "@/components/note/NotaVocaleRecorder";
import NotaFormDialog from "@/components/note/NotaFormDialog";
import NotaReviewDialog from "@/components/note/NotaReviewDialog";
import NotaCard from "@/components/note/NotaCard";
import NotificationsBell from "@/components/NotificationsBell";

export default function Note() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [section, setSection] = useState("note"); // note | task | comunicazioni
  const [subCom, setSubCom] = useState("colleghi"); // colleghi | cantieri | furgoni | materiali
  const [subCol, setSubCol] = useState("tutte"); // tutte | inviate | ricevute
  const [recorderMode, setRecorderMode] = useState(null); // null | "personale" | "task" | "comunicazione"
  const [reviewMode, setReviewMode] = useState("personale");
  const [formMode, setFormMode] = useState(null); // null | "personale" | "task" | "comunicazione"
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState([]);
  const [quickTask, setQuickTask] = useState("");
  const [savingQuick, setSavingQuick] = useState(false);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: cantieri = [] } = useQuery({ queryKey: ["cantieri"], queryFn: () => base44.entities.Cantiere.list() });
  const { data: furgoni = [] } = useQuery({ queryKey: ["furgoni"], queryFn: () => base44.entities.Furgone.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["collaboratori"], queryFn: () => base44.entities.Collaboratore.list() });
  const { data: materialiList = [] } = useQuery({ queryKey: ["materiali-base"], queryFn: () => base44.entities.MaterialeBase.list() });
  const { data: attrezziList = [] } = useQuery({ queryKey: ["attrezzi"], queryFn: () => base44.entities.AnagrafaAttrezzo.list() });

  const colleghi = [
    ...users.map((u) => ({ nome: u.full_name || u.email })),
    ...collaboratori.map((c) => ({ nome: c.nome })),
  ];

  const { data: note = [], isLoading } = useQuery({
    queryKey: ["note"],
    queryFn: () => base44.entities.Nota.list("-created_date", 300),
    enabled: !!user,
  });

  // Note personali (escluse le cose da fare)
  const personali = note.filter((n) => n.privata !== false && n.tipo !== "task");
  // Task: miei (personali) + quelli che mi sono stati assegnati
  const mieiTask = note.filter((n) => n.tipo === "task" && (
    (n.privata !== false && n.created_by === user?.email) || (n.destinatari_email || []).includes(user?.email)
  ));
  // Comunicazioni condivise
  const comunicazioni = note.filter((n) => n.privata === false);

  const comCantieri = comunicazioni.filter((n) => !!n.cantiere_id);
  const comFurgoni = comunicazioni.filter((n) => !n.cantiere_id && !!n.furgone_id);
  const comColleghi = comunicazioni.filter((n) => !n.cantiere_id && !n.furgone_id && (n.destinatari_email || []).length > 0);
  const comMateriali = comunicazioni.filter((n) =>
    !n.cantiere_id && !n.furgone_id && !(n.destinatari_email || []).length &&
    ((n.materiali || []).length > 0 || (n.attrezzi || []).length > 0));

  const colleghiInviate = comColleghi.filter((n) => n.created_by === user?.email);
  const colleghiRicevute = comColleghi.filter((n) => (n.destinatari_email || []).includes(user?.email));
  const colleghiFiltered = subCol === "inviate" ? colleghiInviate : subCol === "ricevute" ? colleghiRicevute : comColleghi;

  const sortByCompletato = (arr) => [...arr].sort((a, b) => {
    const ca = a.completato ? 1 : 0;
    const cb = b.completato ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const activeCom = subCom === "cantieri" ? comCantieri
    : subCom === "furgoni" ? comFurgoni
    : subCom === "materiali" ? comMateriali
    : colleghiFiltered;

  const activeList = section === "note" ? personali : section === "task" ? mieiTask : activeCom;
  const list = sortByCompletato(activeList);
  const listAperte = list.filter((n) => !n.completato);
  const listCompletate = list.filter((n) => n.completato);

  const handleResult = (notesArray) => {
    setReviewNotes(notesArray);
    setReviewMode(recorderMode || "personale");
    setRecorderMode(null);
    setReviewOpen(true);
  };

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["note"] });
    queryClient.invalidateQueries({ queryKey: ["note-ricevute"] });
    queryClient.invalidateQueries({ queryKey: ["note-cantiere"] });
  };

  const salvaQuickTask = async () => {
    const testo = quickTask.trim();
    if (!testo) return;
    setSavingQuick(true);
    try {
      await base44.entities.Nota.create({
        testo, tipo: "task", privata: true, items: [],
        destinatari_email: [], destinatari_nomi: [], materiali: [], attrezzi: [],
        priorita: "media", origine: "manuale",
      });
      setQuickTask("");
      onSaved();
      toast.success("Task aggiunto");
    } catch (e) {
      toast.error("Errore: " + e.message);
    } finally {
      setSavingQuick(false);
    }
  };

  const emptyText =
    section === "note" ? "Nessuna nota personale"
    : section === "task" ? "Nessun task da fare"
    : subCom === "cantieri" ? "Nessuna comunicazione di cantiere"
    : subCom === "furgoni" ? "Nessuna comunicazione di furgone"
    : subCom === "materiali" ? "Nessuna comunicazione su materiali o attrezzi"
    : "Nessuna comunicazione";

  const recorderLabel = recorderMode === "task" ? "task" : recorderMode === "personale" ? "nota personale" : "comunicazione";

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
            <h1 className="text-lg font-bold leading-tight">Note, Task e Comunicazioni</h1>
            <p className="text-[11px] text-muted-foreground">Il tuo spazio personale e i collegamenti con l'app</p>
          </div>
          <div className="ml-auto"><NotificationsBell /></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Segmented control sezioni */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted">
          <button
            onClick={() => { setSection("note"); setRecorderMode(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${section === "note" ? "bg-card text-teal-600 shadow-sm" : "text-muted-foreground"}`}
          >
            <User className="w-4 h-4" /> Note
          </button>
          <button
            onClick={() => { setSection("task"); setRecorderMode(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${section === "task" ? "bg-card text-emerald-600 shadow-sm" : "text-muted-foreground"}`}
          >
            <ListTodo className="w-4 h-4" /> Task
          </button>
          <button
            onClick={() => { setSection("comunicazioni"); setRecorderMode(null); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors ${section === "comunicazioni" ? "bg-card text-violet-600 shadow-sm" : "text-muted-foreground"}`}
          >
            <Share2 className="w-4 h-4" /> Comunicazioni
          </button>
        </div>

        {/* Registratore vocale (comune alle tre sezioni) */}
        {recorderMode ? (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dettatura · {recorderLabel}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setRecorderMode(null)}>Annulla</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {recorderMode === "comunicazione"
                ? "Parla liberamente: l'IA crea una o più comunicazioni per le persone, i cantieri, i furgoni o i materiali citati."
                : recorderMode === "task"
                ? "Parla liberamente: l'IA crea uno o più task da svolgere."
                : "Parla liberamente: l'IA crea una o più note personali (promemoria, liste)."}
            </p>
            <NotaVocaleRecorder
              mode={recorderMode}
              cantieri={cantieri}
              furgoni={furgoni}
              colleghi={colleghi}
              materiali={materialiList}
              attrezzi={attrezziList}
              onResult={handleResult}
            />
          </div>
        ) : (
          <>
            {section === "note" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2 h-11" onClick={() => setFormMode("personale")}>
                    <PenLine className="w-4 h-4" /> Scrivi nota
                  </Button>
                  <Button variant="outline" className="gap-2 h-11" onClick={() => setRecorderMode("personale")}>
                    <Mic className="w-4 h-4" /> Dettatura
                  </Button>
                </div>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="w-3 h-3" /> Con «Scrivi nota» puoi anche far scrivere e strutturare la nota all'IA.
                </p>
              </div>
            )}

            {section === "task" && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={quickTask}
                    onChange={(e) => setQuickTask(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); salvaQuickTask(); } }}
                    placeholder="Scrivi un task e premi +"
                  />
                  <Button onClick={salvaQuickTask} disabled={!quickTask.trim() || savingQuick} size="icon" className="shrink-0" aria-label="Aggiungi task">
                    {savingQuick ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setFormMode("task")}>
                    <ListTodo className="w-3.5 h-3.5" /> Task con dettagli
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setRecorderMode("task")}>
                    <Mic className="w-3.5 h-3.5" /> Dettatura
                  </Button>
                </div>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="w-3 h-3" /> In «Task con dettagli» puoi far strutturare il testo all'IA.
                </p>
              </div>
            )}

            {section === "comunicazioni" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2 h-11" onClick={() => setFormMode("comunicazione")}>
                    <Share2 className="w-4 h-4" /> Nuova comunicazione
                  </Button>
                  <Button variant="outline" className="gap-2 h-11" onClick={() => setRecorderMode("comunicazione")}>
                    <Mic className="w-4 h-4" /> Dettatura
                  </Button>
                </div>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Sparkles className="w-3 h-3" /> Puoi scriverla a mano o farla strutturare all'IA, con collegamenti a persone e cantieri.
                </p>
              </div>
            )}
          </>
        )}

        {/* Sub-filtri comunicazioni */}
        {section === "comunicazioni" && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button variant={subCom === "colleghi" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setSubCom("colleghi")}>
                <Share2 className="w-3.5 h-3.5" /> Colleghi ({comColleghi.length})
              </Button>
              <Button variant={subCom === "cantieri" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setSubCom("cantieri")}>
                <MapPin className="w-3.5 h-3.5" /> Cantieri ({comCantieri.length})
              </Button>
              <Button variant={subCom === "furgoni" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setSubCom("furgoni")}>
                <Car className="w-3.5 h-3.5" /> Furgoni ({comFurgoni.length})
              </Button>
              <Button variant={subCom === "materiali" ? "default" : "outline"} size="sm" className="gap-1.5" onClick={() => setSubCom("materiali")}>
                <Boxes className="w-3.5 h-3.5" /> Materiali ({comMateriali.length})
              </Button>
            </div>
            {subCom === "colleghi" && (
              <div className="flex gap-2">
                <Button variant={subCol === "tutte" ? "secondary" : "ghost"} size="sm" onClick={() => setSubCol("tutte")}>Tutte ({comColleghi.length})</Button>
                <Button variant={subCol === "inviate" ? "secondary" : "ghost"} size="sm" className="gap-1" onClick={() => setSubCol("inviate")}><Send className="w-3 h-3" /> Inviate ({colleghiInviate.length})</Button>
                <Button variant={subCol === "ricevute" ? "secondary" : "ghost"} size="sm" className="gap-1" onClick={() => setSubCol("ricevute")}><Inbox className="w-3 h-3" /> Ricevute ({colleghiRicevute.length})</Button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : list.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {listAperte.map((n) => <NotaCard key={n.id} nota={n} currentUser={user} variant={section === "task" ? "task" : undefined} />)}
            {listCompletate.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section === "task" ? "Completati" : "Completate"}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2.5">
                  {listCompletate.map((n) => <NotaCard key={n.id} nota={n} currentUser={user} variant={section === "task" ? "task" : undefined} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <NotaFormDialog
        open={!!formMode}
        onOpenChange={(o) => !o && setFormMode(null)}
        initial={null}
        onSaved={onSaved}
        mode={formMode || "personale"}
      />
      <NotaReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} notes={reviewNotes} onSaved={onSaved} mode={reviewMode} />
    </div>
  );
}