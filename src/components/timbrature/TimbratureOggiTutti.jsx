import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import TimbraturaTimeline from "@/components/timbrature/TimbraturaTimeline";
import { arrotondaQuarti, fmtOre } from "@/lib/timbratureUtils";

// Vista per amministratore: tutte le timbrature della giornata di tutti gli utenti,
// raggruppate per collaboratore con la propria timeline.
export default function TimbratureOggiTutti({ timbrature = [] }) {
  if (!timbrature.length) return null;

  // Raggruppa per utente
  const perUtente = {};
  timbrature.forEach((t) => {
    const k = t.user_email || "—";
    (perUtente[k] ||= []).push(t);
  });

  const gruppi = Object.entries(perUtente)
    .map(([email, list]) => ({
      email,
      nome: list[0]?.user_nome || email,
      list: list.slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora)),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <Card className="p-4 space-y-3 border-primary/20">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Users className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Timbrature di oggi · tutti gli utenti</p>
        <Badge className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/20">
          {gruppi.length} utenti
        </Badge>
      </div>
      <div className="space-y-4">
        {gruppi.map((g) => {
          const ore = oreGiornata(g.list);
          return (
            <div key={g.email} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {(g.nome || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{g.nome}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{g.email}</p>
                </div>
                {ore > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-medium">
                    {fmtOre(ore)}
                  </Badge>
                )}
              </div>
              <TimbraturaTimeline timbrature={g.list} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function oreGiornata(timbs) {
  const perCantiere = {};
  timbs.forEach((t) => {
    if (t.tipo_evento === "spostamento") return;
    if (!t.cantiere_id) return;
    (perCantiere[t.cantiere_id] ||= []).push(t);
  });
  let tot = 0;
  Object.values(perCantiere).forEach((g) => {
    const ing = g.find((t) => t.tipo_evento === "ingresso");
    const usc = g.find((t) => t.tipo_evento === "uscita");
    if (ing && usc) {
      let ms = new Date(usc.data_ora) - new Date(ing.data_ora);
      const pIn = g.filter((t) => t.tipo_evento === "pausa_inizio");
      const pFin = g.filter((t) => t.tipo_evento === "pausa_fine");
      const n = Math.min(pIn.length, pFin.length);
      for (let i = 0; i < n; i++) ms -= new Date(pFin[i].data_ora) - new Date(pIn[i].data_ora);
      tot += arrotondaQuarti(ms);
    }
  });
  return tot;
}