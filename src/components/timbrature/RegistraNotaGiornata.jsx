import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import RevisioneNotaGiornata from '@/components/timbrature/RevisioneNotaGiornata';
import useRegistrazione, { tempoVocale } from '@/lib/useRegistrazione';

export default function RegistraNotaGiornata({ minutiGiornata, onSave, disabled }) {
  const [bozza, setBozza] = useState(null);
  const [errore, setErrore] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [avviando, setAvviando] = useState(false);
  const [caricando, setCaricando] = useState(false);
  const input = useRef(null);
  const analizza = async audio => {
    const { data } = await base44.functions.invoke('salvaNotaVocaleTimbratura', { azione: 'testo', audio, minutiGiornata });
    if (!data?.testo?.trim()) throw new Error('Nessun testo riconosciuto.');
    setErrore('');
    setBozza(data.testo);
  };
  const { stato, secondi, avvia, ferma } = useRegistrazione({ filePrivato: true, onAudio: analizza, onErrore: messaggio => toast.error(messaggio) });
  useEffect(() => { if (stato === 'registrazione' && secondi >= 300) ferma(); }, [stato, secondi, ferma]);
  const carica = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const estensione = file.name.match(/\.(webm|ogg|oga|mp4|m4a|mp3|wav|mpeg|mpga|flac)$/i)?.[1].toLowerCase();
    if (!estensione || file.size > 25_000_000 || !file.size) return toast.error('Scegli un file audio valido di massimo 25 MB.');
    setCaricando(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: new File([file], `vocale.${estensione}`, { type: file.type }) });
      await analizza(file_uri);
    }
    catch (e) { toast.error(e?.response?.data?.error || 'Non è stato possibile elaborare il file audio.'); }
    finally { setCaricando(false); }
  };
  const salva = async () => {
    setSalvando(true);
    setErrore('');
    try { await onSave(bozza.trim()); setBozza(null); }
    catch (e) { setErrore(e.message || 'Non è stato possibile salvare la nota. Riprova.'); }
    finally { setSalvando(false); }
  };
  const elabora = caricando || stato === 'elaborazione';
  const bloccato = disabled || avviando || elabora || bozza !== null;
  return <div className="ml-auto flex flex-wrap gap-2">
    <Button type="button" size="sm" variant={stato === 'registrazione' ? 'destructive' : 'default'} disabled={stato !== 'registrazione' && bloccato} onClick={async () => { if (stato === 'registrazione') return ferma(); setAvviando(true); try { await avvia(); } finally { setAvviando(false); } }}>
      {avviando || elabora ? <Loader2 className="animate-spin" /> : stato === 'registrazione' ? <Square /> : <Mic />}{stato === 'registrazione' ? `Termina ${tempoVocale(secondi)}` : elabora ? 'Elaborazione…' : 'Registra audio'}
    </Button>
    <Button type="button" size="sm" variant="outline" disabled={bloccato || stato !== 'idle'} onClick={() => input.current?.click()}><Upload /> Carica audio</Button>
    <input ref={input} type="file" accept=".webm,.ogg,.oga,.mp4,.m4a,.mp3,.wav,.mpeg,.mpga,.flac" className="hidden" onChange={carica} />
    <RevisioneNotaGiornata bozza={bozza} onChange={setBozza} onClose={() => setBozza(null)} onConfirm={salva} busy={salvando} error={errore} />
  </div>;
}