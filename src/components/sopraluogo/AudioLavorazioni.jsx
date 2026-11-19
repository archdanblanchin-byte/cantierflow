import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Trash2, CheckCircle2, RefreshCw, ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Trascrizione e analisi AI passano dalla funzione backend 'sopraluogoAI'
// (le integrazioni AI/audio dell'app non si chiamano direttamente dal browser).
// Il prompt dell'elenco lavorazioni è nella funzione: azione 'elenco_lavorazioni'.
const chiamaAI = async (payload) => {
  const res = await base44.functions.invoke('sopraluogoAI', payload);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data.testo;
};

function WaveAnimation() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {[1,2,3,4,5,6,7,8,9,10,11,12].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-blue-500"
          style={{
            animation: `wave2 1.2s ease-in-out infinite`,
            animationDelay: `${(i * 0.1) % 1.2}s`,
            height: '100%',
          }}
        />
      ))}
      <style>{`
        @keyframes wave2 {
          0%, 100% { transform: scaleY(0.15); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const DEFAULT_PUNTI_LAVORI = [
  { emoji: '🔨', label: 'Protezioni', hint: 'proteggere pavimenti, mobili, infissi' },
  { emoji: '🪚', label: 'Preparazione', hint: 'rasature, stuccature, carteggiatura' },
  { emoji: '🎨', label: 'Fondo', hint: 'fissativo, primer, antimuffa' },
  { emoji: '🖌️', label: 'Pittura', hint: 'tipo pittura, numero mani, finiture' },
  { emoji: '🚪', label: 'Smalti', hint: 'porte, finestre, radiatori' },
  { emoji: '🧹', label: 'Pulizia finale', hint: 'rimozione protezioni, pulizia locali' },
];

export default function AudioLavorazioni({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [puntiLavori, setPuntiLavori] = useState(DEFAULT_PUNTI_LAVORI);
  const [puntiAperti, setPuntiAperti] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    base44.entities.ImpostazioneApp.filter({ chiave: 'punti_lavori_sopraluogo' }).then(records => {
      if (records.length > 0) {
        try { setPuntiLavori(JSON.parse(records[0].valore)); } catch {}
      }
    });
    return () => { stopTimer(); releaseWakeLock(); };
  }, []);

  const startTimer = () => {
    setTimer(0);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const fmtTimer = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Wake Lock: mantiene lo schermo acceso durante la registrazione
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (e) {
      // Wake lock non disponibile o negato — ignora
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // Riacquisisci il wake lock quando la pagina torna visibile
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && recording) {
        acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [recording]);

  const startRecording = async () => {
    setError('');
    chunksRef.current = [];
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError('Impossibile accedere al microfono. Controlla i permessi.');
      return;
    }
    streamRef.current = stream;
    // Previeni lo spegnimento dello schermo durante la registrazione
    acquireWakeLock();
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    // Se il sistema interrompe la traccia audio (schermo spento / sospensione OS),
    // salva automaticamente ciò che è stato registrato fino a quel momento
    stream.getAudioTracks().forEach(track => {
      track.onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      };
    });
    mr.start(500);
    setRecording(true);
    startTimer();
  };

  const stopRecording = () => {
    stopTimer();
    setRecording(false);
    releaseWakeLock();
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.onstop = async () => {
      mr.stream.getTracks().forEach(t => t.stop());
      const mimeType = mr.mimeType || 'audio/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size < 1000) {
        setError('Registrazione troppo breve o vuota. Riprova.');
        return;
      }
      setProcessing(true);
      try {
        setProcessingStep('Caricamento audio…');
        const file = new File([blob], `lavorazioni.${ext}`, { type: mimeType });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setProcessingStep('Trascrizione audio con AI…');
        const transcript = await chiamaAI({ action: 'trascrivi', audio_url: file_url });
        if (!transcript || transcript.trim().length < 5) {
          setError('Nessun testo rilevato. Riprova parlando più chiaramente.');
          setProcessing(false);
          return;
        }
        setProcessingStep('Generazione elenco lavorazioni…');
        const elenco = await chiamaAI({ action: 'elenco_lavorazioni', trascrizione: transcript });
        onChange((value ? value + '\n\n---\n\n' : '') + `📋 TRASCRIZIONE\n${transcript}\n\n${elenco}`);
      } catch (e) {
        setError('Errore: ' + (e.message || 'Riprova'));
      }
      setProcessing(false);
      setProcessingStep('');
    };
    mr.stop();
  };

  const reanalyze = async () => {
    if (!value) return;
    const match = value.match(/📋 TRASCRIZIONE\n([\s\S]*?)(?:\n\n|$)/);
    if (!match) return;
    const transcript = match[1].trim();
    setProcessing(true);
    setProcessingStep('Ri-generazione elenco…');
    setError('');
    try {
      const elenco = await chiamaAI({ action: 'elenco_lavorazioni', trascrizione: transcript });
      onChange(`📋 TRASCRIZIONE\n${transcript}\n\n${elenco}`);
    } catch (e) {
      setError('Errore: ' + (e.message || 'Riprova'));
    }
    setProcessing(false);
    setProcessingStep('');
  };

  return (
    <div className="space-y-3">
      {/* Info box con punti guida collassabile */}
      <div className="border border-blue-200 bg-blue-50 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setPuntiAperti(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-blue-800 hover:bg-blue-100 transition-colors"
        >
          <span className="text-xs">🎙️ <strong>Come funziona:</strong> Descrivi a voce tutte le lavorazioni da fare, dall'inizio alla fine.</span>
          {puntiAperti ? <ChevronUp className="w-4 h-4 flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />}
        </button>
        {puntiAperti && (
          <div className="px-4 pb-3 grid grid-cols-2 gap-1.5 border-t border-blue-100">
            {puntiLavori.map((p) => (
              <div key={p.label} className="flex items-start gap-1.5 text-xs text-blue-900 pt-1.5">
                <span className="text-base leading-none">{p.emoji}</span>
                <div>
                  <span className="font-semibold">{p.label}</span>
                  {p.hint && <span className="text-blue-600"> — {p.hint}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controlli */}
      <div className="flex items-center gap-2 flex-wrap">
        {!recording && !processing && (
          <Button type="button" onClick={startRecording} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Mic className="w-4 h-4" />
            Registra lavorazioni
          </Button>
        )}
        {recording && (
          <Button type="button" variant="destructive" onClick={stopRecording} className="gap-2">
            <Square className="w-4 h-4" />
            Ferma — {fmtTimer(timer)}
          </Button>
        )}
        {processing && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            {processingStep || 'Elaborazione…'}
          </div>
        )}
        {value && !recording && !processing && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={reanalyze} className="gap-1.5 text-xs">
              <RefreshCw className="w-3 h-3" />
              Ri-genera
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')} className="text-destructive hover:text-destructive text-xs gap-1.5">
              <Trash2 className="w-3 h-3" />
              Elimina
            </Button>
          </>
        )}
      </div>

      {/* UI Registrazione */}
      {recording && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-semibold text-blue-600 tracking-wide">REC {fmtTimer(timer)}</span>
            </div>
            <span className="text-xs text-blue-400">Descrivi le lavorazioni in ordine</span>
          </div>
          <WaveAnimation />
          <div className="bg-white/60 rounded-lg px-3 py-2 grid grid-cols-2 gap-1">
            {puntiLavori.map((p) => (
              <div key={p.label} className="flex items-center gap-1.5 text-xs text-blue-800">
                <span>{p.emoji}</span>
                <span className="font-medium">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}

      {/* Risultato */}
      {value && !recording && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Elenco lavorazioni generato</span>
          </div>
          <div className="whitespace-pre-wrap text-blue-900 text-xs leading-relaxed max-h-72 overflow-y-auto">
            {value.replace(/📋 TRASCRIZIONE\n[\s\S]*?\n\n/, '')}
          </div>
        </div>
      )}
    </div>
  );
}