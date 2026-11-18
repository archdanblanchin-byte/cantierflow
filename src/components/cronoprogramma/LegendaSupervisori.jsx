export default function LegendaSupervisori({ supervisori }) {
  if (supervisori.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {["capocantiere", "responsabile"].map((r) => {
        const lista = supervisori.filter((s) => s.ruolo === r);
        if (!lista.length) return null;
        return (
          <div key={r} className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold capitalize">{r}:</span>
            {lista.map((s) => (
              <span key={s.id} className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: s.colore }} />{s.nome}</span>
            ))}
          </div>
        );
      })}
    </div>
  );
}