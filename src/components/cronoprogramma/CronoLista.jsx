import { format, parseISO } from "date-fns";
import { CloudRain, Minus, Pencil, Plus, Trash2, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { STATI, COLORE_DEFAULT } from "@/lib/cronoCalc";

const d = (s) => (s ? format(parseISO(s), "dd/MM/yyyy") : "-");

export default function CronoLista({ cantieri, onEdit, onDelete, onPioggia }) {
  if (cantieri.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        <CalendarRange className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
        <p className="font-medium">Nessun cantiere</p>
        <p className="text-sm mt-1">Crea il primo cantiere con "Nuovo Cantiere".</p>
      </Card>
    );
  }
  const ordinati = [...cantieri].sort((a, b) => (a.colore || "").localeCompare(b.colore || "") || (a.data_inizio || "").localeCompare(b.data_inizio || ""));
  return (
    <div className="space-y-2">
      {ordinati.map((c) => {
        const stato = STATI[c.stato] || STATI.pianificato;
        return (
          <Card key={c.id} className="p-3 flex gap-3" style={{ borderLeft: `6px solid ${c.colore || COLORE_DEFAULT}` }}>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{c.nome}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${stato.cls}`}>{stato.label}</span>
                {!c.data_confermata && <span className="text-[11px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">Data da confermare</span>}
              </div>
              <div className="text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5">
                <span>Capocantiere: {c.capocantiere || "-"}</span>
                <span>Responsabile: {c.responsabile || "-"}</span>
                <span>Inizio: {d(c.data_inizio)}</span>
                <span>Fine prevista: {d(c.piano.fine)}</span>
                <span>Persone: {c.persone || 0}</span>
                <span>Ore: {c.ore_totali || 0} · {c.piano.necessari} gg lavorativi</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onPioggia(c, -1)}><Minus className="w-3 h-3" /></Button>
                <span className="font-semibold w-4 text-center">{c.giorni_pioggia || 0}</span>
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onPioggia(c, 1)}><Plus className="w-3 h-3" /></Button>
                <span className="text-muted-foreground">giorni di pioggia</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(c)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(c)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}