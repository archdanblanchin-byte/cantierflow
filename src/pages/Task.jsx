import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ListTodo, Plus, Loader2, Send, CheckCheck, Share2, User } from "lucide-react";
import { toast } from "sonner";
import TaskCard from "@/components/task/TaskCard";
import TaskFormDialog from "@/components/task/TaskFormDialog";
import ComunicazioniPanel from "@/components/note/ComunicazioniPanel";
import NotificationsBell from "@/components/NotificationsBell";

const TABS = [
  { key: "da_fare", label: "Da fare", icon: ListTodo },
  { key: "assegnati", label: "Assegnati da me", icon: Send },
  { key: "completati", label: "Completati", icon: CheckCheck },
  { key: "comunicazioni", label: "Comunicazioni", icon: Share2 },
];

/**
 * Task personali e task assegnati ad altri utenti, con notifiche di
 * assegnazione e di completamento.
 */
export default function Task() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("da_fare");
  const [formOpen, setFormOpen] = useState(false);
  const [quick, setQuick] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: note = [], isLoading } = useQuery({
    queryKey: ["note"],
    queryFn: () => base44.entities.Nota.list("-created_date", 300),
    enabled: !!user,
  });

  const task = note.filter((n) => n.tipo === "task");
  const email = user?.email;

  const miei = task.filter((n) => n.created_by === email || (n.destinatari_email || []).includes(email));
  const daFare = miei
    .filter((n) => !n.completato && (n.created_by === email || (n.destinatari_email || []).includes(email)))
    .filter((n) => !((n.destinatari_email || []).length > 0 && !(n.destinatari_email || []).includes(email)))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const assegnati = miei
    .filter((n) => !n.completato && n.created_by === email && (n.destinatari_email || []).length > 0 && !(n.destinatari_email || []).includes(email))
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const completati = miei
    .filter((n) => n.completato)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["note"] });

  const salvaQuick = async () => {
    const testo = quick.trim();
    if (!testo) return;
    setSalvando(true);
    try {
      await base44.entities.Nota.create({
        testo, tipo: "task", privata: true, items: [],
        destinatari_email: [], destinatari_nomi: [],
        assegnato_da: email, assegnato_da_nome: user?.full_name || email,
        priorita: "media", origine: "manuale",
      });
      setQuick("");
      refresh();
      toast.success("Task aggiunto");
    } catch (e) {
      toast.error("Errore: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const lista = tab === "da_fare" ? daFare : tab === "assegnati" ? assegnati : completati;
  const vuoto = tab === "da_fare" ? "Nessun task da fare"
    : tab === "assegnati" ? "Non hai assegnato task ad altri"
    : "Nessun task completato";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors" aria-label="Indietro">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Task</h1>
            <p className="text-[11px] text-muted-foreground">I tuoi task e quelli che assegni agli altri</p>
          </div>
          <div className="ml-auto"><NotificationsBell /></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-colors leading-tight text-center ${tab === t.key ? "bg-card text-emerald-600 shadow-sm" : "text-muted-foreground"}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "comunicazioni" ? (
          <ComunicazioniPanel currentUser={user} />
        ) : (
          <>
            {tab === "da_fare" && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={quick}
                    onChange={(e) => setQuick(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); salvaQuick(); } }}
                    placeholder="Scrivi un task e premi +"
                    className="text-base sm:text-sm"
                  />
                  <Button onClick={salvaQuick} disabled={!quick.trim() || salvando} size="icon" className="shrink-0" aria-label="Aggiungi task">
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full" onClick={() => setFormOpen(true)}>
                  <User className="w-3.5 h-3.5" /> Task con dettagli o assegnato a qualcuno
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : lista.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{vuoto}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lista.map((n) => <TaskCard key={n.id} nota={n} currentUser={user} onChanged={refresh} />)}
              </div>
            )}
          </>
        )}
      </div>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} initial={null} onSaved={refresh} />
    </div>
  );
}