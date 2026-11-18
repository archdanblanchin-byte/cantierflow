import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import PorzioneEditor from "./PorzioneEditor";
import FrecceAzioni from "./FrecceAzioni";
import FotoGrid from "./FotoGrid";
import FileList from "./FileList";
import { fmtTotali, totaliRilievi } from "@/lib/sopralluogoCalc";
import { nuovaPorzione, sposta } from "@/lib/sopralluogo";

export default function RilievoCard({ rilievo, onChange, indice, totale, onMove, onRemove, anag, ultimaAltezza, onAltezza }) {
  const [aperto, setAperto] = useState(true);
  const porzioni = rilievo.porzioni || [];
  const t = totaliRilievi([rilievo]).lavorazioni[0];
  const set = (k, v) => onChange({ ...rilievo, [k]: v });
  const setPorzioni = (p) => set("porzioni", p);

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" className="flex-1 text-left min-w-0" onClick={() => setAperto(!aperto)}>
          <p className="font-semibold truncate">{rilievo.lavorazione}</p>
          <p className="text-xs text-muted-foreground">{fmtTotali(t.totali)}</p>
        </button>
        <select className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" value={rilievo.ambito || "interno"} onChange={(e) => set("ambito", e.target.value)}>
          <option value="interno">Interno</option>
          <option value="esterno">Esterno</option>
        </select>
        <FrecceAzioni i={indice} n={totale} onMove={onMove} onRemove={onRemove} />
        <button type="button" onClick={() => setAperto(!aperto)} aria-label="Apri/chiudi">{aperto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
      </div>
      {aperto && (
        <div className="space-y-3">
          {porzioni.map((p, i) => (
            <PorzioneEditor
              key={p.id || i}
              porzione={p}
              indice={i}
              totale={porzioni.length}
              anag={anag}
              ultimaAltezza={ultimaAltezza}
              onAltezza={onAltezza}
              onChange={(np) => setPorzioni(porzioni.map((x, j) => (j === i ? np : x)))}
              onMove={(d) => setPorzioni(sposta(porzioni, i, d))}
              onRemove={() => setPorzioni(porzioni.filter((_, j) => j !== i))}
            />
          ))}
          <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => setPorzioni([...porzioni, nuovaPorzione("semplice", ultimaAltezza)])}>
            <Plus className="w-4 h-4" /> Aggiungi porzione
          </Button>
          <Textarea placeholder="Note della lavorazione" rows={2} value={rilievo.note || ""} onChange={(e) => set("note", e.target.value)} />
          <FotoGrid titolo="Foto della lavorazione" annotabile items={rilievo.foto || []} onChange={(v) => set("foto", v)} />
          <FileList titolo="File della lavorazione" items={rilievo.file || []} onChange={(v) => set("file", v)} />
        </div>
      )}
    </Card>
  );
}