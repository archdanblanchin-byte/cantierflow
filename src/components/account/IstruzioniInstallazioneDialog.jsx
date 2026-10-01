import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share, MoreVertical, Monitor } from "lucide-react";

const ISTRUZIONI = {
  ios: {
    titolo: "Installa su iPhone / iPad",
    intro: "Safari non permette l'installazione automatica: bastano tre passaggi.",
    passi: [
      { icona: Share, testo: "Tocca il pulsante Condividi in basso (il quadrato con la freccia verso l'alto)." },
      { icona: null, testo: "Scorri l'elenco e scegli «Aggiungi alla schermata Home»." },
      { icona: null, testo: "Tocca «Aggiungi»: l'icona di EveryDay 4.0 comparirà sulla schermata Home." },
    ],
  },
  android: {
    titolo: "Installa su Android",
    intro: "Dal menu di Chrome puoi aggiungere l'app alla schermata Home.",
    passi: [
      { icona: MoreVertical, testo: "Apri il menu con i tre puntini in alto a destra di Chrome." },
      { icona: null, testo: "Scegli «Installa app» oppure «Aggiungi a schermata Home»." },
      { icona: null, testo: "Conferma: l'app si aprirà senza la barra degli indirizzi." },
    ],
  },
  desktop: {
    titolo: "Installa su computer",
    intro: "Con Chrome o Edge puoi installare l'app come programma sul tuo computer.",
    passi: [
      { icona: Monitor, testo: "Nella barra degli indirizzi cerca l'icona di installazione (monitor con la freccia) a destra." },
      { icona: MoreVertical, testo: "In alternativa: menu del browser (tre puntini) → «Installa EveryDay 4.0»." },
      { icona: null, testo: "Conferma «Installa»: l'app si aprirà in una finestra dedicata." },
    ],
  },
};

export default function IstruzioniInstallazioneDialog({ open, onOpenChange, piattaforma = "desktop" }) {
  const info = ISTRUZIONI[piattaforma] || ISTRUZIONI.desktop;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl leading-none">📲</span> {info.titolo}
          </DialogTitle>
          <DialogDescription>{info.intro}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {info.passi.map((passo, i) => {
            const Icona = passo.icona;
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed flex items-start gap-1.5">
                  {Icona && <Icona className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />}
                  <span>{passo.testo}</span>
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          L'app installata usa lo stesso account, la stessa sessione e gli stessi dati di quella
          aperta nel browser: non viene creato nessun secondo account.
        </p>
      </DialogContent>
    </Dialog>
  );
}