import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Proposta di task: si può modificare e creare (come task nell'elenco Task) oppure saltare.
export default function ModaleTaskAutomatico({ proposta, onClose }) {
  const [titolo, setTitolo] = useState(proposta?.titolo || '');
  const [testo, setTesto] = useState(proposta?.testo || '');
  const [saving, setSaving] = useState(false);

  const crea = async () => {
    setSaving(true);
    try {
      await base44.entities.Nota.create({
        tipo: 'task',
        titolo,
        testo: testo || titolo,
        priorita: proposta?.priorita || 'media',
        privata: true,
        origine: 'manuale',
      });
      toast.success('Task creato');
      onClose();
    } catch {
      toast.error('Creazione del task non riuscita');
    }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Creare un task?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo" />
          <Textarea rows={3} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Descrizione" />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Salta</Button>
          <Button type="button" onClick={crea} disabled={saving || !titolo.trim()}>
            {saving ? 'Creo…' : 'Crea task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}