import { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Pannello collassabile con esempi concreti su come dettare
 * per ottenere il migliore risultato dall'IA.
 * mode: "extra" | "normali" | "materiali"
 */
const GUIDE = {
  extra: {
    title: "Come dettare le lavorazioni extra",
    intro: "Descrivi ogni lavorazione NON prevista dal preventivo dicendo COSA hai fatto e DOVE, in frasi brevi e chiare. Le ore le inserirai manualmente dopo.",
    examples: [
      "Oggi abbiamo rifatto l'intonaco della parete sud in cucina perché era danneggiato dall'umidità.",
      "Montato un corrimano nuovo sulle scale esterne, lato cortile.",
      "Ripulito il marciapiede di fronte al cantiere a fine giornata, Cliente Neri.",
    ],
  },
  normali: {
    title: "Come dettare le lavorazioni preventivate",
    intro: "Nomina ogni lavorazione prevista dicendo COSA e DOVE, con i dettagli che aiuteranno a ricostruire la giornata. L'IA la abbina al catalogo; le ore le inserirai dopo. IMPORTANTE: se parli di tinteggiatura, pitturazione, raschiatura o fondo su pareti/muri/soffitti, citale esplicitamente (es. 'parete', 'muro', 'soffitto') così l'IA non le scambia per interventi su travi in legno.",
    examples: [
      "Demolizione: tolto il vecchio pavimento della stanza a nord e del bagno.",
      "Posato il nuovo gres porcellanato nella zona giorno, circa 40 metri quadri, oltre la soglia della cucina.",
      "Raschiato la vecchia tinta della parete sud, dato fondo uniformante e poi pitturato con due mani di bianco opaco.",
    ],
  },
  materiali: {
    title: "Come dettare i materiali",
    intro: "Elenca ogni materiale con la QUANTITÀ, l'UNITÀ DI MISURA e DOVE lo hai preso o le specifiche del prodotto. L'IA divide automaticamente le voci.",
    examples: [
      "Cinque sacchi di malta presi al capannone stamattina.",
      "Tre bidoni di pittura bianca opaca, ritirati dal fornitore Colori Rossi.",
      "Due rotoli di nastro di carta per le mascherature, dal magazzino.",
    ],
  },
};

export default function DictationGuide({ mode }) {
  const [open, setOpen] = useState(false);
  const g = GUIDE[mode];
  if (!g) return null;

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Lightbulb className="w-3.5 h-3.5" />
          {g.title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0.5">
          <p className="text-xs text-amber-800/90">{g.intro}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700/80">Esempi</p>
          <ul className="mt-1 space-y-1">
            {g.examples.map((ex, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-amber-900/80">
                <span className="text-amber-500 mt-0.5">›</span>
                <span className="italic">"{ex}"</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}