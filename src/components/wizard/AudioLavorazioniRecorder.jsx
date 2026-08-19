import { useState, useRef } from "react";
import { Mic, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import RecordingIndicator from "./RecordingIndicator";
import DictationGuide from "./DictationGuide";

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
    return `\n\nEsempi di come l'utente descrive le lavorazioni (segui lo stesso stile concreto, con cosa e dove; questi esempi confermano che tinteggiatura/pitturazione/raschiatura sono su PARETI, non su travi in legno):\n${list}\n`;
  };

  const buildPrompt = (transcript, examples) => {
    const catalog = buildCatalog();
    const examplesBlock = buildExamplesBlock(examples);
    const regole = [
      "Estrai anche le ORE quando l'utente le dice nel resoconto (es. '5 ore', 'mezz'ora', 'eravamo in due, abbiamo fatto mezz'ora'). Se non le dice, metti ore 0. L'utente potrà comunque rivederle e modificarle.",
      "Ogni voce deve comparire una sola volta, anche se nel resoconto viene citata più volte.",
      "Se il resoconto è vuoto o incomprensibile, restituisci un array vuoto.",
    ];

    if (mode === "extra") {
      return `Sei un assistente per cantieri edili. Dal seguente resoconto vocale del capocantiere, estrai SOLO le lavorazioni EXTRA o concordate NON previste dal preventivo. Per ciascuna scrivi una "descrizione" concreta e precisa che includa COSA è stato fatto e DOVE (es. stanze, facciata, zona), attingendo alle parole dell'utente. Compila anche le "ore" se l'utente le ha dette nel resoconto.

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

ATTENZIONE AL SUPPORTO/SUPERFICIE (molto importante):
- Termini come "raschiatura", "verniciatura", "tinteggiatura", "pitturazione", "fondo uniformante", "imprimatura" si riferiscono di norma a PARETI, MURI, SOFFITTI o FACCIATE (pittura murali). NON associarli a "travi in legno", "legno", "capriate" o a lavorazioni del legno A MENO CHE l'utente citi esplicitamente travi, legno, capriate, strutture lignee.
- Collega tra loro le lavorazioni coerenti: se l'utente dice "fondo uniformante" e poi "pitturato la parete", tratta tutto come pittura su PARETE (stessa categoria/tipo delle pitture murali), non come intervento su travi in legno.
- Se l'utente parla di "tinte", "vecchia tinta", "vecchia vernice", "vecchia tinteggiatura" da rimuovere, è pittura su pareti/muri, non legno.

ORE E MODALITÀ (compila anche le ore):
- Se l'utente dice le ore totali della lavorazione (es. "abbiamo fatto 5 ore", "ci sono volute 3 ore"), usa modalita_calcolo "manuale" e metti ore_totali = 5 (numero).
- Se l'utente dice quante persone e le ore per persona (es. "eravamo in due e abbiamo fatto mezz'ora ciascuno", "in tre per un'ora a testa"), usa modalita_calcolo "per_persone", metti numero_persone = 2 e ore_per_persona = 0.5, e calcola ore_totali = numero_persone * ore_per_persona (es. 1.0).
- Se l'utente non specifica le ore, metti ore_totali = 0 e modalita_calcolo "manuale".
- Converti in ore decimali: mezz'ora = 0.5, un quarto d'ora = 0.25, tre quarti = 0.75, un'ora e mezza = 1.5.

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
              properties: {
                descrizione: { type: "string" },
                ore: { type: "number" },
              },
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
              modalita_calcolo: { type: "string", enum: ["manuale", "per_persone"] },
              ore_totali: { type: "number" },
              numero_persone: { type: "number" },
              ore_per_persona: { type: "number" },
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

  const label = mode === "extra" ? "Registra e compila lavorazioni extra con IA" : "Registra e compila lavorazioni preventivate con IA";

  if (status === "processing") {
    return (
      <Button disabled variant="outline" size="sm" className="gap-2 w-full justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Elaborazione audio in corso...
      </Button>
    );
  }

  if (status === "recording") {
    return (
      <div className="w-full space-y-1">
        <Button variant="destructive" size="sm" className="gap-3 w-full justify-center h-12" onClick={stopRecording}>
          <Square className="w-4 h-4 fill-current" />
          <span className="font-bold uppercase tracking-wide">Ferma registrazione</span>
          <RecordingIndicator seconds={seconds} fmt={fmt} />
        </Button>
        <p className="text-center text-xs text-muted-foreground">Tocca per fermare e avviare l'elaborazione IA</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Button variant="outline" size="sm" className="gap-2 w-full justify-center h-11" onClick={startRecording}>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <span className="font-semibold">Inizia registrazione</span>
      </Button>
      <p className="text-center text-xs text-muted-foreground mt-1">{label}</p>
      <DictationGuide mode={mode} />
    </div>
  );
}