import React, { useState } from "react";
import { ListChecks, Sliders, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import MisureElenco from "./MisureElenco";
import MisureProprieta from "./MisureProprieta";
import MisureRiepilogo from "./MisureRiepilogo";

const SCHEDE = [
  { key: "misure", label: "Misure", icon: ListChecks },
  { key: "props", label: "Proprietà", icon: Sliders },
  { key: "riepilogo", label: "Riepilogo", icon: BarChart3 },
];

export default function PannelloMisure({ misure, selezionata, onSelect, onDelete, onChange }) {
  const [scheda, setScheda] = useState("misure");
  return (
    <div className="bg-white border-t md:border-t-0 md:border-l border-slate-200 md:w-72 h-56 md:h-auto flex flex-col shrink-0">
      <div className="flex border-b border-slate-200 shrink-0">
        {SCHEDE.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setScheda(key)}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2",
              scheda === key ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700")}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {scheda === "misure" && <MisureElenco misure={misure} selectedId={selezionata?.id} onSelect={onSelect} onDelete={onDelete} />}
        {scheda === "props" && <MisureProprieta misura={selezionata} onChange={onChange} />}
        {scheda === "riepilogo" && <MisureRiepilogo misure={misure} />}
      </div>
    </div>
  );
}