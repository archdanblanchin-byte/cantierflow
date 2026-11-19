import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Trash2, CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DEFAULT_PUNTI_GUIDA = [
  { emoji: '👤', label: 'Cliente', hint: 'tipo cliente, aspettative, gusti/colori, budget percepito' },
  { emoji: '🏗️', label: 'Cantiere', hint: 'accesso, parcheggio, ascensore, presenza mobili/persone' },
  { emoji: '🦺', label: 'Sicurezza', hint: 'scala, trabattello, ponteggio, piattaforma aerea' },
  { emoji: '🧱', label: 'Superfici', hint: 'muffa, umidità, crepe, distacchi, infiltrazioni' },
  { emoji: '🔧', label: 'Lavori', hint: 'rasature, carteggiatura, fondo, pittura, smalti' },
  { emoji: '🪣', label: 'Prodotti', hint: 'tipo pittura, ciclo corretto, colori e finiture' },
  { emoji: '📅', label: 'Organizzazione', hint: 'MQ, operatori, tempistiche, tempi asciugatura' },
  { emoji: '🤝', label: 'Accordi', hint: 'incluso/escluso, pagamento, date concordate' },
];

// Trascrizione e analisi AI passano dalla funzione backend 'sopraluogoAI'
// (le integrazioni AI/audio dell'app non si chiamano direttamente dal browser).
// Il prompt di analisi è nella funzione: azione 'analizza_nota'.
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
          className="w-[3px] rounded-full bg-red-500"
          style={{
            animation: `wave 1.2s ease-in-out infinite`,
            animationDelay: `${(i * 0.1) % 1.2}s`,
            height: '100%',
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.15); opacity: 0.5; }
          50% { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function AudioNote({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const [puntiAperti, setPuntiAperti] = useState(false);
  const [puntiGuida, setPuntiGuida] = useState(DEFAULT_PUNTI_GUIDA);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const wakeLockRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    base44.entities.ImpostazioneApp.filter({ chiave: 'punti_analisi_sopraluogo' }).then(records => {
      if (records.length > 0) {
        try { setPuntiGuida(JSON.parse(records[0].valore)); } catch {}
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
  // (i wake lock vengono rilasciati automaticamente quando la pagina diventa invisibile)
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
    // Scegli il formato più compatibile
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
      // Ferma il microfono
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
        // 1. Upload audio
        setProcessingStep('Caricamento audio…');
        const file = new File([blob], `nota.${ext}`, { type: mimeType });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        // 2. Trascrizione AI (Whisper)
        setProcessingStep('Trascrizione audio con AI…');
        const transcript = await chiamaAI({ action: 'trascrivi', audio_url: file_url });
        if (!transcript || transcript.trim().length < 5) {
          setError('Nessun testo rilevato. Riprova parlando più chiaramente.');
          setProcessing(false);
          return;
        }
        // 3. Analisi AI
        setProcessingStep('Analisi e report con AI…');
        const analyzed = await chiamaAI({ action: 'analizza_nota', trascrizione: transcript });
        onChange((value ? value + '\n\n---\n\n' : '') + `📋 TRASCRIZIONE\n${transcript}\n\n${analyzed}`);
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
    setProcessingStep('Ri-analisi con AI…');
    setError('');
    try {
      const analyzed = await chiamaAI({ action: 'analizza_nota', trascrizione: transcript });
      onChange(`📋 TRASCRIZIONE\n${transcript}\n\n${analyzed}`);
    } catch (e) {
      setError('Errore rianalisi AI: ' + (e.message || 'Riprova'));
    }
    setProcessing(false);
    setProcessingStep('');
  };

  return (
    <div className="space-y-3">
      {/* Lista punti guida — sempre visibile (collassabile) */}
      <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setPuntiAperti(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <span className="text-xs font-semibold">📋 Punti da trattare nella registrazione</span>
          {puntiAperti ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {puntiAperti && (
          <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {puntiGuida.map((p) => (
              <div key={p.label} className="flex items-start gap-2 text-xs text-amber-900">
                <span className="text-base leading-none">{p.emoji}</span>
                <div>
                  <span className="font-semibold">{p.label}</span>
                  <span className="text-amber-700"> — {p.hint}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controlli */}
      <div className="flex items-center gap-2 flex-wrap">
        {!recording && !processing && (
          <Button type="button" onClick={startRecording} className="gap-2 bg-primary hover:bg-primary/90">
            <Mic className="w-4 h-4" />
            Registra nota
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
              Ri-analizza
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-600 tracking-wide">REC {fmtTimer(timer)}</span>
            </div>
            <span className="text-xs text-red-400">Parla chiaramente vicino al microfono</span>
          </div>
          <WaveAnimation />
          {/* Punti guida durante la registrazione */}
          <div className="bg-white/60 rounded-lg px-3 py-2 grid grid-cols-2 gap-1">
            {puntiGuida.map((p) => (
              <div key={p.label} className="flex items-center gap-1.5 text-xs text-red-800">
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
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700">Nota analizzata</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-green-600 underline underline-offset-2"
            >
              {showRaw ? 'Mostra analisi' : 'Mostra trascrizione raw'}
            </button>
          </div>
          <div className="whitespace-pre-wrap text-green-900 text-xs leading-relaxed max-h-64 overflow-y-auto">
            {showRaw
              ? (value.match(/📋 TRASCRIZIONE\n([\s\S]*?)(?:\n\n|$)/)?.[1] || value)
              : value.replace(/📋 TRASCRIZIONE\n[\s\S]*?\n\n/, '')
            }
          </div>
        </div>
      )}
    </div>
  );
}