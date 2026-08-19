import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, Clock, CloudRain, Sun, Pencil, Trash2, Send } from "lucide-react";

const TIPO_META = {
  normale: { label: "Giornata normale", icon: Sun, color: "bg-amber-100 text-amber-700" },
  pioggia: { label: "Giornata di pioggia", icon: CloudRain, color: "bg-blue-100 text-blue-700" },
};

export default function ProgrammazioneCard({ item, onEdit, onDelete, onPublish, readonly }) {
  const meta = TIPO_META[item.tipo_giornata] || TIPO_META.normale;
  const Icon = meta.icon;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{item.cantiere_nome || "Cantiere"}</p>
            <p className="text-xs text-muted-foreground">{meta.label}</p>
          </div>
        </div>
        {item.stato === "pubblicato" ? (
          <Badge className="bg-emerald-100 text-emerald-700 border-transparent">Pubblicato</Badge>
        ) : (
          <Badge variant="secondary">Bozza</Badge>
        )}
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {item.collaboratori?.length > 0 && (
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground/90">{item.collaboratori.map((c) => c.nome).join(", ")}</span>
          </div>
        )}
        {item.furgoni?.length > 0 && (
          <div className="flex items-start gap-2">
            <Truck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground/90">{item.furgoni.map((f) => f.nome).join(", ")}</span>
          </div>
        )}
        {(item.ora_arrivo_magazzino || item.ora_arrivo_cantiere) && (
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-foreground/90">
              {item.ora_arrivo_magazzino && `Arrivo in magazzino ${item.ora_arrivo_magazzino}`}
              {item.ora_arrivo_magazzino && item.ora_arrivo_cantiere && " · "}
              {item.ora_arrivo_cantiere && `Arrivo in cantiere ${item.ora_arrivo_cantiere}`}
            </span>
          </div>
        )}
        {item.note && (
          <div className="rounded-lg bg-muted/60 p-2.5 text-xs text-foreground/80 whitespace-pre-wrap">
            {item.note}
          </div>
        )}
      </div>

      {!readonly && (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit?.(item)}>
            <Pencil className="w-3.5 h-3.5" />Modifica
          </Button>
          {item.stato !== "pubblicato" && (
            <Button size="sm" onClick={() => onPublish?.(item)}>
              <Send className="w-3.5 h-3.5" />Pubblica
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={() => onDelete?.(item)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}