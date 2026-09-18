import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Loader2 } from "lucide-react";
import { ricalcolaTrasferte } from "@/lib/ricalcoloTrasferte";

export default function RicalcolaTrasferteCard() {
  const [me, setMe] = useState(null);
  const [conferma, setConferma] = useState(false);
  const [nRecord, setNRecord] = useState(null);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState(null);

  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  if (me?.role !== "admin") return null;

  const apri = async () => {
    setEsito(null);
    setNRecord(null);
    setConferma(true);
    try {
      const lista = await base44.entities.Trasferta.list("-data", 5000);
      setNRecord(lista.length);
    } catch {
      setNRecord(0);
    }
  };

  const esegui = async () => {
    setInCorso(true);
    try {
      const r = await ricalcolaTrasferte();
      setEsito(r);
    } finally {
      setInCorso(false);
      setConferma(false);
    }
  };

  return (
    <>
      <Card className="p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">Ricalcolo trasferte</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ricalcola le trasferte già registrate partendo dalle timbrature e dalla posizione: i giorni
            lavorati dalla sede perdono la trasferta, le altre tratte vengono aggiornate.
          </p>
        </div>
        <Button variant="outline" className="w-full gap-2" onClick={apri} disabled={inCorso}>
          {inCorso ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Ricalcola trasferte esistenti
        </Button>
        {esito && (
          <p className="text-xs text-muted-foreground">
            {esito.aggiornate} aggiornate · {esito.rimosse} rimosse (lavoro in sede) · {esito.saltate} non ricalcolabili
          </p>
        )}
      </Card>

      <AlertDialog open={conferma} onOpenChange={setConferma}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ricalcolare le trasferte?</AlertDialogTitle>
            <AlertDialogDescription>
              {nRecord == null
                ? "Conteggio dei record in corso…"
                : `Verranno ricalcolate ${nRecord} trasferte partendo dalle timbrature e dalla posizione. I giorni lavorati dalla sede non avranno più trasferta.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={inCorso}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={esegui} disabled={inCorso || nRecord == null}>
              {inCorso ? "Ricalcolo in corso…" : "Ricalcola"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}