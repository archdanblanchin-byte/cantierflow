import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

import StepIndicator from "@/components/wizard/StepIndicator";
import WizardNavigation from "@/components/wizard/WizardNavigation";
import Step1DatiCantiere from "@/components/wizard/Step1DatiCantiere";
import Step2Collaboratori from "@/components/wizard/Step2Collaboratori";
import Step3LavorazioniExtra from "@/components/wizard/Step3LavorazioniExtra";
import Step4LavorazioniNormali from "@/components/wizard/Step4LavorazioniNormali";
import Step5Materiali from "@/components/wizard/Step5Materiali";
import Step6Riepilogo from "@/components/wizard/Step6Riepilogo";

const TOTAL_STEPS = 6;

export default function CreateReport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString(),
    user_email: "",
    cantiere_id: "",
    cantiere_nome: "",
    foto: [],
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
  });

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user) setFormData((prev) => ({ ...prev, user_email: user.email }));
    });
  }, []);

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

  const updateForm = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = () => {
    if (step === 1 && !formData.cantiere_id) {
      toast.error("Seleziona un cantiere");
      return false;
    }
    if (step === 2 && (!formData.ore_totali_squadra || formData.ore_totali_squadra <= 0)) {
      toast.error("Inserisci le ore totali squadra");
      return false;
    }
    if (step === 4) {
      const somma = (formData.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
      const oreCollab = (formData.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0);
      const oreRif = oreCollab > 0 ? oreCollab : (formData.ore_totali_squadra || 0);
      const delta = oreRif - somma;
      if (Math.abs(delta) >= 0.01) {
        toast.error(`Le ore non quadrano. Mancano ${delta.toFixed(2)}h da assegnare.`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    await base44.entities.Rapportino.create({ ...formData, stato: "inviato" });
    queryClient.invalidateQueries({ queryKey: ["rapportini"] });
    toast.success("Rapportino inviato con successo!");
    setSubmitting(false);
    navigate("/");
  };

  const canProceedStep6 = (() => {
    const somma = (formData.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
    const oreCollab = (formData.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0);
    const oreRif = oreCollab > 0 ? oreCollab : (formData.ore_totali_squadra || 0);
    return Math.abs(oreRif - somma) < 0.01;
  })();

  const stepContent = {
    1: <Step1DatiCantiere data={formData} onChange={updateForm} cantieri={cantieri} onCantieriRefresh={refetchCantieri} />,
    2: <Step2Collaboratori data={formData} onChange={updateForm} collaboratoriList={collaboratoriList} />,
    3: <Step3LavorazioniExtra data={formData} onChange={updateForm} />,
    4: <Step4LavorazioniNormali data={formData} onChange={updateForm} tipiLavorazione={tipiLavorazione} />,
    5: <Step5Materiali data={formData} onChange={updateForm} materialiBase={materialiBase} />,
    6: <Step6Riepilogo data={formData} />,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">Nuovo Rapportino</h1>
          </div>
          <StepIndicator currentStep={step} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
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

        <WizardNavigation
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          onPrev={handlePrev}
          onNext={handleNext}
          onSubmit={handleSubmit}
          canProceed={step === 6 ? canProceedStep6 && !submitting : true}
        />
      </div>
    </div>
  );
}