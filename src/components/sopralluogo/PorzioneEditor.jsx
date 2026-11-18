import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import MisuraEditor from "./MisuraEditor";
import FrecceAzioni from "./FrecceAzioni";
import { MODALITA, fmt, totalePorzione } from "@/lib/sopralluogoCalc";
import { nuovaMisura, sposta } from "@/lib/sopralluogo";

const selCls = "h-8 rounded-md border border-input bg-transparent px-2 text-xs";

export default function PorzioneEditor({ porzione, onChange, indice, totale, onMove, onRemove, anag, ultimaAltezza, onAltezza }) {
  const t = totalePorzione(porzione);
  const unita = porzione.unita || "m²";
  const misure = porzione.misure || [];
  const setMisure = (m) => onChange({ ...porzione, misure: m });

  // Una sola modalità attiva: cambiandola le misure già inserite non si mescolano.
  const cambiaModalita = (modalita) => {
    if (modalita === porzione.modalita) return;
    const haDati = misure.some((m) => Object.keys(m).some((k) => !["id", "descrizione", "riferimento", "soffitto"].includes(k) && m[k] !== "" && m[k] !== undefined));
    if (haDati && !window.confirm("Cambiando modalità le misure inserite in questa porzione saranno sostituite. Continuare?")) return;
    onChange({ ...porzione, modalita, misure: [nuovaMisura(modalita, ultimaAltezza)] });
  };

  return (
    <div className="rounded-xl border p-3 space-y-2.5 bg-card">
      <div className="flex items-center gap-2">
        <Input className="h-8 text-sm font-medium" placeholder="Nome porzione (es. Piano terra)" value={porzione.nome || ""} onChange={(e) => onChange({ ...porzione, nome: e.target.value })} />
        <FrecceAzioni i={indice} n={totale} onMove={onMove} onRemove={onRemove} />
      </div>
      <div className="flex gap-2 flex-wrap">
        <select className={`${selCls} flex-1 min-w-[160px]`} value={porzione.modalita} onChange={(e) => cambiaModalita(e.target.value)}>
          {MODALITA.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <select className={selCls} value={unita} onChange={(e) => onChange({ ...porzione, unita: e.target.value })}>
          {anag.voci("unita").map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {misure.map((m, i) => (
        <MisuraEditor
          key={m.id || i}
          modalita={porzione.modalita}
          misura={m}
          unita={unita}
          indice={i}
          totale={misure.length}
          anag={anag}
          onAltezza={onAltezza}
          onChange={(nm) => setMisure(misure.map((x, j) => (j === i ? nm : x)))}
          onMove={(d) => setMisure(sposta(misure, i, d))}
          onRemove={() => setMisure(misure.filter((_, j) => j !== i))}
        />
      ))}
      <Button type="button" size="sm" variant="outline" className="gap-1 h-8" onClick={() => setMisure([...misure, nuovaMisura(porzione.modalita, ultimaAltezza)])}>
        <Plus className="w-3.5 h-3.5" /> Aggiungi misura
      </Button>
      <Input className="h-8 text-xs" placeholder="Note della porzione" value={porzione.note || ""} onChange={(e) => onChange({ ...porzione, note: e.target.value })} />
      <p className="text-sm font-semibold">
        Totale porzione: {fmt(t.totale)} {unita}
        {t.riferimento > 0 && <span className="text-xs font-normal text-muted-foreground"> · riferimento {fmt(t.riferimento)} (escluso)</span>}
        {(t.travi > 0 || t.sigillature > 0) && <span className="text-xs font-normal text-muted-foreground"> · travi {fmt(t.travi)} ml · sigillature {fmt(t.sigillature)} ml</span>}
      </p>
    </div>
  );
}