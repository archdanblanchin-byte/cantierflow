import { useState, useRef } from "react";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import RecordingIndicator from "./RecordingIndicator";
import DictationGuide from "./DictationGuide";

/**
 * Registra audio, lo trascrive ed estrae i materiali con l'IA.
 * Impara lo stile descrittivo dai rapportini passati dell'utente (few-shot).
 * onResult(items) -> [{ nome, quantita, unita_misura, descrizione }]
 */
export default function AudioMaterialiRecorder({ materialiBase = [], onResult }) {
  const [status, setStatus] = useState("idle"); // idle | recording | processing
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const buildCatalog = () => {
    if (!materialiBase.length) return "(nessun materiale in catalogo)";
    return materialiBase.map((m) => `- ${m.nome} (unita: ${m.unita_misura || "n.d."})`).join("\n");
  };

  // Impara lo stile dai rapportini passati dell'utente
  const fetchExamples = async () => {
    try {
      const recent = await base44.entities.Rapportino.list("-created_date", 30);
      const ex = [];
      recent.forEach((r) => {
        (r.materiali || []).forEach((m) => {
          if (m.nome && m.descrizione && m.descrizione.trim().length > 3) {
            ex.push({ nome: m.nome, descrizione: m.descrizione.trim() });
          }
        });
      });
      const map = new Map();
      ex.forEach((e) => map.set(e.nome, e));
      return [...map.values()].slice(-12);
    } catch {
      return [];
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        processRecording();
      };
      mr.start();
      setStatus("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      toast.error("Microfono non disponibile o permesso negato");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
  };

  const buildExamplesBlock = (examples) => {
    if (!examples || examples.length === 0) return "";
    const list = examples.map((e) => `- "${e.nome}" -> "${e.descrizione}"`).join("\n");
    return `\n\nEsempi di come l'utente descrive i materiali (segui lo stesso stile concreto, con specifiche e dove e stato preso):\n${list}\n`;
  };

  const buildPrompt = (transcript, examples) => {
    const catalog = buildCatalog();
    const examplesBlock = buildExamplesBlock(examples);
    return `Sei un assistente per cantieri edili. Dal seguente resoconto vocale del capocantiere, estrai TUTTI i materiali utilizzati o ritirati durante la giornata.
Per ciascun materiale:
- "nome": il nome del materiale (es. "Malta", "Pittura", "Sabbia"). Se corrisponde a un materiale del catalogo, usa quel nome esatto.
- "quantita": il numero estratto dal resoconto (es. 5 per "cinque sacchi"). Se non viene detta una quantita, metti 0.
- "unita_misura": l'unita di misura (es. "sacchi", "bidoni", "kg", "m", "pz"). Se corrisponde a un materiale del catalogo, usa la sua unita.
- "descrizione": una nota concreta con le specifiche del prodotto e DOVE e stato preso (es. "ritirati al capannone", "presi dal fornitore X", "pittura bianca opaca per le pareti della stanza sud"). Riprendi le parole dell'utente.

REGOLE:
- Ogni materiale deve comparire una sola volta, anche se citato piu volte.
- Se il resoconto e vuoto o incomprensibile, restituisci un array vuoto.

Materiale disponibile in catalogo:
${catalog}${examplesBlock}

Resoconto vocale:
"""${transcript}"""`;
  };

  const buildSchema = () => ({
    type: "object",
    properties: {
      materiali: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            quantita: { type: "number" },
            unita_misura: { type: "string" },
            descrizione: { type: "string" },
          },
          required: ["nome"],
        },
      },
    },
    required: ["materiali"],
  });

  const processRecording = async () => {
    setStatus("processing");
    try {
      const [examples] = await Promise.all([fetchExamples()]);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "registrazione.webm", { type: blob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(transcript, examples),
        response_json_schema: buildSchema(),
      });

      const items = (res.materiali || []).map((m) => ({
        nome: m.nome || "",
        quantita: m.quantita || 0,
        unita_misura: m.unita_misura || "",
        descrizione: m.descrizione || "",
      }));
      onResult?.(items);
      toast.success(`${items.length} materiali riconosciuti dall'IA`);
    } catch (err) {
      toast.error("Errore nell'elaborazione dell'audio");
    } finally {
      setStatus("idle");
      setSeconds(0);
    }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (status === "processing") {
    return (
      <Button disabled variant="outline" size="sm" className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Elaboro l'audio...
      </Button>
    );
  }

  if (status === "recording") {
    return (
      <Button variant="destructive" size="sm" className="gap-2 w-full justify-center" onClick={stopRecording}>
        <RecordingIndicator seconds={seconds} fmt={fmt} />
      </Button>
    );
  }

  return (
    <div className="w-full">
      <Button variant="outline" size="sm" className="gap-2 w-full" onClick={startRecording}>
        <Mic className="w-4 h-4" />
        Registra materiali con IA
      </Button>
      <DictationGuide mode="materiali" />
    </div>
  );
}