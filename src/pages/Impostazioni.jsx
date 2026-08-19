import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ShieldCheck, Route, MapPin } from "lucide-react";
import ConfigurazioneTrasfertaPage from "@/components/anagrafe/ConfigurazioneTrasfertaPage";

const SEZIONI = [
  { key: "utenti", label: "Utenti", icon: Users, color: "bg-slate-700", link: "/utenti" },
  { key: "access_control", label: "Access Control", icon: ShieldCheck, color: "bg-teal-500", link: "/permessi" },
  { key: "trasferte", label: "Trasferte", icon: Route, color: "bg-orange-500", link: "/trasferte" },
  { key: "centro_operativo", label: "Centro Operativo", icon: MapPin, color: "bg-red-500" },
];

export default function Impostazioni() {
  const navigate = useNavigate();
  const [sezioneAttiva, setSezioneAttiva] = useState(null);

  const sezione = SEZIONI.find(s => s.key === sezioneAttiva);

  const handleSezioneClick = (s) => {
    if (s.link) navigate(s.link);
    else setSezioneAttiva(s.key);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => sezioneAttiva ? setSezioneAttiva(null) : navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">{sezione ? sezione.label : "Impostazioni"}</h1>
            <p className="text-xs text-muted-foreground">{sezione ? "Configurazione" : "Utenti, accessi, trasferte e centro operativo"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!sezioneAttiva ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SEZIONI.map((s) => (
              <button
                key={s.key}
                onClick={() => handleSezioneClick(s)}
                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group aspect-square"
              >
                <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <ConfigurazioneTrasfertaPage />
        )}
      </div>
    </div>
  );
}