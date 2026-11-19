import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Ruler, Hammer, Box, PenTool, Ruler as RulerIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODULI = [
  { key: "misurazioni", titolo: "Misurazioni", testo: "Rilievo su planimetrie e disegni: scala, misure, quote, aree, ambienti ed export.", icon: Ruler, color: "bg-slate-900", path: "/strumenti/misurazioni" },
  { key: "ponteggi", titolo: "Ponteggi", testo: "Configuratore di ponteggi con distinta base e preventivo.", icon: Hammer, color: "bg-amber-500" },
  { key: "volumi", titolo: "Volumi 3D", testo: "Volume dell'edificio da pianta e prospetti.", icon: Box, color: "bg-sky-500" },
  { key: "studio", titolo: "Studio Disegno", testo: "Tavole di disegno tecnico vettoriale.", icon: PenTool, color: "bg-violet-600" },
];

export default function Strumenti() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center"><RulerIcon className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Strumenti</h1>
            <p className="text-xs text-muted-foreground">Misurare, disegnare e progettare ponteggi</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6 grid gap-4 sm:grid-cols-2">
        {MODULI.map((m) => {
          const Icon = m.icon;
          const corpo = (
            <div className={`bg-card rounded-xl border border-border p-5 h-full ${m.path ? "hover:shadow-md transition-shadow" : "opacity-60"}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg text-white flex items-center justify-center ${m.color}`}><Icon className="w-5 h-5" /></div>
                <span className="font-semibold">{m.titolo}</span>
                {!m.path && <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prossimamente</span>}
              </div>
              <p className="text-sm text-muted-foreground">{m.testo}</p>
            </div>
          );
          return m.path ? <Link key={m.key} to={m.path}>{corpo}</Link> : <div key={m.key}>{corpo}</div>;
        })}
      </div>
    </div>
  );
}