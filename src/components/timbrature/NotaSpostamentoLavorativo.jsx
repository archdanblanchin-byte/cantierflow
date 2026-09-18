import { Info } from "lucide-react";

// Nota informativa mostrata quando le ore di spostamento NON generano trasferta:
// rientrano nelle ore di lavorazione (totale lavorato < 8h) e vengono quindi
// distribuite tra i cantieri della giornata.
export default function NotaSpostamentoLavorativo({ className = "" }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 p-2.5 text-xs ${className}`}>
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>
        Trasferte non conteggiate: le ore di spostamento rientrano nelle ore di
        lavorazione (totale lavorato inferiore a 8h) e vengono divise tra i
        cantieri della giornata.
      </span>
    </div>
  );
}