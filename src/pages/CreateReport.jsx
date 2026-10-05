import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

import RapportinoUnico from "@/components/rapportino/RapportinoUnico";
import { computePartecipantiEmail } from "@/lib/rapportinoPartecipanti";
import { usePermessoRapportinoManuale } from "@/hooks/usePermessoRapportinoManuale";
import { fmtOre } from "@/lib/timbratureUtils";
import { buildSquadraDaTimbrature, getRapportinoCantiereGiorno } from "@/lib/rapportiniFromTimbrature";

const AUTOSAVE_INTERVAL = 60000; // 1 minuto

export default function CreateReport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canCreate, isLoading: isLoadingPermesso } = usePermessoRapportinoManuale();
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [rapportinoEsistente, setRapportinoEsistente] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const autosaveRef = useRef(null);

  const [formData, setFormData] = useState({
    data: new Date().toISOString(),
    user_email: "",
    cantiere_id: "",
    cantiere_nome: "",
    foto: [],
    foto_annotate: [],
    note_generali: "",
    ore_utilizzo_piattaforma: 0,
    descrizione_noleggio_mezzi: "",
    ore_noleggio_mezzi: 0,
    descrizione_noleggio_plexi: "",
    ore_noleggio_plexi: 0,
    ore_totali_squadra: 8,
    collaboratori: [],
    has_lavorazioni_extra: false,
    lavorazioni_extra: [],
    lavorazioni_normali: [],
    materiali: [],
    stato: "bozza",
    partecipanti_email: [],
  });

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user) {
        setFormData((prev) => ({ ...prev, user_email: user.email }));
        setIsAdmin(user.role === "admin");
      }
    });
  }, []);

  // Accesso riservato: solo l'amministratore o utenti autorizzati per oggi.
  useEffect(() => {
    if (!isLoadingPermesso && !canCreate) {
      toast.error("Non hai il permesso per creare un rapportino. Richiedi l'autorizzazione all'amministratore per oggi.");
      navigate("/");
    }
  }, [canCreate, isLoadingPermesso, navigate]);

  useEffect(() => {
    autosaveRef.current = formData;
  }, [formData]);

  // Salva la bozza e lascia il rapportino aperto (compilazione progressiva)
  const salvaBozza = async (silenzioso = false) => {
    const data = autosaveRef.current;
    if (!data?.cantiere_id) {
      if (!silenzioso) toast.error("Seleziona il cantiere prima di salvare");
      return null;
    }
    setSavingDraft(true);
    try {
      if (draftId) {
        await base44.entities.Rapportino.update(draftId, { ...data, stato: "bozza" });
      } else {
        const esistente = await getRapportinoCantiereGiorno(data.cantiere_id, data.data || new Date());
        if (esistente) {
          setRapportinoEsistente(esistente);
          if (!silenzioso) toast.error("Esiste già il rapportino di questo cantiere: aprilo per compilarlo");
          return null;
        }
        const salvato = await base44.entities.Rapportino.create({ ...data, stato: "bozza" });
        setDraftId(salvato.id);
      }
      setLastSaved(new Date());
      if (!silenzioso) toast.success("Rapportino salvato: puoi riprenderlo più tardi");
      return true;
    } catch (err) {
      if (!silenzioso) toast.error("Errore nel salvataggio: " + (err?.message || "riprova"));
      return null;
    } finally {
      setSavingDraft(false);
    }
  };

  // Autosalvataggio di sicurezza: non perde nulla se il telefono si chiude
  useEffect(() => {
    const interval = setInterval(() => {
      if (rapportinoEsistente) return;
      salvaBozza(true);
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, rapportinoEsistente]);

  const { data: cantieri = [], refetch: refetchCantieri } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list(),
  });
  const { data: collaboratoriList = [] } = useQuery({
    queryKey: ["collaboratori"],
    queryFn: () => base44.entities.Collaboratore.list(),
  });
  const { data: tipiLavorazione = [] } = useQuery({
    queryKey: ["tipiLavorazione"],
    queryFn: () => base44.entities.TipoLavorazione.list(),
  });
  const { data: materialiBase = [] } = useQuery({
    queryKey: ["materialiBase"],
    queryFn: () => base44.entities.MaterialeBase.list(),
  });

  // Mantiene aggiornata la lista email dei partecipanti (autore + collaboratori)
  useEffect(() => {
    const pe = computePartecipantiEmail(formData, collaboratoriList, formData.user_email);
    setFormData((prev) => {
      if (JSON.stringify(prev.partecipanti_email || []) === JSON.stringify(pe)) return prev;
      return { ...prev, partecipanti_email: pe };
    });
  }, [formData.collaboratori, formData.user_email, collaboratoriList]);

  const giornoKey = formData.data ? format(new Date(formData.data), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  // La squadra arriva dalle timbrature: il capo cantiere non inserisce le persone a mano
  useEffect(() => {
    if (!formData.cantiere_id) return;
    let annullato = false;
    const g = new Date(formData.data || new Date());
    const inizioG = new Date(g); inizioG.setHours(0, 0, 0, 0);
    const fineG = new Date(g); fineG.setHours(23, 59, 59, 999);
    base44.entities.Timbratura.filter({
      cantiere_id: formData.cantiere_id,
      data_ora: { $gte: inizioG.toISOString(), $lt: fineG.toISOString() },
    }).then((timb) => {
      if (annullato) return;
      const squadra = buildSquadraDaTimbrature(timb, collaboratoriList);
      setFormData((prev) => {
        if (prev.cantiere_id !== formData.cantiere_id) return prev;
        const note = new Map((prev.collaboratori || []).map((c) => [c.user_email || c.collaboratore_id, c.note_imprevisti || ""]));
        const righe = squadra.map((r) => ({ ...r, note_imprevisti: note.get(r.user_email || r.collaboratore_id) || "" }));
        const ore = righe.reduce((s, r) => s + (r.ore_lavorate || 0), 0);
        return { ...prev, collaboratori: righe, ore_totali_squadra: ore > 0 ? ore : prev.ore_totali_squadra };
      });
    }).catch(() => {});
    return () => { annullato = true; };
  }, [formData.cantiere_id, giornoKey, collaboratoriList]);

  // Un solo rapportino per cantiere e per giornata
  useEffect(() => {
    if (!formData.cantiere_id) {
      setRapportinoEsistente(null);
      return;
    }
    let annullato = false;
    getRapportinoCantiereGiorno(formData.cantiere_id, formData.data || new Date())
      .then((r) => { if (!annullato) setRapportinoEsistente(r && r.id !== draftId ? r : null); })
      .catch(() => {});
    return () => { annullato = true; };
  }, [formData.cantiere_id, giornoKey, draftId]);

  const updateForm = (updates) => setFormData((prev) => ({ ...prev, ...updates }));

  const oreLavoratori = (formData.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0) || (formData.ore_totali_squadra || 0);
  const oreExtra = formData.has_lavorazioni_extra ? (formData.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0) : 0;
  const oreNormali = (formData.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
  const delta = oreLavoratori - oreExtra - oreNormali;
  const bilanciato = Math.abs(delta) < 0.01;
  const canSubmit = !!formData.cantiere_id && bilanciato;
  const hint = !formData.cantiere_id
    ? "Seleziona il cantiere per iniziare a compilare"
    : !bilanciato
      ? delta > 0
        ? `Ore non in pareggio: mancano ${fmtOre(delta)} da assegnare alle lavorazioni`
        : `Ore non in pareggio: hai sforato di ${fmtOre(Math.abs(delta))}`
      : null;

  const handleSubmit = async () => {
    if (!bilanciato) {
      toast.error("Assegna tutte le ore alle lavorazioni prima di inviare");
      return;
    }
    setSubmitting(true);
    try {
      if (draftId) {
        await base44.entities.Rapportino.update(draftId, { ...formData, stato: "inviato" });
      } else {
        const esistente = await getRapportinoCantiereGiorno(formData.cantiere_id, formData.data || new Date());
        if (esistente) {
          setRapportinoEsistente(esistente);
          toast.error("Esiste già il rapportino di questo cantiere: aprilo per compilarlo");
          setSubmitting(false);
          return;
        }
        await base44.entities.Rapportino.create({ ...formData, stato: "inviato" });
      }
      queryClient.invalidateQueries({ queryKey: ["rapportini"] });
      queryClient.invalidateQueries({ queryKey: ["cantieri"] });
      toast.success("Rapportino inviato con successo!");
      navigate("/");
    } catch (err) {
      toast.error("Errore nell'invio del rapportino: " + (err?.message || "riprova"));
      setSubmitting(false);
    }
  };

  if (isLoadingPermesso) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!canCreate) return null;

  const banner = rapportinoEsistente ? (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="w-4 h-4" />
        Esiste già il rapportino di questo cantiere
      </div>
      <p className="text-xs text-amber-800">
        Per {rapportinoEsistente.cantiere_nome || "questo cantiere"} del {format(new Date(rapportinoEsistente.data), "dd/MM/yyyy")} è già stato creato un rapportino
        {rapportinoEsistente.user_email ? ` da ${rapportinoEsistente.user_email}` : ""}. Se ne crea uno solo per cantiere e per giornata: compila quello esistente.
      </p>
      <Button size="sm" onClick={() => navigate(`/report/${rapportinoEsistente.id}`)}>
        Apri il rapportino esistente
      </Button>
    </div>
  ) : null;

  return (
    <RapportinoUnico
      titolo="Rapportino di cantiere"
      data={formData}
      onChange={updateForm}
      cantieri={cantieri}
      onCantieriRefresh={refetchCantieri}
      collaboratoriList={collaboratoriList}
      tipiLavorazione={tipiLavorazione}
      materialiBase={materialiBase}
      isAdmin={isAdmin}
      canEditCantiere
      canEditDate={false}
      lastSaved={lastSaved}
      savingDraft={savingDraft}
      onSaveDraft={() => salvaBozza(false)}
      onSubmit={handleSubmit}
      submitting={submitting}
      canSubmit={canSubmit && !rapportinoEsistente}
      hint={rapportinoEsistente ? "Compila il rapportino già esistente per questo cantiere" : hint}
      onBack={() => navigate("/")}
      banner={banner}
    />
  );
}