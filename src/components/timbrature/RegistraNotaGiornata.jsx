import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import RevisioneNotaGiornata from '@/components/timbrature/RevisioneNotaGiornata';
import useRegistrazione, { tempoVocale } from '@/lib/useRegistrazione';

export default function RegistraNotaGiornata({ cantieri, giorno }) {
  const client = useQueryClient();
  const [bozza,setBozza] = useState(null);
  const [errore,setErrore] = useState('');
  const [salvando,setSalvando] = useState(false);
  const [avviando,setAvviando] = useState(false);
  const lock = useRef(false);
  const {stato,secondi,avvia,ferma} = useRegistrazione({filePrivato:true,
    onAudio: async audio => {
      const { data } = await base44.functions.invoke('salvaNotaVocaleTimbratura',{azione:'analizza',audio,data:giorno});
      setErrore('');
      setBozza({...data,audio,giorno});
    },
    onErrore: messaggio => toast.error(messaggio),
  });
  useEffect(() => { if (stato === 'registrazione' && secondi >= 300) ferma(); }, [stato,secondi,ferma]);
  const inizia = async () => {
    if (avviando || stato !== 'idle' || bozza) return;
    setAvviando(true);
    try { await avvia(); } finally { setAvviando(false); }
  };
  const salva = async () => {
    if (lock.current) return;
    lock.current = true;
    setSalvando(true);
    setErrore('');
    try {
      await base44.functions.invoke('salvaNotaVocaleTimbratura',{azione:'salva',audio:bozza.audio,data:bozza.giorno,trascrizione:bozza.trascrizione,attivita:bozza.attivita});
      setBozza(null);
      client.invalidateQueries({queryKey:['note-vocali-timbratura']});
      toast.success('Nota vocale salvata');
    } catch (e) { setErrore(e?.response?.data?.error || 'Non è stato possibile salvare la nota vocale. Riprova.'); }
    finally { lock.current = false; setSalvando(false); }
  };
  return <>
    <Button type="button" size="sm" className="ml-auto" variant={stato === 'registrazione' ? 'destructive' : 'default'} disabled={avviando || stato === 'elaborazione' || !!bozza} onClick={stato === 'registrazione' ? ferma : inizia}>
      {avviando || stato === 'elaborazione' ? <Loader2 className="w-4 h-4 animate-spin" /> : stato === 'registrazione' ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {stato === 'registrazione' ? `Termina ${tempoVocale(secondi)}` : stato === 'elaborazione' ? 'Elaborazione…' : 'Registra audio'}
    </Button>
    <RevisioneNotaGiornata bozza={bozza} cantieri={cantieri} busy={salvando} error={errore} onClose={() => setBozza(null)} onConfirm={salva}
      onChange={(i,id) => setBozza(b => ({...b,attivita:b.attivita.map((a,j) => i === j ? {...a,cantiere_id:id} : a)}))} />
  </>;
}