import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Warehouse, AlertTriangle, Check, X } from "lucide-react";

// Chiede all'operatore di confermare il timbro quando la posizione GPS non
// corrisponde al cantiere: è al capannone oppure è oltre il raggio consentito.
// Vale allo stesso modo per tutti i ruoli: l'anomalia viene registrata con la
// posizione GPS reale e resta visibile nello storico e all'amministratore.
export default function ConfermaPosizioneDialog({
  open, tipo, cantiere, distanza, raggio, loading,
  onConfermaCapannone, onConfermaAltroLuogo, onCambiaCantiere, onClose,
}) {
  const isCapannone = tipo === "capannone";
  const km = distanza != null ? (distanza / 1000).toFixed(1) : "—";
  const raggioKm = raggio ? (raggio / 1000).toFixed(1) : "1.5";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isCapannone ? "bg-amber-100" : "bg-rose-100"}`}>
            {isCapannone
              ? <Warehouse className="w-5 h-5 text-amber-600" />
              : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          </div>
          <DialogTitle>{isCapannone ? "Stai lavorando dal capannone?" : "Sei fuori dal cantiere"}</DialogTitle>
          <DialogDescription>
            {isCapannone ? (
              <>La tua posizione risulta al capannone, ma hai selezionato il cantiere <strong>{cantiere?.nome}</strong>. Stai lavorando per questo cantiere dal capannone?</>
            ) : (
              <>La tua posizione risulta a più di <strong>{raggioKm} km</strong> dal cantiere <strong>{cantiere?.nome}</strong> (sei a {km} km). Stai comunque lavorando per questo cantiere?</>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          {isCapannone ? (
            <>
              <Button className="w-full gap-2" disabled={loading} onClick={onConfermaCapannone}>
                <MapPin className="w-4 h-4" /> Sì, lavoro per {cantiere?.nome} dal capannone
              </Button>
              <Button variant="outline" className="w-full" disabled={loading} onClick={onCambiaCantiere}>
                No, cambio cantiere
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full gap-2" disabled={loading} onClick={() => onConfermaAltroLuogo()}>
                <Check className="w-4 h-4" /> Sì, continua
              </Button>
              <Button variant="outline" className="w-full gap-2" disabled={loading} onClick={onClose}>
                <X className="w-4 h-4" /> No, annulla
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}