import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function RevisioneNotaGiornata({ bozza, onChange, onConfirm, onClose, busy, error }) {
  return <Dialog open={bozza !== null} onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Rivedi la nota della giornata</DialogTitle>
        <DialogDescription>Correggi il testo prima di aggiungerlo alle tue Note della giornata. Non verranno modificati rapportini o cantieri.</DialogDescription>
      </DialogHeader>
      <Textarea aria-label="Testo della nota" value={bozza ?? ''} onChange={e => onChange(e.target.value)} disabled={busy} rows={8} maxLength={20000} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Scarta</Button>
        <Button type="button" disabled={busy || !bozza?.trim()} onClick={onConfirm}>{busy && <Loader2 className="animate-spin" />}Conferma e salva</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}