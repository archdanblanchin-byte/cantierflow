import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Square } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { caricaFotoPrivata } from "@/lib/fotoCantiere";
import RecordingIndicator from "@/components/wizard/RecordingIndicator";

const fmtTempo = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Registra l'audio (storage privato), lo trascrive e lo analizza con la funzione sopralluogo_ai.
// action: "nota" | "lavorazioni". onResult riceve la risposta della funzione.
export default function VoceAI({ action, guida, onResult }) {
  const [fase, setFase] = useState("idle"); // idle | recording | upload | analisi
  const [secondi, setSecondi] = useState(0);
  const [errore, setErrore] = useState("");
  const mrRef = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const elabora = async () => {
    try {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      if (blob.size < 1500) throw new Error("Registrazione vuota: parla più a lungo vicino al microfono.");
      setFase("upload");
      const uri = await caricaFotoPrivata(new File([blob], "registrazione.webm", { type: blob.type }));
      setFase("analisi");
      const res = await base44.functions.invoke("sopralluogo_ai", { action, audio_uri: uri });
      if (res.data?.error) throw new Error(res.data.error);
      onResult(res.data);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "";
      setErrore(msg ? `Elaborazione non riuscita: ${msg}` : "Elaborazione AI non riuscita o non configurata.");
    } finally {
      setFase("idle");
    }
  };

  const avvia = async () => {
    setErrore("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        elabora();
      };
      mr.start();
      setSecondi(0);
      setFase("recording");
      timer.current = setInterval(() => setSecondi((s) => s + 1), 1000);
    } catch {
      setErrore("Microfono non disponibile o permesso negato.");
    }
  };

  const ferma = () => {
    clearInterval(timer.current);
    if (mrRef.current?.state !== "inactive") mrRef.current.stop();
  };

  return (
    <div className="space-y-2">
      {fase === "idle" && (
        <Button type="button" variant="outline" className="w-full gap-2 h-11" onClick={avvia}>
          <Mic className="w-4 h-4" /> Registra audio
        </Button>
      )}
      {fase === "recording" && (
        <Button type="button" variant="destructive" className="w-full gap-3 h-12" onClick={ferma}>
          <Square className="w-4 h-4 fill-current" /> Ferma e analizza
          <RecordingIndicator seconds={secondi} fmt={fmtTempo} />
        </Button>
      )}
      {(fase === "upload" || fase === "analisi") && (
        <Button type="button" variant="outline" disabled className="w-full gap-2 h-11">
          <Loader2 className="w-4 h-4 animate-spin" />
          {fase === "upload" ? "Caricamento audio..." : "Trascrizione e analisi in corso..."}
        </Button>
      )}
      {fase === "idle" && guida && <p className="text-xs text-muted-foreground">{guida}</p>}
      {errore && <p className="text-xs text-destructive">{errore}</p>}
    </div>
  );
}