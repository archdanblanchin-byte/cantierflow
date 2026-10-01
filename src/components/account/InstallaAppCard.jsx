import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Smartphone } from "lucide-react";
import usePwaInstall from "@/hooks/usePwaInstall";

export default function InstallaAppCard() {
  const { promptDisponibile, installata, inCorso, installa } = usePwaInstall();

  return (
    <Card className="p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Applicazione
      </p>

      {installata ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">EveryDay 4.0 è installata su questo dispositivo</p>
            <p className="text-[11px] text-muted-foreground">
              Si apre come una vera app, senza la barra degli indirizzi del browser.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">📲</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm">Installa app sul dispositivo</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                L'installazione parte in automatico al primo tocco sull'app. In alternativa, puoi
                avviarla qui. Userai lo stesso account e gli stessi dati della versione web.
              </p>
            </div>
          </div>
          <Button
            onClick={installa}
            disabled={inCorso || !promptDisponibile}
            className="w-full gap-2"
          >
            {inCorso ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            Installa app
          </Button>
          {!promptDisponibile && (
            <p className="text-[11px] text-muted-foreground">
              Questo browser non permette l'installazione automatica dell'app.
            </p>
          )}
        </>
      )}
    </Card>
  );
}