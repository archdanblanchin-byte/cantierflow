import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Warehouse, AlertTriangle } from "lucide-react";

// Chiede all'operatore di confermare il timbro quando la posizione GPS non
// corrisponde al cantiere: è al capannone oppure è fuori dal raggio consentito.
export default function ConfermaPosizioneDialog({
  open, tipo, cantiere, distanza, raggio, loading,
  onConfermaCapannone, onConfermaFuoriRaggio, onCambiaCantiere, onClose,
}) {
  const [nota, setNota] = useState("");
  const isCapannone = tipo === "capannone";
  const km = distanza != null ? (distanza / 1000).toFixed(1) : "—";
  const raggioKm = raggio ? (raggio / 1000).toFixed(1) : "1.0";

  useEffect(() => { if (open) setNota(""); }, [open]);

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
              <>Sei a <strong>{km} km</strong> dal cantiere <strong>{cantiere?.nome}</strong> (raggio consentito {raggioKm} km). Confermi di essere al lavoro per questo cantiere?</>
            )}
          </DialogDescription>
        </DialogHeader>

        {!isCapannone && (
          <div className="space-y-1">
            <Label className="text-xs">Nota obbligatoria: spiega perché sei fuori cantiere</Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="min-h-[70px] text-sm"
              placeholder="Es. fermo in officina per ritiro materiale..."
            />
          </div>
        )}

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
              <Button className="w-full" disabled={loading || !nota.trim()} onClick={() => onConfermaFuoriRaggio(nota.trim())}>
                Confermo il timbro
              </Button>
              <Button variant="ghost" className="w-full" disabled={loading} onClick={onClose}>Annulla</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}