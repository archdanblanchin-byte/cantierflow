import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { isToday } from "date-fns";

import StepIndicator from "@/components/wizard/StepIndicator";
import WizardNavigation from "@/components/wizard/WizardNavigation";
import Step1DatiCantiere from "@/components/wizard/Step1DatiCantiere";
import Step2Collaboratori from "@/components/wizard/Step2Collaboratori";
import Step3Lavorazioni from "@/components/wizard/Step3Lavorazioni";
import Step4Materiali from "@/components/wizard/Step5Materiali";
import Step5Riepilogo from "@/components/wizard/Step6Riepilogo";

const TOTAL_STEPS = 5;

export default function EditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      const results = await base44.entities.Rapportino.filter({ id });
      const report = results[0];
      if (!report) { navigate("/"); return; }
      // Controllo sicurezza: solo chi ha compilato e solo oggi
      if (report.user_email !== user?.email || !isToday(new Date(report.data))) {
        toast.error("Non puoi modificare questo rapportino");
        navigate(`/report/${id}`);
        return;
      }
      setFormData(report);
      setLoading(false);
    }
    load();
  }, [id]);

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

  const updateForm = (updates) => setFormData((prev) => ({ ...prev, ...updates }));

  const validateStep = () => {
    if (step === 1 && !formData.cantiere_id) { toast.error("Seleziona un cantiere"); return false; }
    if (step === 2 && (formData.collaboratori || []).length === 0) { toast.error("Aggiungi almeno un collaboratore"); return false; }
    if (step === 3) {
      const oreLav = (formData.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0) || (formData.ore_totali_squadra || 0);
      const oreExtra = formData.has_lavorazioni_extra ? (formData.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0) : 0;
      const oreNorm = (formData.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
      const delta = oreLav - oreExtra - oreNorm;
      if (Math.abs(delta) >= 0.01) {
        toast.error(delta > 0 ? `Mancano ${delta.toFixed(2)}h da assegnare` : `Sforato di ${Math.abs(delta).toFixed(2)}h`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) { setShowErrors(true); return; }
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
    await base44.entities.Rapportino.update(id, { ...formData, stato: "inviato" });
    queryClient.invalidateQueries({ queryKey: ["rapportini"] });
    toast.success("Rapportino aggiornato!");
    setSubmitting(false);
    navigate(`/report/${id}`);
  };

  if (loading || !formData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const canProceedStep5 = (() => {
    const oreLav = (formData.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0) || (formData.ore_totali_squadra || 0);
    const oreExtra = formData.has_lavorazioni_extra ? (formData.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0) : 0;
    const oreNorm = (formData.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
    return Math.abs(oreLav - oreExtra - oreNorm) < 0.01;
  })();

  const stepContent = {
    1: <Step1DatiCantiere data={formData} onChange={updateForm} cantieri={cantieri} onCantieriRefresh={refetchCantieri} showErrors={showErrors} rapportinoId={id} />,
    2: <Step2Collaboratori data={formData} onChange={updateForm} collaboratoriList={collaboratoriList} showErrors={showErrors} />,
    3: <Step3Lavorazioni data={formData} onChange={updateForm} tipiLavorazione={tipiLavorazione} />,
    4: <Step4Materiali data={formData} onChange={updateForm} materialiBase={materialiBase} />,
    5: <Step5Riepilogo data={formData} />,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/report/${id}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-base font-bold">Modifica Rapportino</h1>
          </div>
          <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
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
        canProceed={step === TOTAL_STEPS ? canProceedStep5 && !submitting : true}
      />
    </div>
  );
}