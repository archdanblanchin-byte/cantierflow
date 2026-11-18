import { Card } from "@/components/ui/card";
import Campo from "./Campo";
import FotoGrid from "./FotoGrid";

// Struttura storica (stanze e facciate): si mostra e si modifica senza convertirla.
// I campi non gestiti qui restano nel record così come sono.
export default function LegacyStanze({ draft, set }) {
  const stanze = draft.stanze || [];
  const facciate = draft.facciate || [];
  const upd = (campo, lista, i, k, v) => set(campo, lista.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const foto = (x) => (Array.isArray(x.foto) ? x.foto.map((f) => (typeof f === "string" ? { file_uri: f } : f)) : []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">Sopralluogo con struttura storica a stanze/facciate: i dati sono conservati senza conversione.</p>
      {stanze.map((s, i) => (
        <Card key={i} className="p-3 space-y-2">
          <p className="text-sm font-semibold">{s.ambito === "esterno" ? "Esterno" : "Interno"} · {s.nome || `Stanza ${i + 1}`}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Campo label="Nome" value={s.nome} onChange={(v) => upd("stanze", stanze, i, "nome", v)} />
            <Campo label="Lunghezza" numeric value={s.lunghezza} onChange={(v) => upd("stanze", stanze, i, "lunghezza", v)} />
            <Campo label="Larghezza" numeric value={s.larghezza} onChange={(v) => upd("stanze", stanze, i, "larghezza", v)} />
            <Campo label="Altezza" numeric value={s.altezza} onChange={(v) => upd("stanze", stanze, i, "altezza", v)} />
          </div>
          {foto(s).length > 0 && <FotoGrid titolo="Foto" items={foto(s)} onChange={(v) => upd("stanze", stanze, i, "foto", v)} />}
        </Card>
      ))}
      {facciate.map((f, i) => (
        <Card key={i} className="p-3 space-y-2">
          <p className="text-sm font-semibold">Facciata {f.orientamento || i + 1}</p>
          <Campo label="Orientamento" value={f.orientamento} onChange={(v) => upd("facciate", facciate, i, "orientamento", v)} />
        </Card>
      ))}
    </div>
  );
}