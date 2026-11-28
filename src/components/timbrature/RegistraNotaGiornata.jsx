import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import SheetSelect from '@/components/ui/sheet-select';
import useRegistrazione, { tempoVocale } from '@/lib/useRegistrazione';

export default function RegistraNotaGiornata({ cantieri, ultimoCantiere, giorno }) {
  const client = useQueryClient();
  const [scelto, setScelto] = useState('');
  const [avviando,setAvviando] = useState(false);
  const contesto = useRef(null);
  const opzioni = [...new Map([ultimoCantiere,...cantieri].filter(c => c?.id).map(c => [c.id,{value:c.id,label:c.nome}])).values()];
  const id = scelto || ultimoCantiere?.id || '';
  const {stato,secondi,avvia,ferma} = useRegistrazione({filePrivato:true,
    onAudio: async audio => {
      await base44.functions.invoke('salvaNotaVocaleTimbratura',{audio,...contesto.current});
      await client.invalidateQueries({queryKey:['note-vocali-timbratura']});
      toast.success('Nota vocale salvata');
    },
    onErrore: messaggio => toast.error(messaggio),
  });
  useEffect(() => { if (stato === 'registrazione' && secondi >= 300) ferma(); }, [stato,secondi,ferma]);
  const inizia = async () => {
    if (avviando || !id || stato !== 'idle') return;
    contesto.current = {cantiere_id:id,data:giorno};
    setAvviando(true);
    try { await avvia(); } finally { setAvviando(false); }
  };
  return <>
    <Button type="button" size="sm" className="ml-auto" variant={stato === 'registrazione' ? 'destructive' : 'default'} disabled={avviando || stato === 'elaborazione' || (!id && stato === 'idle')} onClick={stato === 'registrazione' ? ferma : inizia}>
      {avviando || stato === 'elaborazione' ? <Loader2 className="w-4 h-4 animate-spin" /> : stato === 'registrazione' ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {stato === 'registrazione' ? `Salva ${tempoVocale(secondi)}` : stato === 'elaborazione' ? 'Elaborazione…' : 'Registra audio'}
    </Button>
    <div className="basis-full flex flex-wrap items-center gap-2">
      <Label className="text-xs">Cantiere della nota vocale</Label>
      <div className="min-w-36 flex-1"><SheetSelect value={id} onValueChange={setScelto} options={opzioni} searchable disabled={avviando || stato !== 'idle'} placeholder="Seleziona cantiere" /></div>
    </div>
  </>;
}