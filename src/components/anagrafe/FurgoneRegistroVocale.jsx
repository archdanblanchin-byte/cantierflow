import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

/**
 * Registro vocale IA per un furgone: registra audio, trascrive e con l'IA
 * compila i campi del furgone (km, manutenzione, scadenze, ecc.) e crea
 * segnalazioni (nota/problema/avviso) nel registro NotaFurgone.
 */
export default function FurgoneRegistroVocale({ furgone, onFields }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); processAudio(); };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      toast.error("Microfono non disponibile");
    }
  };

  const stop = () => mediaRef.current?.stop();

  const processAudio = async () => {
    setProcessing(true);
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "registro-furgone.webm", { type: "audio/webm" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un assistente per la gestione dei furgoni aziendali. Dalla trascrizione vocale di un operatore estrai in JSON:
- "campi": dati del furgone da aggiornare. Inserisci SOLO i campi menzionati esplicitamente nel formato corretto: "km" (numero), "ultima_manutenzione" (YYYY-MM-DD), "assicurazione_scadenza" (YYYY-MM-DD), "revisione_scadenza" (YYYY-MM-DD), "marca_modello" (stringa), "targa" (stringa), "note" (stringa). Ometti i campi non menzionati.
- "note_aggiuntive": array di segnalazioni da registrare nel registro del furgone, ciascuna { "testo", "tipo" } con tipo in "nota"|"problema"|"avviso". Usa "problema" per guasti/anomalie/spie/freni/motore/gomme/batteria/non parte, "avviso" per scadenze imminenti (assicurazione, revisione, tagliando, km), "nota" per il resto. Una voce per ogni segnalazione distinta.

Trascrizione: """${transcript}"""`,
        response_json_schema: {
          type: "object",
          properties: {
            campi: {
              type: "object",
              properties: {
                km: { type: "number" },
                ultima_manutenzione: { type: "string" },
                assicurazione_scadenza: { type: "string" },
                revisione_scadenza: { type: "string" },
                marca_modello: { type: "string" },
                targa: { type: "string" },
                note: { type: "string" },
              },
            },
            note_aggiuntive: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  testo: { type: "string" },
                  tipo: { type: "string", enum: ["nota", "problema", "avviso"] },
                },
                required: ["testo", "tipo"],
              },
            },
          },
          required: ["campi", "note_aggiuntive"],
        },
      });

      const campi = res?.campi || {};
      const merged = {};
      Object.entries(campi).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") merged[k] = v;
      });
      if (Object.keys(merged).length) onFields?.(merged);

      const noteAgg = Array.isArray(res?.note_aggiuntive) ? res.note_aggiuntive.filter((n) => n.testo) : [];
      for (const n of noteAgg) {
        await base44.entities.NotaFurgone.create({
          furgone_id: furgone.id,
          furgone_nome: furgone.nome,
          testo: n.testo,
          tipo: n.tipo || "nota",
          autore_nome: user?.full_name || "Anonimo",
          autore_email: user?.email || "",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["note-furgone", furgone.id] });
      toast.success(`${Object.keys(merged).length} campi aggiornati · ${noteAgg.length} segnalazioni`);
    } catch (e) {
      toast.error("Errore elaborazione vocale: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Elaborazione vocale…
      </div>
    );
  }
  if (recording) {
    return (
      <Button type="button" variant="destructive" size="sm" className="gap-1.5 w-full" onClick={stop}>
        <Square className="w-3.5 h-3.5" /> Stop — sto registrando
      </Button>
    );
  }
  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5 w-full" onClick={start}>
      <Mic className="w-3.5 h-3.5" /> <Sparkles className="w-3.5 h-3.5 text-primary" /> Parla e compila (AI)
    </Button>
  );
}