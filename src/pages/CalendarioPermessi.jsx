import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

// ID calendario decodificato dal parametro cid dell'URL fornito
const CALENDAR_ID =
  "31cd35a0b050ccef3dc636f01d485ed06d5ca5855370e35862881d848bad18bb@group.calendar.google.com";
const EMBED_SRC = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
  CALENDAR_ID
)}&ctz=Europe%2FRome`;

export default function CalendarioPermessi() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Permessi</h1>
              <p className="text-xs text-muted-foreground">Calendario permessi e ferie</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2 py-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <iframe
            src={EMBED_SRC}
            title="Calendario Permessi"
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