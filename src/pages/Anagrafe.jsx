import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Truck, Wrench, FileText, BookOpen, Package } from "lucide-react";
import AnagrafePage from "@/components/anagrafe/AnagrafePage";
import FurgoniPage from "@/components/anagrafe/FurgoniPage";
import LavorazioniPage from "@/components/anagrafe/LavorazioniPage";

const SEZIONI = [
  { key: "collaboratori", label: "Collaboratori", icon: Users, color: "bg-blue-500", entity: "Collaboratore", fields: [
    { key: "nome", label: "Nome", required: true },
    { key: "ruolo", label: "Ruolo" },
    { key: "user_email", label: "Email utente app (collegamento)" },
  ]},
  { key: "furgoni", label: "Furgoni", icon: Truck, color: "bg-yellow-500", entity: "Furgone", fields: [
    { key: "nome", label: "Nome / Targa", required: true },
    { key: "note", label: "Note" },
  ]},
  { key: "attrezzi", label: "Attrezzi", icon: Wrench, color: "bg-orange-500", entity: "AnagrafaAttrezzo", fields: [
    { key: "nome", label: "Nome attrezzo", required: true },
    { key: "note", label: "Note" },
  ]},
  { key: "documenti", label: "Documenti Tipo", icon: FileText, color: "bg-indigo-500", entity: "TipoDocumento", fields: [
    { key: "nome", label: "Nome documento", required: true },
    { key: "note", label: "Note" },
  ]},
  { key: "lavorazioni", label: "Lavorazioni", icon: BookOpen, color: "bg-emerald-500", entity: "TipoLavorazione", fields: [
    { key: "nome", label: "Nome lavorazione", required: true },
    { key: "descrizione", label: "Descrizione" },
  ]},
  { key: "materiali", label: "Materiali", icon: Package, color: "bg-amber-600", entity: "MaterialeBase", fields: [
    { key: "nome", label: "Nome materiale", required: true },
    { key: "unita_misura", label: "Unità di misura" },
  ]},
];

export default function Anagrafe() {
  const navigate = useNavigate();
  const [sezioneAttiva, setSezioneAttiva] = useState(null);

  const sezione = SEZIONI.find(s => s.key === sezioneAttiva);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {sezioneAttiva && (
            <Button variant="ghost" size="icon" onClick={() => setSezioneAttiva(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="font-bold text-lg">{sezione ? sezione.label : "Anagrafe"}</h1>
            <p className="text-xs text-muted-foreground">{sezione ? "Gestione elenco" : "Collaboratori, furgoni, attrezzi, documenti, lavorazioni e materiali"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!sezioneAttiva ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SEZIONI.map((s) => (
              <button
                key={s.key}
                onClick={() => setSezioneAttiva(s.key)}
                className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-200 group aspect-square"
              >
                <div className={`w-12 h-12 rounded-xl ${s.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        ) : sezioneAttiva === "furgoni" ? (
          <FurgoniPage />
        ) : sezioneAttiva === "lavorazioni" ? (
          <LavorazioniPage />
        ) : (
          <AnagrafePage sezione={sezione} />
        )}
      </div>
    </div>
  );
}