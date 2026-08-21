import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";

export default function WizardNavigation({ currentStep, totalSteps, onPrev, onNext, onSubmit, canProceed = true, submitting = false }) {
  const isFirst = currentStep === 1;
  const isLast = currentStep === totalSteps;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-t border-border safe-area-bottom">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={isFirst}
          className="flex-1 h-12 gap-2 text-base"
        >
          <ChevronLeft className="w-5 h-5" />
          Indietro
        </Button>
        {isLast ? (
          <Button
            onClick={onSubmit}
            className="flex-1 h-12 gap-2 text-base shadow-lg shadow-primary/20"
            disabled={!canProceed || submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Invio…" : "Invia"}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            className="flex-1 h-12 gap-2 text-base"
          >
            Avanti
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}