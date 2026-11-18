import Campo from "./Campo";
import RigheDettaglio from "./RigheDettaglio";
import FrecceAzioni from "./FrecceAzioni";
import { calcolaMisura, conSottrazioni, fmt } from "@/lib/sopralluogoCalc";

const CAMPI = {
  semplice: [["valore", "Quantità"]],
  base_altezza: [["base", "Base"], ["altezza", "Altezza"]],
  stanza: [["lunghezza", "Lunghezza"], ["larghezza", "Larghezza"], ["altezza", "Altezza"]],
  lls: [["lunghezza", "Lunghezza"], ["larghezza", "Larghezza"], ["sviluppo", "Sviluppo"]],
  mq_sviluppo: [["mq", "m²"], ["sviluppo", "Sviluppo"]],
};

export default function MisuraEditor({ modalita, misura, unita, onChange, indice, totale, onMove, onRemove, anag, onAltezza }) {
  const set = (k, v) => {
    onChange({ ...misura, [k]: v });
    if (modalita === "stanza" && k === "altezza") onAltezza?.(v);
  };
  const r = calcolaMisura(modalita, misura);
  const campi = CAMPI[modalita] || CAMPI.semplice;

  return (
    <div className={`rounded-lg border p-2.5 space-y-2 ${misura.riferimento ? "bg-amber-50/60 border-amber-200" : "bg-muted/30"}`}>
      <div className="flex items-center gap-2">
        <input
          list={modalita === "stanza" ? "sp-stanze" : undefined}
          className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          placeholder={modalita === "stanza" ? "Nome stanza" : "Descrizione misura"}
          value={misura.descrizione || ""}
          onChange={(e) => set("descrizione", e.target.value)}
        />
        <FrecceAzioni i={indice} n={totale} onMove={onMove} onRemove={onRemove} />
      </div>
      {modalita === "stanza" && <datalist id="sp-stanze">{anag.voci("stanza").map((s) => <option key={s} value={s} />)}</datalist>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {campi.map(([k, l]) => (
          <Campo key={k} label={l} numeric value={misura[k]} onChange={(v) => set(k, v)} />
        ))}
      </div>
      {modalita === "stanza" && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!misura.soffitto} onChange={(e) => set("soffitto", e.target.checked)} /> Includi soffitto
        </label>
      )}
      {conSottrazioni(modalita) && (
        <div className="grid sm:grid-cols-2 gap-3">
          <RigheDettaglio titolo="Sottrazioni (aperture)" listId="sp-sott" suggerimenti={anag.voci("sottrazione")} righe={misura.sottrazioni} onChange={(v) => set("sottrazioni", v)} />
          <RigheDettaglio titolo="Aggiunte" listId="sp-agg" suggerimenti={anag.voci("elemento")} righe={misura.aggiunte} onChange={(v) => set("aggiunte", v)} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Travi (ml, separate)" numeric value={misura.travi_ml} onChange={(v) => set("travi_ml", v)} />
        <Campo label="Sigillature (ml, separate)" numeric value={misura.sigillature_ml} onChange={(v) => set("sigillature_ml", v)} />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={!!misura.riferimento} onChange={(e) => set("riferimento", e.target.checked)} /> Misura di riferimento (non sommata nei totali)
      </label>
      <p className="text-xs text-muted-foreground font-mono break-words">{r.formula} {unita}{misura.riferimento ? " · non sommata" : ""}</p>
    </div>
  );
}

export { fmt };