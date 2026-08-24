import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Workflow as WorkflowIcon, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// URL dell'app Workflow (sostituisci con l'URL pubblicato pubblico quando disponibile).
export const WORKFLOW_APP_URL = "https://app.base44.com/apps/69cf6976e2d3def3abcb23af/editor/preview";

export default function WorkflowApp() {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  const apri = () => {
    setOpening(true);
    window.open(WORKFLOW_APP_URL, "_blank", "noopener,noreferrer");
    setTimeout(() => setOpening(false), 800);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg">App Workflow</h1>
            <p className="text-xs text-muted-foreground">Passa all'applicazione Workflow</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-5">
          <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto shadow-lg">
            <WorkflowIcon className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Workflow</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Apri l'app Workflow in una nuova finestra per gestire i flussi sincronizzati con i cronoprogrammi.
            </p>
          </div>
          <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={apri} disabled={opening}>
            {opening ? <Loader2 className="w-5 h-5 animate-spin" /> : <ExternalLink className="w-5 h-5" />}
            Apri app Workflow
          </Button>
          <p className="text-[11px] text-muted-foreground break-all">
            {WORKFLOW_APP_URL}
          </p>
        </div>
      </div>
    </div>
  );
}