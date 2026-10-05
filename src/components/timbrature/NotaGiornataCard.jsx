import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { NotebookPen, Loader2, Check } from "lucide-react";

// Nota libera della giornata del dipendente: serve a spiegare le anomalie
// (timbri in ritardo, materiale, visite mediche, spostamenti...) prima che
// diventino un problema amministrativo. La vede anche l'amministratore.
export default function NotaGiornataCard() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [testo, setTesto] = useState("");
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
  }, [isFetched, note]);

  const salva = async () => {
    setSalvando(true);
    try {
      if (esistente) {
        await base44.entities.NotaGiornata.update(esistente.id, { testo });
      } else {
        await base44.entities.NotaGiornata.create({
          data: giornoKey,
          user_email: user.email,
          user_nome: user.full_name || "",
          testo,
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
        rows={3}
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        className="text-base sm:text-sm"
        placeholder={"Es. Sono andato a prendere materiale · Ho effettuato una visita medica · Ho lavorato in un'altra zona dello stesso cantiere · La timbratura delle 12:30 è stata fatta in ritardo · Sono passato dal capannone a scaricare"}
      />
      <p className="text-[11px] text-muted-foreground">
        Scrivi qui eventuali spiegazioni sulla giornata: la nota resta collegata a questa data ed è visibile all'amministratore.
      </p>
      <Button onClick={salva} disabled={salvando} className="w-full gap-2">
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {esistente ? "Aggiorna nota" : "Salva nota"}
      </Button>
    </Card>
  );
}