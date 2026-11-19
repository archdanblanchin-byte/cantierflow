import React from "react";
import { MousePointer2, Hand, Scaling, Minus, Equal, Hexagon, Home, Square, Type, Undo2, Redo2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GRUPPI = [
  [
    { key: "select", label: "Seleziona", icon: MousePointer2 },
    { key: "pan", label: "Sposta", icon: Hand },
  ],
  [
    { key: "calibrate", label: "Scala", icon: Scaling },
    { key: "line", label: "Misura", icon: Minus },
    { key: "quota", label: "Quota", icon: Equal },
    { key: "area", label: "Area", icon: Hexagon },
    { key: "room", label: "Ambiente", icon: Home },
    { key: "perimeter", label: "Perimetro", icon: Square },
  ],
  [{ key: "text", label: "Testo", icon: Type }],
];

function Bottone({ icon: Icon, label, attivo, onClick, disabled, danger }) {
  return (
    <button type="button" title={label} onClick={onClick} disabled={disabled}
      className={cn(
        "h-11 w-11 shrink-0 flex flex-col items-center justify-center rounded-lg transition-colors disabled:opacity-30",
        attivo ? (danger ? "bg-red-600 text-white" : "bg-slate-900 text-white") : "text-slate-600 hover:bg-slate-100"
      )}>
      <Icon size={18} />
    </button>
  );
}

export default function MisureToolbar({ tool, onTool, onUndo, onRedo, puoAnnullare, puoRipristinare, onDelete, puoEliminare }) {
  return (
    <div className="bg-white border-b md:border-b-0 md:border-r border-slate-200 flex md:flex-col items-center gap-1 p-1.5 overflow-x-auto md:overflow-visible md:w-14">
      {GRUPPI.map((g, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="w-px h-6 md:w-6 md:h-px bg-slate-200 mx-1 md:mx-0 md:my-1 shrink-0" />}
          {g.map((t) => <Bottone key={t.key} {...t} attivo={tool === t.key} onClick={() => onTool(t.key)} />)}
        </React.Fragment>
      ))}
      <div className="md:flex-1" />
      <Bottone icon={Undo2} label="Annulla" onClick={onUndo} disabled={!puoAnnullare} />
      <Bottone icon={Redo2} label="Ripristina" onClick={onRedo} disabled={!puoRipristinare} />
      <Bottone icon={Trash2} label="Elimina" onClick={onDelete} disabled={!puoEliminare} danger attivo={puoEliminare} />
    </div>
  );
}