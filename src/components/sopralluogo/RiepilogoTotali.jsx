import { fmt, fmtTotali } from "@/lib/sopralluogoCalc";

// Totali per ambito, per unità e complessivo. Le misure di riferimento restano fuori.
export default function RiepilogoTotali({ tot }) {
  return (
    <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-sm space-y-1">
      <p><span className="text-muted-foreground">Interno:</span> <b>{fmtTotali(tot.perAmbito.interno)}</b></p>
      <p><span className="text-muted-foreground">Esterno:</span> <b>{fmtTotali(tot.perAmbito.esterno)}</b></p>
      <p><span className="text-muted-foreground">Totale complessivo:</span> <b>{fmtTotali(tot.complessivo)}</b></p>
      {(tot.travi > 0 || tot.sigillature > 0) && (
        <p className="text-xs text-muted-foreground">Separati: travi {fmt(tot.travi)} ml · sigillature {fmt(tot.sigillature)} ml</p>
      )}
      {Object.keys(tot.riferimento).length > 0 && (
        <p className="text-xs text-muted-foreground">Misure di riferimento (non sommate): {fmtTotali(tot.riferimento)}</p>
      )}
    </div>
  );
}