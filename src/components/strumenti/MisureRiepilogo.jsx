import React from "react";
import { fmtArea, fmtLen, fmtNum } from "@/lib/misure";

const somma = (lista, campo) => lista.reduce((a, m) => a + (m[campo] || 0), 0);

function Riga({ label, valore }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{valore}</span>
    </div>
  );
}

export default function MisureRiepilogo({ misure }) {
  const linee = misure.filter((m) => m.type === "line");
  const quote = misure.filter((m) => m.type === "quota");
  const aree = misure.filter((m) => m.type === "area" || m.type === "room");
  const perim = misure.filter((m) => m.type === "perimeter");

  const lavorazioni = {};
  misure.forEach((m) => {
    if (!m.lavorazione) return;
    const g = (lavorazioni[m.lavorazione] ||= { area: 0, length: 0 });
    if (m.area) g.area += m.area; else g.length += m.length || 0;
  });

  return (
    <div className="p-3 divide-y divide-slate-100">
      <Riga label={`Segmenti di misura (${linee.length})`} valore={fmtLen(somma(linee, "length"))} />
      <Riga label={`Quote (${quote.length})`} valore={fmtLen(somma(quote, "length"))} />
      <Riga label={`Aree e ambienti (${aree.length})`} valore={fmtArea(somma(aree, "area"))} />
      <Riga label="Perimetri aree e ambienti" valore={fmtLen(somma(aree, "perimeter"))} />
      <Riga label={`Perimetri (${perim.length})`} valore={fmtLen(somma(perim, "perimeter"))} />
      {Object.keys(lavorazioni).length > 0 && (
        <div className="pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Lavorazioni</div>
          {Object.entries(lavorazioni).map(([nome, g]) => (
            <Riga key={nome} label={nome} valore={g.area ? `${fmtNum(g.area)} m²` : fmtLen(g.length)} />
          ))}
        </div>
      )}
    </div>
  );
}