import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Registra audio, lo trascrive ed estrae lavorazioni con l'IA.
 * mode: "extra" -> solo lavorazioni extra; "normali" -> solo preventivate.
 * Impara lo stile descrittivo dai rapportini passati dell'utente (few-shot).
 * onResult(items):
 *   extra   -> [{ descrizione }]
 *   normali -> [{ categoria, tipo, descrizione }]
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

  // Impara lo stile dai rapportini passati dell'utente
  const fetchExamples = async () => {
    try {
      const recent = await base44.entities.Rapportino.list("-created_date", 30);
      if (mode === "extra") {
        const ex = [];
        recent.forEach((r) => {
          (r.lavorazioni_extra || []).forEach((e) => {
            if (e.descrizione && e.descrizione.trim().length > 3) ex.push(e.descrizione.trim());
          });
        });
        return [...new Set(ex)].slice(-12);
      }
      const ex = [];
      recent.forEach((r) => {
        (r.lavorazioni_normali || []).forEach((l) => {
          if (l.tipo_lavorazione_nome && l.descrizione && l.descrizione.trim().length > 3) {
            ex.push({ tipo: l.tipo_lavorazione_nome, descrizione: l.descrizione.trim() });
          }
        });
      });
      // dedupe per tipo tenendo l'ultima occorrenza
      const map = new Map();
      ex.forEach((e) => map.set(e.tipo, e));
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
    if (mode === "extra") {
      const list = examples.map((d) => `- "${d}"`).join("\n");
      return `\n\nEsempi di descrizioni extra già usate in passato (segui lo stesso stile concreto, con cosa e dove):\n${list}\n`;
    }
    const list = examples.map((e) => `- Tipo "${e.tipo}" -> descrizione "${e.descrizione}"`).join("\n");
    return `\n\nEsempi di come l'utente descrive le lavorazioni (segui lo stesso stile concreto, con cosa e dove):\n${list}\n`;
  };

  const buildPrompt = (transcript, examples) => {
    const catalog = buildCatalog();
    const examplesBlock = buildExamplesBlock(examples);
    const regole = [
      "NON inserire ore: le inserirà manualmente l'utente.",
      "Ogni voce deve comparire una sola volta, anche se nel resoconto viene citata più volte.",
      "Se il resoconto è vuoto o incomprensibile, restituisci un array vuoto.",
    ];

    if (mode === "extra") {
      return `Sei un assistente per cantieri edili. Dal seguente resoconto vocale del capocantiere, estrai SOLO le lavorazioni EXTRA o concordate NON previste dal preventivo. Per ciascuna scrivi una "descrizione" concreta e precisa che includa COSA è stato fatto e DOVE (es. stanze, facciata, zona), attingendo alle parole dell'utente.

REGOLE:
${regole.join("\n")}${examplesBlock}

Resoconto vocale:
"""${transcript}"""`;
    }

    return `Sei un assistente per cantieri edili. Dal seguente resoconto vocale del capocantiere, estrai SOLO le lavorazioni PREVENTIVATE (previste dal preventivo).
Per ciascuna:
- "categoria" e "tipo": scegli dalla lista seguente. Se un'attività non corrisponde esattamente a un tipo della lista, usa comunque la categoria più vicina e nel campo "tipo" scrivi una descrizione libera precisa.
- "descrizione": una frase concreta con COSA è stato fatto e DOVE (es. stanze, facciata nord, zona), riprendendo le parole dell'utente. Anche quando il tipo è già in catalogo, la descrizione deve riassumere i dettagli dettati (dove/quanto/cosa).

REGOLE:
${regole.join("\n")}

Categorie e tipi disponibili:
${catalog}${examplesBlock}

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
              descrizione: { type: "string" },
            },
            required: ["categoria", "tipo", "descrizione"],
          },
        },
      },
      required: ["lavorazioni_normali"],
    };
  };

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