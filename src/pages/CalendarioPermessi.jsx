import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";

// ID calendario permessi e ferie
const CALENDAR_ID_PERMESSI =
  "31cd35a0b050ccef3dc636f01d485ed06d5ca5855370e35862881d848bad18bb@group.calendar.google.com";
// ID calendario corsi di formazione
const CALENDAR_ID_CORSI =
  "14408cec4b4c5d2629e7da4071cb08a98cdd1a2fbff5a74c3689fb3adcd73702@group.calendar.google.com";

// Un unico embed con entrambi i calendari: Google assegna a ciascuno
// un colore diverso, così corsi e permessi/ferie si distinguono a colpo d'occhio.
const EMBED_SRC =
  `https://calendar.google.com/calendar/embed?` +
  `src=${encodeURIComponent(CALENDAR_ID_PERMESSI)}` +
  `&src=${encodeURIComponent(CALENDAR_ID_CORSI)}` +
  `&ctz=Europe%2FRome`;

export default function CalendarioPermessi() {
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-lg">Calendario unico</h1>
              <p className="text-xs text-muted-foreground">Corsi, permessi e ferie insieme</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReloadKey((k) => k + 1)}
              title="Aggiorna"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2 py-4 space-y-3">
        {/* Legenda colori dei due calendari */}
        <div className="flex flex-wrap items-center gap-3 px-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500" />
            Permessi e ferie
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            Corsi
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <iframe
            key={reloadKey}
            src={EMBED_SRC}
            title="Calendario unificato corsi e permessi"
            className="w-full"
            style={{ height: "75vh", border: 0 }}
            loading="lazy"
          />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}