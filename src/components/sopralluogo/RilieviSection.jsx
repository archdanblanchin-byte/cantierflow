import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import RilievoCard from "./RilievoCard";
import RiepilogoTotali from "./RiepilogoTotali";
import LegacyStanze from "./LegacyStanze";
import { newId, nuovaPorzione, sposta } from "@/lib/sopralluogo";
import { totaliRilievi } from "@/lib/sopralluogoCalc";

export default function RilieviSection({ draft, set, anag }) {
  const [nome, setNome] = useState("");
  const altezzaRef = useRef("");
  const [, forza] = useState(0);
  const rilievi = draft.rilievi || [];
  const legacy = (draft.stanze || []).length > 0 || (draft.facciate || []).length > 0;

  const aggiungi = async () => {
    const n = nome.trim();
    if (!n) return;
    try {
      await anag.aggiungi("lavorazione", n);
    } catch {
      toast.error("Lavorazione aggiunta al rilievo ma non salvata in anagrafica");
    }
    set("rilievi", [...rilievi, { id: newId(), lavorazione: n, ambito: draft.tipo || "interno", note: "", foto: [], file: [], porzioni: [nuovaPorzione("semplice", altezzaRef.current)] }]);
    setNome("");
  };

  const setAltezza = (v) => {
    altezzaRef.current = v;
    forza((x) => x + 1);
  };

  return (
    <div className="space-y-3">
      {legacy && rilievi.length === 0 && <LegacyStanze draft={draft} set={set} />}
      {legacy && rilievi.length > 0 && (
        <details className="rounded-lg border p-2">
          <summary className="text-sm cursor-pointer">Dati storici (stanze e facciate)</summary>
          <div className="pt-2"><LegacyStanze draft={draft} set={set} /></div>
        </details>
      )}

      {["interno", "esterno"].map((amb) => {
        const elenco = rilievi.map((r, i) => ({ r, i })).filter(({ r }) => (r.ambito || "interno") === amb);
        if (!elenco.length) return null;
        return (
          <div key={amb} className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{amb === "interno" ? "Ambito interno" : "Ambito esterno"}</p>
            {elenco.map(({ r, i }) => (
              <RilievoCard
                key={r.id || i}
                rilievo={r}
                indice={i}
                totale={rilievi.length}
                anag={anag}
                ultimaAltezza={altezzaRef.current}
                onAltezza={setAltezza}
                onChange={(nr) => set("rilievi", rilievi.map((x, j) => (j === i ? nr : x)))}
                onMove={(d) => set("rilievi", sposta(rilievi, i, d))}
                onRemove={() => window.confirm("Eliminare questa lavorazione e le sue misure?") && set("rilievi", rilievi.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        );
      })}

      <div className="flex gap-2">
        <input list="sp-lavorazioni" className="flex-1 h-10 rounded-md border border-input bg-transparent px-3 text-sm" placeholder="Scegli o scrivi una lavorazione" value={nome} onChange={(e) => setNome(e.target.value)} />
        <datalist id="sp-lavorazioni">{anag.voci("lavorazione").map((v) => <option key={v} value={v} />)}</datalist>
        <Button type="button" className="gap-1" onClick={aggiungi} disabled={!nome.trim()}><Plus className="w-4 h-4" />Aggiungi</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Le voci nuove vengono salvate nelle anagrafiche del Sopralluogo.</p>
      {rilievi.length > 0 && <RiepilogoTotali tot={totaliRilievi(rilievi)} />}
    </div>
  );
}

export { Input };