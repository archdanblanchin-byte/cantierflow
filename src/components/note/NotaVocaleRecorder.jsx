import { useState, useRef } from "react";
import { Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Registra una nota vocale, la trascrive ed estrae UNA O PIÙ note strutturate con l'IA.
 * mode: "personale"  -> solo note personali (personale/promemoria/lista), senza destinatari
 * mode: "comunicazione" -> note destinate ad altri (messaggi/liste con destinatari, problemi furgone, ecc.)
 * onResult(notes[]) -> array di note parsed, aperto nella dialog di revisione.
 */
export default function NotaVocaleRecorder({ mode = "personale", cantieri = [], furgoni = [], colleghi = [], onResult }) {
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
    const oggiStr = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const cantieriStr = cantieri.map((c) => c.nome).filter(Boolean).join(", ") || "(nessuno)";
    const furgoniStr = furgoni.map((f) => f.nome).filter(Boolean).join(", ") || "(nessuno)";
    const collStr = colleghi.map((c) => c.nome).filter(Boolean).join(", ") || "(nessuno)";

    if (mode === "personale") {
      return `Sei un assistente vocale per un'azienda edile. Dal resoconto vocale di un lavoratore, estrai UNA O PIÙ NOTE PERSONALI, visibili SOLO a chi le crea. Non ci sono destinatari: non impostare mai destinatari_nomi.

Tipi possibili:
- "personale": annotazione privata
- "promemoria": cosa da ricordare in una data/ora (compila data_promemoria in formato ISO 8601)
- "lista": elenco di materiale/attrezzi/cose da fare (compila items)

REGOLE:
- DIVIDI in PIÙ note quando l'utente cita cose distinte e separate (es. un promemoria con sveglia + una lista di materiale da caricare). Ogni nota è autonoma e con il suo tipo.
- Se l'utente elenca materiale/attrezzi da caricare o cose da fare, crea una nota "lista" con items.
- Se l'utente chiede un promemoria/sveglia con una data, crea una nota "promemoria" con data_promemoria.
- data_promemoria: se dice "domani", "oggi", "lunedì", "alle 14", "tra 3 giorni", calcola ISO 8601. Oggi è ${oggiStr} (timezone Europe/Rome). Se non dice un'ora, usa le 09:00.
- testo: riassunto breve e chiaro del contenuto/azione.
- priorita: "alta" se "urgente/subito/importante", "bassa" se "quando puoi", altrimenti "media".
- Non inventare dati non detti. Se il resoconto è vuoto o incomprensibile, restituisci un array vuoto.

Cantieri conosciuti (usa cantiere_nome solo se esplicitamente citato): ${cantieriStr}
Furgoni conosciuti (usa furgone_nome solo se esplicitamente citato): ${furgoniStr}

Resoconto vocale:
"""${transcript}"""`;
    }

    return `Sei un assistente vocale per un'azienda edile. Dal resoconto vocale di un lavoratore, estrai UNA O PIÙ NOTE di COMUNICAZIONE destinate ad altre persone (colleghi, magazziniere, responsabile, titolare, amministrazione).

Tipi possibili:
- "messaggio": comunicazione a una o più persone (compila destinatari_nomi). Collega cantiere_nome/furgone_nome se pertinente.
- "promemoria": se è anche un promemoria con data (compila data_promemoria ISO 8601) rivolto a qualcuno (compila anche destinatari_nomi).
- "lista": se è un elenco da inviare a qualcuno (es. materiale da far acquistare al magazziniere): compila items + destinatari_nomi.

REGOLE:
- DIVIDI in PIÙ note quando l'utente si rivolge a persone diverse o argomenti distinti (es. "di' al magazziniere di acquistare il materiale" + "di' a Jacopo di fare i ritocchi in cantiere X"). Una nota per destinatario/argomento.
- destinatari_nomi: nomi dei colleghi/ruoli. Se cita un ruolo generico (magazziniere, titolare, amministrazione, responsabile) senza un nome noto, metti il ruolo testuale (es. "magazziniere", "titolare").
- Se l'utente segnala un problema al furgone ("il furgone non va", "anomalia"), crea un messaggio per il "responsabile" o "amministrazione" e collega furgone_nome.
- cantiere_nome / furgone_nome: scegli dalle liste solo se esplicitamente citati.
- data_promemoria: ISO 8601 se dice una data/ora. Oggi è ${oggiStr} (Europe/Rome). Senza ora usa 09:00.
- testo: spiega CHIARAMENTE cosa deve fare il destinatario (il "cosa" e il "dove"), usando le parole dell'utente. Il destinatario deve capire l'azione richiesta.
- priorita: "alta" se "urgente/subito", "bassa" se "quando puoi", altrimenti "media".
- Non inventare dati non detti. Se il resoconto è vuoto o incomprensibile, restituisci un array vuoto.

Cantieri conosciuti: ${cantieriStr}
Furgoni conosciuti: ${furgoniStr}
Colleghi conosciuti: ${collStr}

Resoconto vocale:
"""${transcript}"""`;
  };

  const schema = () => ({
    type: "object",
    properties: {
      note: {
        type: "array",
        items: {
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
        },
      },
    },
    required: ["note"],
  });

  const reset = () => { clearInterval(timer.current); setStatus("idle"); setSeconds(0); setProcSec(0); };
  const cancel = () => { tokenRef.current++; reset(); toast.info("Elaborazione annullata"); };

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
      const note = Array.isArray(res?.note) ? res.note : [];
      onResult?.(note);
      if (note.length === 0) toast.info("Nessuna nota riconosciuta");
      else toast.success(`${note.length} nota${note.length > 1 ? "e" : ""} riconosciut${note.length > 1 ? "e" : "a"} dall'IA`);
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
            <p className="text-xs text-muted-foreground">Trascrizione ed estrazione note con IA ({fmt(procSec)})</p>
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
      <span className="font-semibold">Registra {mode === "personale" ? "nota personale" : "comunicazione"}</span>
    </Button>
  );
}