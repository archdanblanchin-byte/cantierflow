import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Registra audio, lo trascrive ed estrae lavorazioni con l'IA.
 * mode: "extra" -> solo lavorazioni extra; "normali" -> solo preventivate.
 * onResult(items) con items = [{ descrizione }] per extra,
 * oppure [{ categoria, tipo }] per normali.
 */
export default function AudioLavorazioniRecorder({ tipiLavorazione = [], mode = "normali", onResult }) {
  const [status, setStatus] = useState("idle"); // idle | recording | processing
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const buildCatalog = () => {
    const byCat = {};
    tipiLavorazione.forEach((t) => {
      const c = t.categoria || "Altro";
      (byCat[c] = byCat[c] || []).push(t.nome);
    });
    return Object.entries(byCat)
      .map(([cat, tipi]) => `- ${cat}: ${tipi.join(", ")}`)
      .join("\n");
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

  const buildPrompt = (transcript) => {
    const catalog = buildCatalog();
    const regole = [
      "NON inserire ore: le inserirà manualmente l'utente.",
      "Ogni voce deve comparire una sola volta, anche se nel resoconto viene citata più volte.",
      "Se il resoconto è vuoto o incomprensibile, restituisci un array vuoto.",
    ];

    if (mode === "extra") {
      return `Sei un assistente per cantieri edili. Dal seguente resoconto vocale del capocantiere, estrai SOLO le lavorazioni EXTRA o concordate NON previste dal preventivo (per ciascuna basta una descrizione sintetica ma chiara).

REGOLE:
${regole.join("\n")}

Resoconto vocale:
"""${transcript}"""`;
    }

    return `Sei un assistente per cantieri edili. Dal seguente resoconto vocale del capocantiere, estrai SOLO le lavorazioni PREVENTIVATE (previste dal preventivo). Per ciascuna scegli una "categoria" e un "tipo" dalla lista seguente. Se un'attività non corrisponde esattamente a un tipo della lista, usa comunque la categoria più vicina e nel campo "tipo" scrivi una descrizione libera precisa.

REGOLE:
${regole.join("\n")}

Categorie e tipi disponibili:
${catalog}

Resoconto vocale:
"""${transcript}"""`;
  };

  const buildSchema = () => {
    if (mode === "extra") {
      return {
        type: "object",
        properties: {
          lavorazioni_extra: {
            type: "array",
            items: {
              type: "object",
              properties: { descrizione: { type: "string" } },
              required: ["descrizione"],
            },
          },
        },
        required: ["lavorazioni_extra"],
      };
    }
    return {
      type: "object",
      properties: {
        lavorazioni_normali: {
          type: "array",
          items: {
            type: "object",
            properties: {
              categoria: { type: "string" },
              tipo: { type: "string" },
            },
            required: ["categoria", "tipo"],
          },
        },
      },
      required: ["lavorazioni_normali"],
    };
  };

  const processRecording = async () => {
    setStatus("processing");
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "registrazione.webm", { type: blob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(transcript),
        response_json_schema: buildSchema(),
      });

      const items = mode === "extra" ? res.lavorazioni_extra || [] : res.lavorazioni_normali || [];
      onResult?.(items);
      toast.success(`${items.length} voci riconosciute dall'IA`);
    } catch (err) {
      toast.error("Errore nell'elaborazione dell'audio");
    } finally {
      setStatus("idle");
      setSeconds(0);
    }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const label = mode === "extra" ? "Registra lavorazioni extra con IA" : "Registra lavorazioni preventivate con IA";

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
      <Button variant="destructive" size="sm" className="gap-2" onClick={stopRecording}>
        <Square className="w-3.5 h-3.5 fill-current" />
        Registrazione {fmt(seconds)} — ferma
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={startRecording}>
      <Mic className="w-4 h-4" />
      {label}
    </Button>
  );
}