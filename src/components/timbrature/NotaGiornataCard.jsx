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

const ESEMPI = [
  "Sono andato a prendere materiale dal fornitore",
  "La timbratura iniziale è stata fatta in ritardo, dovrebbe essere per le 7:30",
];

// Nota libera della giornata del dipendente: serve a spiegare le anomalie
// (timbri in ritardo, materiale, visite mediche, spostamenti...) prima che
// diventino un problema amministrativo. La vede anche l'amministratore.
export default function NotaGiornataCard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [testo, setTesto] = useState("");
  const [dinamica, setDinamica] = useState("");
  const [salvando, setSalvando] = useState(false);
  const giornoKey = format(new Date(), "yyyy-MM-dd");

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: note = [], isFetched } = useQuery({
    queryKey: ["nota-giornata", user?.email, giornoKey],
    queryFn: () => base44.entities.NotaGiornata.filter({ user_email: user.email, data: giornoKey }),
    enabled: !!user,
  });

  const esistente = note[0] || null;

  // Carica la nota già salvata una sola volta: non deve sovrascrivere quello
  // che l'utente sta scrivendo.
  const caricataRef = useRef(false);
  useEffect(() => {
    if (!isFetched || caricataRef.current) return;
    caricataRef.current = true;
    setTesto(note[0]?.testo || "");
    setDinamica(note[0]?.dinamica || "");
  }, [isFetched, note]);

  const salva = async () => {
    setSalvando(true);
    try {
      if (esistente) {
        await base44.entities.NotaGiornata.update(esistente.id, { testo, dinamica });
      } else {
        await base44.entities.NotaGiornata.create({
          data: giornoKey,
          user_email: user.email,
          user_nome: user.full_name || "",
          testo,
          dinamica,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["nota-giornata"] });
      toast.success("Nota della giornata salvata");
    } catch (e) {
      toast.error("Errore: " + e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <NotebookPen className="w-4 h-4 text-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Note della giornata</p>
        {esistente && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600">
            <Check className="w-3 h-3" /> salvata
          </span>
        )}
      </div>
      <Textarea
        rows={2}
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        className="min-h-[52px] text-base sm:text-sm"
        placeholder="Scrivi la nota della giornata..."
      />
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">Esempi</p>
        <ul className="space-y-0.5">
          {ESEMPI.map((e) => (
            <li key={e} className="text-[11px] text-muted-foreground/80 leading-snug">
              · “{e}”
            </li>
          ))}
        </ul>
      </div>
      <DinamicaSelect value={dinamica} onChange={setDinamica} />
      <Button onClick={salva} disabled={salvando} className="w-full gap-2">
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {esistente ? "Aggiorna nota" : "Salva nota"}
      </Button>
    </Card>
  );
}