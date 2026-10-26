import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown, ChevronRight, Clock, Navigation, AlertTriangle, StickyNote, Plus, ListPlus, NotebookPen,
} from "lucide-react";
import { fmtOre } from "@/lib/timbratureUtils";
import { calcolaOrePerCantiere } from "@/lib/rapportiniFromTimbrature";
import TimbraturaTimeline from "@/components/timbrature/TimbraturaTimeline";

// Riepilogo giornaliero per amministratori: una riga per collaboratore con le
// ore del giorno, le note scritte da lui e le timbrature fuori posto. Toccando
// la riga si apre il dettaglio con la timeline, da cui l'admin modifica,
// elimina oppure aggiunge un singolo timbro o una sequenza di timbri.
export default function GiornoPersoneList({
  timbrature = [], isAdmin = false, onEdit, onDelete, onAdd, onAddSequenza,
  giornoKey = null, noteGiornata = {},
}) {
  const [aperti, setAperti] = useState({});

  const perUtente = {};
  timbrature.forEach((t) => {
    const k = t.user_email || "—";
    (perUtente[k] ||= []).push(t);
  });

  const persone = Object.entries(perUtente)
    .map(([email, timbs]) => {
      const perCantiere = calcolaOrePerCantiere(timbs);
      return {
        email,
        nome: timbs[0].user_nome || email,
        timbri: timbs,
        ore: perCantiere.reduce((s, c) => s + (c.ore || 0), 0),
        spostamento: perCantiere.reduce((s, c) => s + (c.ore_spostamento || 0), 0),
        note: timbs.filter((t) => t.nota).length,
        fuoriPosto: timbs.filter((t) => t.in_cantiere === false).length,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  return (
    <div className="space-y-2 pt-2">
      {persone.map((p) => {
        const aperto = !!aperti[p.email];
        const email = p.email === "—" ? "" : p.email;
        // Nota testuale della giornata scritta dal dipendente in timbratura
        const nota = giornoKey ? noteGiornata[`${(p.email || "").toLowerCase()}|${giornoKey}`] : null;
        const haNota = !!(nota && (nota.testo || nota.dinamica));
        return (
          <div key={p.email} className="rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setAperti((s) => ({ ...s, [p.email]: !s[p.email] }))}
              className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-accent/40 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {(p.nome || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{p.nome}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <Badge variant="secondary" className="text-[10px] gap-1 font-medium">
                    <Clock className="w-2.5 h-2.5" />
                    {fmtOre(p.ore)}
                  </Badge>
                  {p.spostamento > 0 && (
                    <Badge variant="secondary" className="text-[10px] gap-1 font-medium text-orange-700">
                      <Navigation className="w-2.5 h-2.5" />
                      {fmtOre(p.spostamento)}
                    </Badge>
                  )}
                  {p.note > 0 && (
                    <Badge className="text-[10px] gap-1 bg-sky-100 text-sky-800 border-sky-300 font-semibold">
                      <StickyNote className="w-2.5 h-2.5" />
                      {p.note} note
                    </Badge>
                  )}
                  {haNota && (
                    <Badge className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20 font-semibold">
                      <NotebookPen className="w-2.5 h-2.5" />
                      Nota giornata
                    </Badge>
                  )}
                  {p.fuoriPosto > 0 && (
                    <Badge className="text-[10px] gap-1 bg-amber-100 text-amber-800 border-amber-300 font-semibold">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Fuori posto
                    </Badge>
                  )}
                </div>
              </div>
              {aperto ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {aperto && (
              <div className="px-2.5 pb-2.5 pt-1 space-y-3 border-t border-border">
                {haNota && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                      <NotebookPen className="w-3 h-3" /> Nota della giornata
                    </p>
                    {nota.dinamica && (
                      <p className="text-[11px] font-medium text-primary">Dinamica: {nota.dinamica}</p>
                    )}
                    {nota.testo && <p className="text-sm whitespace-pre-wrap">{nota.testo}</p>}
                  </div>
                )}
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onAdd?.(email)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Aggiungi timbro
                    </button>
                    <button
                      onClick={() => onAddSequenza?.(email)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      Aggiungi sequenza
                    </button>
                  </div>
                )}
                <TimbraturaTimeline
                  timbrature={p.timbri}
                  isAdmin={isAdmin}
                  onEdit={isAdmin ? onEdit : undefined}
                  onDelete={isAdmin ? onDelete : undefined}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}