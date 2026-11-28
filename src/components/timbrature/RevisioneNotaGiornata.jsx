import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function RevisioneNotaGiornata({ bozza, cantieri, onChange, onConfirm, onClose, busy, error }) {
  if (!bozza) return null;
  const opzioni = [...new Map([...cantieri, ...bozza.cantieri].filter(c => c.nome).map(c => [c.id,c.nome])).entries()];
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Rivedi la nota vocale</DialogTitle>
        <DialogDescription>Controlla i cantieri proposti. Se un riferimento non è chiaro, puoi scegliere il cantiere o lasciare l’attività non assegnata.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        {!bozza.attivita.length && <p className="text-sm text-muted-foreground">Non ho individuato attività: puoi comunque salvare la trascrizione.</p>}
        {bozza.attivita.map((a,i) => <div key={i} className="space-y-1 rounded-md border p-3">
          <p className="text-sm font-semibold">{a.nome}{Number.isFinite(a.ore) ? ` · ${a.ore.toLocaleString('it-IT')} h` : ''}</p>
          {a.cantiere_citato && <p className="break-words text-xs text-muted-foreground">Citato: {a.cantiere_citato}</p>}
          <label className="block text-xs font-medium">Cantiere
            <select className="mt-1 block h-9 w-full rounded-md border bg-background px-2 text-sm" value={a.cantiere_id || ''} disabled={busy} onChange={e => onChange(i,e.target.value)}>
              <option value="">Non assegnato</option>
              {opzioni.map(([id,nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </label>
        </div>)}
      </div>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Trascrizione</summary>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{bozza.trascrizione}</p>
      </details>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={onClose}>Scarta</Button>
        <Button disabled={busy} onClick={onConfirm}>{busy && <Loader2 className="animate-spin" />}Conferma e salva</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}