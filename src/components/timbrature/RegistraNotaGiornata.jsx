import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import useRegistrazione, { tempoVocale } from '@/lib/useRegistrazione';

export default function RegistraNotaGiornata({ minutiGiornata, nota, onSave, disabled }) {
  const [avviando, setAvviando] = useState(false);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState('');
  const input = useRef(null);
  const contesto = useRef(null);
  contesto.current = { minutiGiornata, nota, onSave, disabled };
  const segnala = messaggio => setErrore(messaggio);
  const analizza = async audio => {
    const { nota: originale, minutiGiornata } = contesto.current;
    const { data } = await base44.functions.invoke('salvaNotaVocaleTimbratura', { azione: 'testo', audio, minutiGiornata, nota: originale });
    if (typeof data?.testo !== 'string') {
      segnala('Nessuna modifica riconosciuta. La nota è rimasta invariata.');
      return;
    }
    if (contesto.current.nota !== originale || contesto.current.disabled) {
      segnala('La nota è cambiata durante l’elaborazione: ripeti la dettatura per non perdere le modifiche.');
      return;
    }
    try {
      await contesto.current.onSave(data.testo);
      if (data.avviso) toast.warning(data.avviso);
    } catch {
      segnala('Il testo è nella nota, ma non è stato salvato. Premi Salva nota per riprovare.');
    }
  };
  const { stato, secondi, avvia, ferma } = useRegistrazione({ filePrivato: true, onAudio: analizza, onErrore: segnala });
  useEffect(() => { if (stato === 'registrazione' && secondi >= 300) ferma(); }, [stato, secondi, ferma]);
  const carica = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const estensione = file.name.match(/\.(webm|ogg|oga|mp4|m4a|mp3|wav|mpeg|mpga|flac)$/i)?.[1].toLowerCase();
    if (!estensione || file.size > 25_000_000 || !file.size) return toast.error('Scegli un file audio valido di massimo 25 MB.');
    setErrore('');
    setCaricando(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: new File([file], `vocale.${estensione}`, { type: file.type }) });
      await analizza(file_uri);
    } catch (e) {
      segnala(e?.response?.data?.error || 'Non è stato possibile elaborare il file audio. La nota precedente è invariata.');
    } finally { setCaricando(false); }
  };
  const elabora = caricando || stato === 'elaborazione';
  const bloccato = disabled || avviando || elabora;
  return <div className="ml-auto flex flex-wrap gap-2">
    <Button type="button" size="sm" variant={stato === 'registrazione' ? 'destructive' : 'default'} disabled={stato !== 'registrazione' && bloccato} onClick={async () => { if (stato === 'registrazione') return ferma(); setErrore(''); setAvviando(true); try { await avvia(); } finally { setAvviando(false); } }}>
      {avviando || elabora ? <Loader2 className="animate-spin" /> : stato === 'registrazione' ? <Square /> : <Mic />}{stato === 'registrazione' ? `Termina ${tempoVocale(secondi)}` : elabora ? 'Elaborazione…' : 'Registra audio'}
    </Button>
    <Button type="button" size="sm" variant="outline" disabled={bloccato || stato !== 'idle'} onClick={() => input.current?.click()}><Upload /> Carica audio</Button>
    <input ref={input} type="file" accept=".webm,.ogg,.oga,.mp4,.m4a,.mp3,.wav,.mpeg,.mpga,.flac" className="hidden" onChange={carica} />
    {errore && <p role="alert" className="basis-full text-xs text-destructive">{errore}</p>}
  </div>;
}