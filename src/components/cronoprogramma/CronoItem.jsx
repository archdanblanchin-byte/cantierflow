import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowDownUp } from "lucide-react";

const STATO_STYLE = {
  da_iniziare: "bg-slate-100 text-slate-700",
  in_corso: "bg-blue-100 text-blue-700",
  completato: "bg-emerald-100 text-emerald-700",
};
const STATO_LABEL = {
  da_iniziare: "Da iniziare",
  in_corso: "In corso",
  completato: "Completato",
};

export default function CronoItem({ item, onEdit, onDelete }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate">{item.titolo}</h3>
            <Badge className={STATO_STYLE[item.stato]} variant="secondary">
              {STATO_LABEL[item.stato]}
            </Badge>
            {item.origine === "workflow" && (
              <Badge variant="outline" className="gap-1 text-xs">
                <ArrowDownUp className="w-3 h-3" /> da Workflow
              </Badge>
            )}
          </div>
          {item.descrizione && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.descrizione}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {item.data_inizio && <span>📅 {item.data_inizio}</span>}
            {item.data_fine && <span>→ {item.data_fine}</span>}
            {item.progresso > 0 && <span>📊 {item.progresso}%</span>}
          </div>
          {item.progresso > 0 && (
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${item.progresso}%` }} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}