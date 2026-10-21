import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, MapPin, Car, Boxes, Send, Inbox, Mic, StickyNote } from "lucide-react";
import NotaVocaleRecorder from "@/components/note/NotaVocaleRecorder";
import NotaFormDialog from "@/components/note/NotaFormDialog";
import NotaReviewDialog from "@/components/note/NotaReviewDialog";
import NotaCard from "@/components/note/NotaCard";
import { caricaTuttiMateriali } from "@/lib/inventario";

/**
 * Comunicazioni condivise: verso colleghi, cantieri, furgoni e materiali.
 */
export default function ComunicazioniPanel({ currentUser }) {
  const queryClient = useQueryClient();
  const [subCom, setSubCom] = useState("colleghi");
  const [subCol, setSubCol] = useState("tutte");
  const [recorderMode, setRecorderMode] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState([]);

  const { data: cantieri = [] } = useQuery({ queryKey: ["cantieri"], queryFn: () => base44.entities.Cantiere.list() });
  const { data: furgoni = [] } = useQuery({ queryKey: ["furgoni"], queryFn: () => base44.entities.Furgone.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["collaboratori"], queryFn: () => base44.entities.Collaboratore.list() });
  const { data: materialiList = [] } = useQuery({ queryKey: ["materiali-base"], queryFn: () => caricaTuttiMateriali() });
  const { data: attrezziList = [] } = useQuery({ queryKey: ["attrezzi"], queryFn: () => base44.entities.AnagrafaAttrezzo.list() });

  const { data: note = [], isLoading } = useQuery({
    queryKey: ["note"],
    queryFn: () => base44.entities.Nota.list("-created_date", 300),
    enabled: !!currentUser,
  });

  const colleghi = [
    ...users.map((u) => ({ nome: u.full_name || u.email })),
    ...collaboratori.map((c) => ({ nome: c.nome })),
  ];

  const comunicazioni = note.filter((n) => n.privata === false && n.tipo !== "task");
  const comCantieri = comunicazioni.filter((n) => !!n.cantiere_id);
  const comFurgoni = comunicazioni.filter((n) => !n.cantiere_id && !!n.furgone_id);
  const comColleghi = comunicazioni.filter((n) => !n.cantiere_id && !n.furgone_id && (n.destinatari_email || []).length > 0);
  const comMateriali = comunicazioni.filter((n) =>
    !n.cantiere_id && !n.furgone_id && !(n.destinatari_email || []).length &&
    ((n.materiali || []).length > 0 || (n.attrezzi || []).length > 0));

  const colleghiInviate = comColleghi.filter((n) => n.created_by === currentUser?.email);
  const colleghiRicevute = comColleghi.filter((n) => (n.destinatari_email || []).includes(currentUser?.email));
  const colleghiFiltered = subCol === "inviate" ? colleghiInviate : subCol === "ricevute" ? colleghiRicevute : comColleghi;

  const attive = subCom === "cantieri" ? comCantieri
    : subCom === "furgoni" ? comFurgoni
    : subCom === "materiali" ? comMateriali
    : colleghiFiltered;

  const lista = [...attive].sort((a, b) => {
    const ca = a.completato ? 1 : 0;
    const cb = b.completato ? 1 : 0;
    if (ca !== cb) return ca - cb;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  const onSaved = () => queryClient.invalidateQueries({ queryKey: ["note"] });

  const emptyText =
    subCom === "cantieri" ? "Nessuna comunicazione di cantiere"
    : subCom === "furgoni" ? "Nessuna comunicazione di furgone"
    : subCom === "materiali" ? "Nessuna comunicazione su materiali o attrezzi"
    : "Nessuna comunicazione";

  return (
    <div className="space-y-4">
      {recorderMode ? (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dettatura · comunicazione</span>
            <Button variant="ghost" size="sm" onClick={() => setRecorderMode(false)}>Annulla</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Parla liberamente: l'IA crea una o più comunicazioni per le persone, i cantieri, i furgoni o i materiali citati.
          </p>
          <NotaVocaleRecorder
            mode="comunicazione"
            cantieri={cantieri}
            furgoni={furgoni}
            colleghi={colleghi}
            materiali={materialiList}
            attrezzi={attrezziList}
            onResult={(notes) => { setReviewNotes(notes); setRecorderMode(false); setReviewOpen(true); }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="gap-2 h-11" onClick={() => setFormOpen(true)}>
            <Share2 className="w-4 h-4" /> Nuova comunicazione
          </Button>
          <Button variant="outline" className="gap-2 h-11" onClick={() => setRecorderMode(true)}>
            <Mic className="w-4 h-4" /> Dettatura
          </Button>
        </div>
      )}

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

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {lista.map((n) => <NotaCard key={n.id} nota={n} currentUser={currentUser} />)}
        </div>
      )}

      <NotaFormDialog open={formOpen} onOpenChange={setFormOpen} initial={null} onSaved={onSaved} mode="comunicazione" />
      <NotaReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} notes={reviewNotes} onSaved={onSaved} mode="comunicazione" />
    </div>
  );
}