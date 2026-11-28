import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Registrazione vocale: parte subito al tocco, mostra il tempo, carica l'audio
// in privato e restituisce un URL firmato al termine (usato per la trascrizione).
export default function useRegistrazione({ onAudio, onErrore, filePrivato = false }) {
  const [stato, setStato] = useState('idle'); // idle | registrazione | elaborazione
  const [secondi, setSecondi] = useState(0);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const wakeRef = useRef(null);

  const fermaTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const rilasciaWake = () => {
    try {
      wakeRef.current?.release();
    } catch (e) {
      // ignora
    }
    wakeRef.current = null;
  };

  useEffect(() => () => {
    fermaTimer();
    rilasciaWake();
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = null;
      rec.stop();
      rec.stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const avvia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) =>
          MediaRecorder.isTypeSupported(t)
        ) || '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        fermaTimer();
        stream.getTracks().forEach((t) => t.stop());
        rilasciaWake();
        const tipo = rec.mimeType || 'audio/webm';
        const ext = tipo.includes('mp4') ? 'mp4' : tipo.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type: tipo });
        if (blob.size < 1000) {
          setStato('idle');
          onErrore?.('Registrazione troppo breve. Riprova parlando qualche secondo.');
          return;
        }
        setStato('elaborazione');
        try {
          const file = new File([blob], `vocale.${ext}`, { type: tipo });
          const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
          if (filePrivato) await onAudio(file_uri);
          else {
            const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 1800 });
            await onAudio(signed_url);
          }
        } catch (e) {
          onErrore?.(filePrivato && e?.response?.data?.error || 'Non sono riuscito a usare la registrazione. Riprova.');
        }
        setStato('idle');
      };
      stream.getAudioTracks().forEach((t) => {
        t.onended = () => {
          if (rec.state === 'recording') rec.stop();
        };
      });
      try {
        if ('wakeLock' in navigator) wakeRef.current = await navigator.wakeLock.request('screen');
      } catch (e) {
        // wake lock non disponibile — ignora
      }
      rec.start(500);
      recRef.current = rec;
      setSecondi(0);
      timerRef.current = setInterval(() => setSecondi((s) => s + 1), 1000);
      setStato('registrazione');
    } catch (e) {
      onErrore?.('Microfono non disponibile: controlla i permessi del browser.');
    }
  }, [onAudio, onErrore, filePrivato]);

  const ferma = useCallback(() => {
    fermaTimer();
    const rec = recRef.current;
    recRef.current = null;
    if (rec && rec.state === 'recording') {
      setStato('elaborazione');
      rec.stop();
    } else {
      setStato('idle');
    }
  }, []);

  return { stato, secondi, avvia, ferma };
}

export const tempoVocale = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;