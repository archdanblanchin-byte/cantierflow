import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Check, Trash2, MessageSquare } from "lucide-react";

const TIPO_LABEL = { problema: "Problema", richiesta: "Richiesta", osservazione: "Osservazione" };
const TIPO_COLOR = {
  problema: "bg-red-100 text-red-800",
  richiesta: "bg-blue-100 text-blue-800",
  osservazione: "bg-slate-100 text-slate-800",
};

export default function SegnalazioniListDialog({ documento, onOpenChange }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: segnalazioni = [], isLoading } = useQuery({
    queryKey: ["segnalazioni", documento?.id],
    queryFn: () => base44.entities.SegnalazioneDocumento.filter({ documento_id: documento.id }, "-created_date"),
    enabled: !!documento?.id,
  });

  const risolvi = async (s) => {
    try {
      await base44.entities.SegnalazioneDocumento.update(s.id, { risolta: !s.risolta, risolta_da_nome: !s.risolta ? user?.full_name : "" });
      qc.invalidateQueries(["segnalazioni", documento?.id]);
    } catch (e) { toast({ title: "Errore", description: String(e?.message || e), variant: "destructive" }); }
  };

  const elimina = async (s) => {
    if (!confirm("Eliminare questa segnalazione?")) return;
    try {
      await base44.entities.SegnalazioneDocumento.delete(s.id);
      qc.invalidateQueries(["segnalazioni", documento?.id]);
    } catch (e) { toast({ title: "Errore", description: String(e?.message || e), variant: "destructive" }); }
  };

  return (
    <Dialog open={!!documento} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Segnalazioni</DialogTitle>
          <DialogDescription className="truncate">{documento?.nome}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-2 pr-1">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Caricamento...</p>}
          {!isLoading && segnalazioni.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nessuna segnalazione.</p>}
          {segnalazioni.map((s) => (
            <div key={s.id} className={`border rounded-md p-3 ${s.risolta ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${TIPO_COLOR[s.tipo] || TIPO_COLOR.osservazione}`}>{TIPO_LABEL[s.tipo] || s.tipo}</span>
                <span className="text-xs text-muted-foreground">{s.user_nome || s.user_email}</span>
                {s.risolta && <Badge variant="secondary" className="ml-auto">Risolta</Badge>}
              </div>
              <p className={`text-sm ${s.risolta ? "line-through" : ""}`}>{s.testo}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => risolvi(s)}>
                  <Check className="w-3 h-3" /> {s.risolta ? "Riapri" : "Risolvi"}
                </Button>
                <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-destructive" onClick={() => elimina(s)}>
                  <Trash2 className="w-3 h-3" /> Elimina
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}