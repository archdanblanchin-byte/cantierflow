import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HelpCircle, Check, X } from "lucide-react";

const DOMANDE = [
  { key: "spostamento", testo: (m) => `Ti mancano ${m} minuti di lavoro: li hai fatti di spostamento tra cantieri?` },
  { key: "fermata", testo: () => "Ti sei fermato da qualche parte? Hai comprato materiale?" },
  { key: "mezzoProprio", testo: () => "Hai usato la tua macchina?" },
];

function DomandaSiNo({ testo, valore, onChange }) {
  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <p className="text-sm font-medium leading-snug">{testo}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`h-10 rounded-lg border-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            valore === true ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
          }`}
        >
          <Check className="w-4 h-4" /> Sì
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`h-10 rounded-lg border-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            valore === false ? "border-rose-400 bg-rose-50 text-rose-700" : "border-border bg-card"
          }`}
        >
          <X className="w-4 h-4" /> No
        </button>
      </div>
    </div>
  );
}

// Alla chiusura del cantiere aiuta l'operatore a spiegare il tempo non coperto
// dalle timbrature: le risposte diventano la nota individuale della timbratura.
export default function DomandeGuidaDialog({ open, minutiMancanti, loading, onConferma, onSalta }) {
  const [risposte, setRisposte] = useState({ spostamento: null, fermata: null, mezzoProprio: null });
  const [nota, setNota] = useState("");

  useEffect(() => {
    if (open) {
      setRisposte({ spostamento: null, fermata: null, mezzoProprio: null });
      setNota("");
    }
  }, [open]);

  const set = (k, v) => setRisposte((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onSalta()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <DialogTitle>Aiutaci a completare la giornata</DialogTitle>
          <DialogDescription>Hai chiuso il lavoro: due domande veloci per spiegare le ore.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {DOMANDE.map((d) => (
            <DomandaSiNo
              key={d.key}
              testo={d.testo(minutiMancanti)}
              valore={risposte[d.key]}
              onChange={(v) => set(d.key, v)}
            />
          ))}
          <div className="space-y-1">
            <Label className="text-xs">Vuoi aggiungere una nota?</Label>
            <Textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="min-h-[60px] text-sm"
              placeholder="Es. fermato in officina, comprato materiale..."
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button className="w-full" disabled={loading} onClick={() => onConferma({ ...risposte, nota })}>
            Salva le risposte
          </Button>
          <Button variant="ghost" className="w-full" disabled={loading} onClick={onSalta}>Salta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}