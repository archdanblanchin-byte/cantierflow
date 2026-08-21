import { useState, useRef } from "react";
import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Registra una nota vocale, la trascrive ed estrae una nota strutturata con l'IA
 * (tipo, testo, lista, collegamenti a cantiere/furgone, destinatari, data promemoria).
 * onResult(parsed) apre il form di revisione.
 */
export default function NotaVocaleRecorder({ cantieri = [], furgoni = [], colleghi = [], onResult }) {
  const [status, setStatus] = useState("idle"); // idle | recording | processing
  const [seconds, setSeconds] = useState(0);
  const [procSec, setProcSec] = useState(0);
  const mrRef = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const tokenRef = useRef(0);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      chunks.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); process(); };
      mr.start();
      setStatus("recording");
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microfono non disponibile o permesso negato");
    }
  };

  const stop = () => {
    if (mrRef.current && mrRef.current.state !== "inactive") mrRef.current.stop();
    clearInterval(timer.current);
  };

  const buildPrompt = (transcript) => {
    const oggi = new Date();
    const oggiStr = oggi.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const cantieriStr = cantieri.map((c) => c.nome).filter(Boolean).join(", ") || "(nessuno)";
    const furgoniStr = furgoni.map((f) => f.nome).filter(Boolean).join(", ") || "(nessuno)";
    const collStr = colleghi.map((c) => c.nome).filter(Boolean).join(", ") || "(nessuno)";
    return `Sei un assistente vocale per un'azienda edile. Dal resoconto vocale di un lavoratore, estrai una NOTA strutturata.

Tipi possibili:
- "personale": annotazione privata per sé (nessun destinatario)
- "promemoria": cosa da ricordare in una data/ora (compila data_promemoria in formato ISO 8601)
- "lista": elenco di materiale/attrezzi/cose da fare (compila items)
- "messaggio": comunicazione rivolta a un collega o ruolo (compila destinatari_nomi)

Riconosci i riferimenti:
- cantiere_nome: se cita un cantiere, scegli il nome più vicino dalla lista cantieri
- furgone_nome: se cita un furgone, scegli dalla lista furgoni
- destinatari_nomi: se la nota è per qualcuno (es. "di' a Federico", "ricorda a Federico", "avvisa il magazziniere/titolare/amministrazione"), metti i nomi. Se cita un ruolo generico senza nome noto, metti il ruolo testuale (es. "magazziniere", "titolare").
- data_promemoria: se dice "domani", "oggi", "lunedì", "alle 14", "tra 3 giorni", calcola data/ora in ISO 8601. Oggi è ${oggiStr} (timezone Europe/Rome). Se non dice un'ora, usa le 09:00.
- items: elenca materiale/attrezzi/cose da fare come array di oggetti {text}
- testo: riassunto breve e chiaro del contenuto/azione
- priorita: "alta" se "urgente/subito/importante", "bassa" se "quando puoi", altrimenti "media"

REGOLE:
- Se non c'è un destinatario esplicito, il tipo è "personale" o "promemoria" e destinatari_nomi è vuoto.
- Non inventare dati non detti.
- Se il resoconto è vuoto o incomprensibile, metti testo vuoto e tipo "personale".

Cantieri conosciuti: ${cantieriStr}
Furgoni conosciuti: ${furgoniStr}
Colleghi conosciuti: ${collStr}

Resoconto vocale:
"""${transcript}"""`;
  };

  const schema = () => ({
    type: "object",
    properties: {
      tipo: { type: "string", enum: ["personale", "promemoria", "lista", "messaggio"] },
      testo: { type: "string" },
      items: {
        type: "array",
        items: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
      },
      cantiere_nome: { type: "string" },
      furgone_nome: { type: "string" },
      destinatari_nomi: { type: "array", items: { type: "string" } },
      data_promemoria: { type: "string" },
      priorita: { type: "string", enum: ["bassa", "media", "alta"] },
    },
    required: ["tipo", "testo"],
  });

  const reset = () => {
    clearInterval(timer.current);
    setStatus("idle");
    setSeconds(0);
    setProcSec(0);
  };

  const cancel = () => {
    tokenRef.current++;
    reset();
    toast.info("Elaborazione annullata");
  };

  const process = async () => {
    setStatus("processing");
    setProcSec(0);
    clearInterval(timer.current);
    timer.current = setInterval(() => setProcSec((s) => s + 1), 1000);
    const token = ++tokenRef.current;
    try {
      const res = await Promise.race([
        (async () => {
          const blob = new Blob(chunks.current, { type: "audio/webm" });
          const file = new File([blob], "nota.webm", { type: blob.type });
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
          return base44.integrations.Core.InvokeLLM({
            prompt: buildPrompt(transcript),
            response_json_schema: schema(),
          });
        })(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 90000)),
      ]);
      if (token !== tokenRef.current) return;
      onResult?.({ ...res, _vocale: true });
      toast.success("Nota riconosciuta dall'IA");
    } catch (e) {
      if (token !== tokenRef.current) return;
      toast.error(e?.message === "timeout" ? "Elaborazione troppo lunga, riprova" : "Errore nell'elaborazione dell'audio");
    } finally {
      if (token === tokenRef.current) reset();
    }
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (status === "processing") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Elaborazione audio in corso…</p>
            <p className="text-xs text-muted-foreground">Trascrizione ed estrazione nota con IA ({fmt(procSec)})</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full" onClick={cancel}>Annulla</Button>
      </div>
    );
  }

  if (status === "recording") {
    return (
      <div className="space-y-1">
        <Button variant="destructive" size="sm" className="gap-3 w-full justify-center h-12" onClick={stop}>
          <Square className="w-4 h-4 fill-current" />
          <span className="font-bold uppercase tracking-wide">Ferma registrazione</span>
          <span className="font-mono text-sm">{fmt(seconds)}</span>
        </Button>
        <p className="text-center text-xs text-muted-foreground">Tocca per fermare e avviare l'elaborazione IA</p>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" className="gap-2 w-full justify-center h-11" onClick={start}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <span className="font-semibold">Registra nota vocale</span>
    </Button>
  );
}