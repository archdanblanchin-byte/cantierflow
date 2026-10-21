import { Rows3 } from "lucide-react";

// Stacco visivo tra una scaffalatura e la successiva nella lista ordinata per scaffale.
export default function IntestazioneScaffale({ scaffale, quantita }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
        <Rows3 className="w-3.5 h-3.5" />
        {scaffale === "senza" ? "Senza scaffale" : `Scaffale ${scaffale}`}
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0">
        {quantita} {quantita === 1 ? "prodotto" : "prodotti"}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}