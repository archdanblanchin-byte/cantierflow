import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Hammer, ExternalLink, ArrowLeft, Loader2 } from "lucide-react";

const WORKFLOW_APP_URL = "https://work-flow-abcb23af.base44.app";
const LOGO_URL = "https://media.base44.com/images/public/69df26522754d022dfa80e75/c29eb2d9b_Blanchin-Simbolo-Colore-Copia.png";

export default function WorkflowApp() {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);

  // Apertura automatica in nuova scheda al caricamento.
  useEffect(() => {
    const w = window.open(WORKFLOW_APP_URL, "_blank", "noopener,noreferrer");
    if (w) setOpened(true);
  }, []);

  const apri = () => {
    window.open(WORKFLOW_APP_URL, "_blank", "noopener,noreferrer");
    setOpened(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header compatto con logo Blanchin */}
      <div className="bg-card border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={LOGO_URL} alt="Blanchin" className="w-9 h-9 rounded-lg object-cover" />
          <div>
            <h1 className="font-bold text-lg leading-tight">WorkFlow</h1>
            <p className="text-xs text-muted-foreground">Pianificazione cantieri · stesso account</p>
          </div>
        </div>
      </div>

      {/* Pannello centrale */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-5 shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-amber-700 flex items-center justify-center mx-auto shadow-lg">
            <Hammer className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold">Apri l'app WorkFlow</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              L'app di pianificazione cantieri si apre in una nuova scheda utilizzando lo stesso account con cui hai effettuato l'accesso qui.
            </p>
          </div>
          {opened && (
            <p className="text-[11px] text-emerald-600">
              Apertura automatica effettuata. Se non vedi la nuova scheda, usa il bottone.
            </p>
          )}
          {!opened && (
            <p className="text-[11px] text-muted-foreground">
              Se l'apertura automatica è bloccata dal browser, usa il bottone.
            </p>
          )}
          <Button size="lg" className="gap-2 w-full sm:w-auto" onClick={apri}>
            <ExternalLink className="w-5 h-5" />
            Apri l'app WorkFlow
          </Button>
          <p className="text-[11px] text-muted-foreground break-all">{WORKFLOW_APP_URL}</p>
        </div>
      </div>
    </div>
  );
}