import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtOre } from '@/lib/timbratureUtils';
import { descriviVoce } from '@/components/wizard/modificheVocali';

const etichette = { aggiungi: 'Aggiunta', correggi: 'Modificata', rimuovi: 'Rimossa' };
export default function RevisioneAudioDialog({ proposta, materiale, onClose, onConfirm }) {
  return <Dialog open={!!proposta} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Rivedi la dettatura</DialogTitle>
        <DialogDescription>Le altre voci rimangono invariate. Le modifiche entrano nel rapportino solo dopo la conferma.</DialogDescription>
      </DialogHeader>
      {proposta?.avviso && <p className="rounded-md bg-muted p-2 text-sm" role="status">{proposta.avviso}</p>}
      <ul className="max-h-[45dvh] space-y-2 overflow-y-auto">
        {proposta?.cambi.map(({ index, azione, prima, dopo, residuo }) => <li key={index} className="rounded-lg border p-3 text-sm">
          <div className="font-semibold">{etichette[azione]}{residuo && ' · Ore residue'}</div>
          {prima && <div className="text-muted-foreground">Prima: {descriviVoce(prima, materiale, fmtOre)}</div>}
          {dopo && <div>{prima && 'Dopo: '}{descriviVoce(dopo, materiale, fmtOre)}</div>}
        </li>)}
        {!proposta?.cambi.length && <li className="text-sm text-muted-foreground">Nessuna modifica da applicare.</li>}
      </ul>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{proposta?.cambi.length ? 'Annulla' : 'Chiudi'}</Button>
        {!!proposta?.cambi.length && <Button onClick={onConfirm}>Applica al rapportino</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}