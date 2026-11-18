import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DatiClienteSection from "./DatiClienteSection";
import RilieviSection from "./RilieviSection";
import NoteAISection from "./NoteAISection";
import LavorazioniAISection from "./LavorazioniAISection";
import MediaSection from "./MediaSection";
import useSopralluogoAnagrafiche from "@/hooks/useSopralluogoAnagrafiche";
import { nuovoSopralluogo, payloadDaDraft } from "@/lib/sopralluogo";

const Sezione = ({ titolo, children }) => (
  <Card className="p-4 space-y-3">
    <h2 className="font-semibold">{titolo}</h2>
    {children}
  </Card>
);

// Il form lavora su una copia: le modifiche restano nel form finché non si salva.
export default function SopralluogoForm({ record, onBack, onSaved }) {
  const queryClient = useQueryClient();
  const anag = useSopralluogoAnagrafiche();
  const iniziale = useMemo(() => JSON.stringify(record || nuovoSopralluogo()), [record]);
  const [draft, setDraft] = useState(() => JSON.parse(iniziale));
  const [base, setBase] = useState(iniziale);
  const [saving, setSaving] = useState(false);
  const [uscita, setUscita] = useState(false);
  const [errore, setErrore] = useState("");

  const dirty = JSON.stringify(draft) !== base;
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    if (!dirty) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const salva = async () => {
    if (!String(draft.cognome || "").trim()) {
      setErrore("Il cognome è obbligatorio.");
      setUscita(false);
      return false;
    }
    setErrore("");
    setSaving(true);
    try {
      const payload = payloadDaDraft(draft);
      const saved = draft.id
        ? await base44.entities.Sopralluogo.update(draft.id, payload)
        : await base44.entities.Sopralluogo.create(payload);
      await queryClient.invalidateQueries({ queryKey: ["sopralluoghi"] });
      const nuovo = { ...draft, ...saved };
      setDraft(nuovo);
      setBase(JSON.stringify(nuovo));
      setUscita(false);
      toast.success("Sopralluogo salvato");
      onSaved?.(saved);
      return true;
    } catch (e) {
      setErrore(`Salvataggio non riuscito: ${e?.message || "riprova tra poco"}`);
      setUscita(false);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const indietro = () => (dirty ? setUscita(true) : onBack());

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-28 space-y-4">
      <h1 className="text-xl font-bold">{draft.id ? "Modifica sopralluogo" : "Nuovo sopralluogo"}</h1>
      <Sezione titolo="1. Dati cliente"><DatiClienteSection draft={draft} set={set} /></Sezione>
      <Sezione titolo="2. Misure e rilievo"><RilieviSection draft={draft} set={set} anag={anag} /></Sezione>
      <Sezione titolo="3. Informazioni cliente e cantiere"><NoteAISection draft={draft} set={set} /></Sezione>
      <Sezione titolo="4. Lavorazioni da eseguire"><LavorazioniAISection draft={draft} set={set} /></Sezione>
      <Sezione titolo="5. Foto, immagini e documenti"><MediaSection draft={draft} set={set} /></Sezione>
      {errore && <p className="text-sm text-destructive">{errore}</p>}

      <div className="fixed bottom-0 inset-x-0 z-20 bg-card border-t safe-area-bottom">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="outline" className="gap-1.5" onClick={indietro}><ArrowLeft className="w-4 h-4" />Indietro</Button>
          {dirty && <span className="text-xs text-amber-600">Modifiche non salvate</span>}
          <Button className="ml-auto gap-1.5" disabled={saving || (!dirty && !!draft.id)} onClick={salva}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salva
          </Button>
        </div>
      </div>

      <AlertDialog open={uscita} onOpenChange={setUscita}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifiche non salvate</AlertDialogTitle>
            <AlertDialogDescription>Se esci ora le modifiche andranno perse.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continua a modificare</AlertDialogCancel>
            <Button variant="outline" onClick={() => { setUscita(false); onBack(); }}>Scarta</Button>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); salva().then((ok) => ok && onBack()); }}>Salva</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}