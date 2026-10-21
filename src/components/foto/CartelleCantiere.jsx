import { Folder } from "lucide-react";

// Le foto di una categoria si aprono per cartella di cantiere.
export default function CartelleCantiere({ gruppi, onApri, unita = "foto" }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {gruppi.map((g) => (
        <button
          key={g.id}
          onClick={() => onApri(g)}
          className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:shadow-md transition-all"
        >
          <Folder className="w-6 h-6 text-primary mb-2" />
          <p className="text-sm font-semibold truncate">{g.nome}</p>
          <p className="text-[11px] text-muted-foreground">
            {g.count} {unita}
          </p>
        </button>
      ))}
    </div>
  );
}