import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

export default function WizardNavigation({ currentStep, totalSteps, onPrev, onNext, onSubmit, canProceed = true }) {
  const isFirst = currentStep === 1;
  const isLast = currentStep === totalSteps;

  return (
    <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
      <Button
        variant="ghost"
        onClick={onPrev}
        disabled={isFirst}
        className="gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Indietro
      </Button>
      {isLast ? (
        <Button onClick={onSubmit} className="gap-2 px-6 shadow-lg shadow-primary/20" disabled={!canProceed}>
          <Send className="w-4 h-4" />
          Invia Rapportino
        </Button>
      ) : (
        <Button onClick={onNext} className="gap-2 px-6" disabled={!canProceed}>
          Avanti
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}