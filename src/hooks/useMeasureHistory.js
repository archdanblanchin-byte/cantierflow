import { useRef, useState } from "react";

const LIMITE = 60;

const dati = (r) => {
  const { id, created_date, updated_date, created_by_id, created_by, ...resto } = r;
  return resto;
};

// Annulla / ripristina per creazioni, modifiche e cancellazioni delle misure.
export default function useMeasureHistory({ create, update, remove }) {
  const undo = useRef([]);
  const redo = useRef([]);
  const [, bump] = useState(0);

  const registra = (azione) => {
    undo.current = [...undo.current.slice(-(LIMITE - 1)), azione];
    redo.current = [];
    bump((n) => n + 1);
  };

  const applica = async (a, verso) => {
    const annulla = verso === "undo";
    if (a.kind === "create") {
      if (annulla) await remove(a.record.id);
      else a.record = await create(dati(a.record));
    } else if (a.kind === "delete") {
      if (annulla) a.record = await create(dati(a.record));
      else await remove(a.record.id);
    } else {
      await update(a.id, annulla ? a.before : a.after);
    }
  };

  const annulla = async () => {
    const a = undo.current.pop();
    if (!a) return;
    await applica(a, "undo");
    redo.current.push(a);
    bump((n) => n + 1);
  };

  const ripristina = async () => {
    const a = redo.current.pop();
    if (!a) return;
    await applica(a, "redo");
    undo.current.push(a);
    bump((n) => n + 1);
  };

  return {
    registra,
    annulla,
    ripristina,
    puoAnnullare: undo.current.length > 0,
    puoRipristinare: redo.current.length > 0,
  };
}