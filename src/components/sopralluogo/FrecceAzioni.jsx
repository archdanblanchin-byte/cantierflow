import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

// Pulsanti compatti per riordinare ed eliminare una voce di un elenco.
export default function FrecceAzioni({ i, n, onMove, onRemove }) {
  const cls = "p-1 rounded hover:bg-accent disabled:opacity-30";
  return (
    <div className="flex items-center shrink-0">
      <button type="button" aria-label="Su" className={cls} disabled={i === 0} onClick={() => onMove(-1)}><ArrowUp className="w-4 h-4" /></button>
      <button type="button" aria-label="Giù" className={cls} disabled={i === n - 1} onClick={() => onMove(1)}><ArrowDown className="w-4 h-4" /></button>
      <button type="button" aria-label="Elimina" className={`${cls} text-destructive`} onClick={onRemove}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}