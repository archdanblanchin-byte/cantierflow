import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, Send, Loader2 } from "lucide-react";

// Barra di navigazione: Indietro/Avanti scorrono le sezioni della schermata.
// "Salva e continua dopo" salva la bozza e lascia il rapportino aperto.
export default function RapportinoNav({
  onPrev,
  onNext,
  canPrev,
  canNext,
  onSave,
  saving,
  onSubmit,
  submitting,
  canSubmit,
  hint,
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border safe-area-bottom">
      <div className="max-w-2xl mx-auto px-4 py-2.5 space-y-2">
        {hint && <p className="text-[11px] text-amber-700 text-center leading-tight">{hint}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-9" onClick={onPrev} disabled={!canPrev}>
            <ChevronLeft className="w-4 h-4" />
            Indietro
          </Button>
          <Button variant="outline" className="flex-1 h-9" onClick={onNext} disabled={!canNext}>
            Avanti
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 h-11 gap-2"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva e continua dopo
          </Button>
          <Button
            className="flex-1 h-11 gap-2 shadow-lg shadow-primary/20"
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitting ? "Invio…" : "Invia"}
          </Button>
        </div>
      </div>
    </div>
  );
}