import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import DinamicaSelect from "@/components/DinamicaSelect";
import { toast } from "sonner";
import { format } from "date-fns";
import { NotebookPen, Loader2, Check } from "lucide-react";
import RegistraNotaGiornata from "@/components/timbrature/RegistraNotaGiornata";

const ESEMPI = [
"Sono andato a prendere materiale dal fornitore",
"La timbratura iniziale è stata fatta in ritardo, dovrebbe essere per le 7:30"];


// Nota libera della giornata del dipendente: serve a spiegare le anomalie
// (timbri in ritardo, materiale, visite mediche, spostamenti...) prima che
// diventino un problema amministrativo. La vede anche l'amministratore.
export default function NotaGiornataCard({ minutiGiornata }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [testo, setTesto] = useState("");
  const [dinamica, setDinamica] = useState("");
  const [salvando, setSalvando] = useState(false);
  const giornoKey = format(new Date(), "yyyy-MM-dd");
  const dettagli = useRef(null);
  const queryKey = ["nota-giornata", user?.email, giornoKey];

  useEffect(() => {base44.auth.me().then(setUser).catch(() => {});}, []);

  const { data: note = [], isSuccess } = useQuery({
    queryKey,
    queryFn: () => base44.entities.NotaGiornata.filter({ user_email: user.email, data: giornoKey }),
    enabled: !!user
  });

  const esistente = note[0] || null;

  // Carica la nota già salvata una sola volta: non deve sovrascrivere quello
  // che l'utente sta scrivendo.
  const caricataRef = useRef(false);
  useEffect(() => {
    if (!isSuccess || caricataRef.current) return;
    caricataRef.current = true;
    setTesto(note[0]?.testo || "");
    setDinamica(note[0]?.dinamica || "");
  }, [isSuccess, note]);

  const salva = async (contenuto) => {
    setSalvando(true);
    try {
      const payload = { testo: contenuto, dinamica };
      const record = esistente
        ? await base44.entities.NotaGiornata.update(esistente.id, payload)
        : await base44.entities.NotaGiornata.create({ ...payload, data: giornoKey, user_email: user.email, user_nome: user.full_name || "" });
      queryClient.setQueryData(queryKey, [record]);
      queryClient.invalidateQueries({ queryKey: ["note-giornata-admin"] });
      setTesto(contenuto);
      toast.success("Nota della giornata salvata");
    } finally {
      setSalvando(false);
    }
  };

  const salvaAudio = async (aggiunta) => {
    const contenuto = [testo, aggiunta].filter(parte => parte.trim()).join("\n\n");
    setTesto(contenuto);
    if (dettagli.current) dettagli.current.open = true;
    await salva(contenuto);
  };

  if (!user) return null;

  return (
    <Card className="p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <NotebookPen className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Note della giornata</p>
        <RegistraNotaGiornata minutiGiornata={minutiGiornata} onSave={salvaAudio} disabled={salvando || !isSuccess} />
        {esistente && !salvando && esistente.testo === testo && (esistente.dinamica || "") === dinamica &&
        <span role="status" className="flex items-center gap-1 text-[10px] text-emerald-600">
            <Check className="w-3 h-3" /> salvata
          </span>
        }
      </div>
      <details ref={dettagli} className="border-t pt-2">
        <summary className="cursor-pointer text-sm font-medium">Nota scritta</summary>
        <div className="mt-2 space-y-2">
      <Textarea
            rows={2}
            aria-label="Nota della giornata"
            disabled={salvando || !isSuccess}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            className="min-h-[52px] text-base sm:text-sm"
            placeholder="Scrivi la nota della giornata..." />
          
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Esempi</p>
        <ul className="space-y-0.5">
          {ESEMPI.map((e) =>
              <li key={e} className="text-[11px] text-muted-foreground/80 leading-snug">
              · “{e}”
            </li>
              )}
        </ul>
      </div>
      <fieldset disabled={salvando || !isSuccess}>
        <DinamicaSelect value={dinamica} onChange={setDinamica} />
      </fieldset>
      <Button onClick={() => salva(testo).catch(e => toast.error("Errore: " + e.message))} disabled={salvando || !isSuccess} className="w-full gap-2">
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {esistente ? "Aggiorna nota" : "Salva nota"}
      </Button>
        </div>
      </details>
      





      
    </Card>);

}