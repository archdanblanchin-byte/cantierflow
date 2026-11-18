import { addMonths, format, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CronoToolbar({ cursor, setCursor, maxDip, setMaxDip, vista, setVista, onNuovo, onStampa, riepilogo }) {
  const mese = format(cursor, "MMMM yyyy", { locale: it });
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl">Cronoprogramma</h1>
          <p className="text-xs text-muted-foreground">Gestione cantieri e pianificazione lavori</p>
        </div>
        <Button className="gap-2" onClick={onNuovo}><Plus className="w-4 h-4" /> Nuovo Cantiere</Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["Cantieri", riepilogo.totale], ["In corso", riepilogo.inCorso], ["Giorni maltempo", riepilogo.maltempo]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-3 text-center">
            <div className="text-xl font-bold">{v}</div>
            <div className="text-[11px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => setCursor(startOfMonth(addMonths(cursor, -1)))}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-semibold capitalize min-w-[130px] text-center">{mese}</span>
        <Button variant="outline" size="icon" onClick={() => setCursor(startOfMonth(addMonths(cursor, 1)))}><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="outline" onClick={() => setCursor(startOfMonth(new Date()))}>Oggi</Button>
        <label className="flex items-center gap-1.5 text-xs ml-auto">
          Max dip.
          <Input type="number" inputMode="numeric" min="1" className="w-16 h-9" value={maxDip} onChange={(e) => setMaxDip(Math.max(1, Number(e.target.value) || 1))} />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Tabs value={vista} onValueChange={setVista}>
          <TabsList>
            <TabsTrigger value="gantt">Gantt</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
        </Tabs>
        {vista === "gantt" && <Button variant="outline" className="gap-2" onClick={onStampa}><Printer className="w-4 h-4" /> Stampa</Button>}
      </div>
    </div>
  );
}