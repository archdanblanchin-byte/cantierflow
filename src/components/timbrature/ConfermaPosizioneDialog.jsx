import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Warehouse, AlertTriangle, Check, X } from "lucide-react";

// Chiede all'operatore di confermare il timbro quando la posizione GPS non
// corrisponde al cantiere: è al capannone oppure è fuori dal raggio consentito.
// Se conferma di lavorare per il cantiere in un altro posto, indica dove:
// quel "sì" fa calcolare la trasferta sulla posizione timbrata, non sul cantiere.
export default function ConfermaPosizioneDialog({
  open, tipo, cantiere, distanza, raggio, loading,
  onConfermaCapannone, onConfermaAltroLuogo, onCambiaCantiere, onClose,
}) {
  const [scelta, setScelta] = useState(null);
  const [luogo, setLuogo] = useState("");
  const isCapannone = tipo === "capannone";
  const km = distanza != null ? (distanza / 1000).toFixed(1) : "—";
  const raggioKm = raggio ? (raggio / 1000).toFixed(1) : "1.0";

  useEffect(() => {
    if (open) { setScelta(null); setLuogo(""); }
  }, [open]);

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
              <>Sei a <strong>{km} km</strong> dal cantiere <strong>{cantiere?.nome}</strong> (raggio consentito {raggioKm} km). Stai lavorando per questo cantiere in un altro posto?</>
            )}
          </DialogDescription>
        </DialogHeader>

        {isCapannone ? (
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full gap-2" disabled={loading} onClick={onConfermaCapannone}>
              <MapPin className="w-4 h-4" /> Sì, lavoro per {cantiere?.nome} dal capannone
            </Button>
            <Button variant="outline" className="w-full" disabled={loading} onClick={onCambiaCantiere}>
              No, cambio cantiere
            </Button>
          </DialogFooter>
        ) : (
          <>
            {scelta === null && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScelta(true)}
                  className="h-11 rounded-lg border-2 border-border bg-card text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Sì
                </button>
                <button
                  type="button"
                  onClick={() => setScelta(false)}
                  className="h-11 rounded-lg border-2 border-border bg-card text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" /> No
                </button>
              </div>
            )}

            {scelta === true && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Dove stai lavorando?</Label>
                  <Input
                    value={luogo}
                    onChange={(e) => setLuogo(e.target.value)}
                    placeholder="Es. Capannone, officina, casa del cliente..."
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  La trasferta verrà calcolata dalla posizione in cui hai timbrato, non dal cantiere.
                </p>
              </div>
            )}

            {scelta === false && (
              <p className="text-xs text-muted-foreground rounded-lg bg-muted p-3">
                Allora il cantiere selezionato non è quello giusto: scegli il cantiere in cui ti trovi.
              </p>
            )}

            <DialogFooter className="flex-col sm:flex-col gap-2">
              {scelta === true && (
                <Button
                  className="w-full"
                  disabled={loading || !luogo.trim()}
                  onClick={() => onConfermaAltroLuogo({ luogo: luogo.trim() })}
                >
                  Confermo il timbro
                </Button>
              )}
              {scelta === false && (
                <Button className="w-full" disabled={loading} onClick={onCambiaCantiere}>
                  Cambia cantiere
                </Button>
              )}
              <Button variant="ghost" className="w-full" disabled={loading} onClick={onClose}>Annulla</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}