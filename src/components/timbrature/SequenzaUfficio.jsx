import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ListPlus, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import TimbraturaSequenzaDialog from '@/components/timbrature/TimbraturaSequenzaDialog';

export default function SequenzaUfficio({ cantieri, aggiornaRapportino }) {
  const [busy, setBusy] = useState(false);
  const [sequenza, setSequenza] = useState(null);
  const [open, setOpen] = useState(false);
  const lock = useRef(false);
  const client = useQueryClient();
  const salva = async (timbri) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    try {
      const { data } = await base44.functions.invoke('sequenzaUfficio', timbri ? { ids:sequenza.map(t => t.id), timbri } : {});
      setSequenza(data.timbri);
      if (!timbri) setOpen(true);
      toast.success(timbri ? 'Sequenza aggiornata' : 'Quattro timbrature salvate per l’Ufficio');
      for (const key of ['timbrature-giornata','timbrature-giornaliere','storico-timbrature']) client.invalidateQueries({queryKey:[key]});
      const giorni = new Map((data.giornate || []).map(g => [g.inizio,g]));
      await Promise.all([...giorni.values()].map(g => aggiornaRapportino(null,g)));
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Non è stato possibile salvare la sequenza.');
      return false;
    } finally { lock.current = false; setBusy(false); }
  };
  return <>
    <Button size="sm" className="rounded-full px-2.5" disabled={busy} onClick={() => sequenza ? setOpen(true) : salva()} title={sequenza ? 'Modifica sequenza' : 'Aggiungi sequenza oggi: Ufficio, 07:00–16:30'} aria-label={sequenza ? 'Modifica sequenza' : 'Aggiungi sequenza'}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : sequenza ? <Pencil className="w-4 h-4" /> : <ListPlus className="w-4 h-4" />}
      <span className="hidden sm:inline">{sequenza ? 'Modifica sequenza' : 'Aggiungi sequenza'}</span>
    </Button>
    {sequenza && <TimbraturaSequenzaDialog open={open} onOpenChange={setOpen} sequenza={sequenza} cantieri={cantieri} onSave={salva} />}
  </>;
}