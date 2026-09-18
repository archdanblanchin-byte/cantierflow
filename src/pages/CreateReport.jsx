import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

import StepIndicator from "@/components/wizard/StepIndicator";
import WizardNavigation from "@/components/wizard/WizardNavigation";
import Step1DatiCantiere from "@/components/wizard/Step1DatiCantiere";
import Step2Collaboratori from "@/components/wizard/Step2Collaboratori";
import Step3Lavorazioni from "@/components/wizard/Step3Lavorazioni";
import Step4Materiali from "@/components/wizard/Step5Materiali";
import Step5Riepilogo from "@/components/wizard/Step6Riepilogo";
import { computePartecipantiEmail } from "@/lib/rapportinoPartecipanti";
import { usePermessoRapportinoManuale } from "@/hooks/usePermessoRapportinoManuale";
import { fmtOre } from "@/lib/timbratureUtils";
import { buildSquadraDaTimbrature, getRapportinoCantiereGiorno } from "@/lib/rapportiniFromTimbrature";

const TOTAL_STEPS = 5;
const AUTOSAVE_INTERVAL = 30000; // 30 secondi

export default function CreateReport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canCreate, isLoading: isLoadingPermesso } = usePermessoRapportinoManuale();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [rapportinoEsistente, setRapportinoEsistente] = useState(null);
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
      if (user) setFormData((prev) => ({ ...prev, user_email: user.email }));
    });
  }, []);

  // Accesso riservato: solo l'amministratore o utenti autorizzati per oggi.
  useEffect(() => {
    if (!isLoadingPermesso && !canCreate) {
      toast.error("Non hai il permesso per creare un rapportino. Richiedi l'autorizzazione all'amministratore per oggi.");
      navigate("/");
    }
  }, [canCreate, isLoadingPermesso, navigate]);

  // Autosave ogni 30 secondi
  useEffect(() => {
    autosaveRef.current = formData;
  }, [formData]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = autosaveRef.current;
      if (!data.cantiere_id) return; // non salvare senza cantiere
      if (rapportinoEsistente) return; // esiste già il rapportino del cantiere
      try {
        if (draftId) {
          await base44.entities.Rapportino.update(draftId, { ...data, stato: "bozza" });
        } else {
          // Non creare mai un secondo rapportino per lo stesso cantiere e giornata
          const esistente = await getRapportinoCantiereGiorno(data.cantiere_id, data.data || new Date());
          if (esistente) {
            setRapportinoEsistente(esistente);
            return;
          }
          const saved = await base44.entities.Rapportino.create({ ...data, stato: "bozza" });
          setDraftId(saved.id);
        }
        setLastSaved(new Date());
      } catch (_) {}
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
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
  // per la regola RLS di visibilità del rapportino.
  useEffect(() => {
    const pe = computePartecipantiEmail(formData, collaboratoriList, formData.user_email);
    setFormData((prev) => {
      if (JSON.stringify(prev.partecipanti_email || []) === JSON.stringify(pe)) return prev;
      return { ...prev, partecipanti_email: pe };
    });
  }, [formData.collaboratori, formData.user_email, collaboratoriList]);

  const giornoKey = formData.data ? format(new Date(formData.data), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

  // La squadra del cantiere arriva dalle timbrature: il capo cantiere non deve
  // inserire le persone a mano, trova già presenze, ore e anomalie.
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

  const updateForm = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateStepFor = (s) => {
    if (s === 1 && !formData.cantiere_id) {
      toast.error("Seleziona un cantiere");
      return false;
    }
    if (s === 2 && (formData.collaboratori || []).length === 0) {
      toast.error("Aggiungi almeno un collaboratore per continuare");
      return false;
    }
    if (s === 2 && (!formData.ore_totali_squadra || formData.ore_totali_squadra <= 0)) {
      toast.error("Inserisci le ore totali squadra");
      return false;
    }
    if (s === 4) {
      const oreLavoratori = (formData.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0) || (formData.ore_totali_squadra || 0);
      const oreExtra = formData.has_lavorazioni_extra ? (formData.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0) : 0;
      const oreNormali = (formData.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
      const delta = oreLavoratori - oreExtra - oreNormali;
      if (Math.abs(delta) >= 0.01) {
        if (delta > 0) toast.error(`⚠️ Mancano ${fmtOre(delta)} da assegnare alle lavorazioni.`);
        else toast.error(`❌ Hai sforato di ${fmtOre(Math.abs(delta))}.`);
        return false;
      }
    }
    return true;
  };
  const validateStep = () => validateStepFor(step);

  const goToStep = (target) => {
    if (target === step) return;
    if (target < step) {
      setShowErrors(false);
      setStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Avanza validando ogni step intermedio
    for (let s = step; s < target; s++) {
      if (!validateStepFor(s)) {
        setShowErrors(true);
        return;
      }
    }
    setShowErrors(false);
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    if (rapportinoEsistente) return;
    if (!validateStep()) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrev = () => {
    setShowErrors(false);
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (draftId) {
        await base44.entities.Rapportino.update(draftId, { ...formData, stato: "inviato" });
      } else {
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

  const canProceedStep6 = (() => {
    const oreLavoratori = (formData.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0) || (formData.ore_totali_squadra || 0);
    const oreExtra = formData.has_lavorazioni_extra ? (formData.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0) : 0;
    const oreNormali = (formData.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
    return Math.abs(oreLavoratori - oreExtra - oreNormali) < 0.01;
  })();

  if (isLoadingPermesso) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!canCreate) return null;

  const stepContent = {
    1: <Step1DatiCantiere data={formData} onChange={updateForm} cantieri={cantieri} onCantieriRefresh={refetchCantieri} />,
    2: <Step2Collaboratori data={formData} onChange={updateForm} collaboratoriList={collaboratoriList} showErrors={showErrors} />,
    3: <Step3Lavorazioni data={formData} onChange={updateForm} tipiLavorazione={tipiLavorazione} />,
    4: <Step4Materiali data={formData} onChange={updateForm} materialiBase={materialiBase} />,
    5: <Step5Riepilogo data={formData} />,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-base font-bold">Nuovo Rapportino</h1>
            </div>
            {lastSaved && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Save className="w-3 h-3" />
                <span>Salvato {lastSaved.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
          </div>
          <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} onStepClick={goToStep} />
        </div>
      </div>

      {/* Padding bottom per la nav fissa */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {rapportinoEsistente &&
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="w-4 h-4" />
              Esiste già il rapportino di questo cantiere
            </div>
            <p className="text-xs text-amber-800">
              Per {rapportinoEsistente.cantiere_nome || "questo cantiere"} del {format(new Date(rapportinoEsistente.data), "dd/MM/yyyy")} è già stato creato un rapportino
              {rapportinoEsistente.user_email ? ` da ${rapportinoEsistente.user_email}` : ""}. Se ne crea uno solo per cantiere e per giornata: aprine uno nuovo solo se quello esistente va corretto.
            </p>
            <Button size="sm" onClick={() => navigate(`/report/${rapportinoEsistente.id}`)}>
              Apri il rapportino esistente
            </Button>
          </div>
        }
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {stepContent[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <WizardNavigation
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onPrev={handlePrev}
        onNext={handleNext}
        onSubmit={handleSubmit}
        submitting={submitting}
        canProceed={step === TOTAL_STEPS ? canProceedStep6 && !submitting : !rapportinoEsistente}
      />
    </div>
  );
}