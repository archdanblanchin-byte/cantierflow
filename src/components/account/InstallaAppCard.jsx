import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Smartphone, Share, MoreVertical, Monitor } from "lucide-react";
import usePwaInstall from "@/hooks/usePwaInstall";

function Istruzioni({ piattaforma, inAnteprima }) {
  const passo = (Icona, testo) =>
  <li className="flex items-start gap-2">
      <Icona className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
      <span className="text-[11px] text-muted-foreground leading-relaxed">{testo}</span>
    </li>;


  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
      <p className="text-[11px] font-semibold">Come installarla</p>
      <ul className="space-y-1.5">
        {inAnteprima &&
        <li className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            <span className="text-[11px] text-muted-foreground leading-relaxed">
              Stai vedendo l'anteprima: per installare apri l'app dal suo link
              (everyday-4-0.base44.app) nel browser del telefono.
            </span>
          </li>
        }
        {!inAnteprima && piattaforma === "ios" &&
        passo(Share, "Con Safari tocca «Condividi» e poi «Aggiungi a Home».")}
        {!inAnteprima && piattaforma === "android" &&
        passo(MoreVertical, "Con Chrome tocca il menu ⋮ e poi «Installa app» (o «Aggiungi a schermata Home»).")}
        {!inAnteprima && piattaforma === "desktop" &&
        passo(Monitor, "Nel browser compare l'icona di installazione nella barra degli indirizzi: toccala e conferma.")}
      </ul>
    </div>);

}

export default function InstallaAppCard() {
  const { promptDisponibile, installata, inCorso, installa, piattaforma, inAnteprima } = usePwaInstall();

  return (
    <Card className="p-4 space-y-3 hidden">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Applicazione
      </p>

      {installata ?
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">EveryDay 4.0 è installata su questo dispositivo</p>
            <p className="text-[11px] text-muted-foreground">
              Si apre come una vera app, senza la barra degli indirizzi del browser.
            </p>
          </div>
        </div> :

      <>
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">📲</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Installa app sul dispositivo</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Userai lo stesso account e gli stessi dati della versione web.
              </p>
            </div>
          </div>

          {promptDisponibile &&
        <Button onClick={installa} disabled={inCorso} className="w-full gap-2">
              {inCorso ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
              Installa app
            </Button>
        }

          <Istruzioni piattaforma={piattaforma} inAnteprima={inAnteprima} />
        </>
      }
    </Card>);

}