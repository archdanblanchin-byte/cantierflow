import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCircle2, Loader2, Pencil, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { coloreValido, etichettaTipo, testoSuColore } from "@/lib/campioni";
import FotoCampione from "@/components/campioni/FotoCampione";

function Riga({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-semibold text-right break-words">{value}</span>
    </div>
  );
}

export default function CampioneDetailDialog({ campione, open, onClose, onModifica, onUsa, onChanged }) {
  const { user } = useAuth();
  const [inCorso, setInCorso] = useState(false);
  if (!campione) return null;

  const usato = campione.stato === "utilizzato";
  const hex = coloreValido(campione.colore_hex) ? campione.colore_hex : "";
  const puoEliminare = user?.role === "admin" || campione.created_by_id === user?.id;

  const foto = [
    { chiave: "fornitore", label: "Etichetta fornitore" },
    { chiave: "azienda", label: "Etichetta ditta" },
    { chiave: "secchio", label: "Contenitore" },
    { chiave: "colore", label: "Foto colore" },
  ].filter((f) => campione[`foto_${f.chiave}`]);

  const annullaUso = async () => {
    setInCorso(true);
    try {
      await base44.entities.Campione.update(campione.id, {
        stato: "disponibile",
        usato_cantiere_id: "",
        usato_cantiere_nome: "",
        usato_nota: "",
        usato_da_nome: "",
        data_utilizzo: null,
      });
      toast.success("Campione di nuovo disponibile");
      onChanged();
      onClose();
    } catch (err) {
      toast.error("Operazione non riuscita: " + (err?.message || "riprova"));
    } finally {
      setInCorso(false);
    }
  };

  const elimina = async () => {
    if (!window.confirm(`Eliminare definitivamente "${campione.nome}"?`)) return;
    setInCorso(true);
    try {
      await base44.entities.Campione.delete(campione.id);
      toast.success("Campione eliminato");
      onChanged();
      onClose();
    } catch (err) {
      toast.error("Eliminazione non riuscita: " + (err?.message || "riprova"));
    } finally {
      setInCorso(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[94vh] overflow-y-auto top-4 translate-y-0 p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
          <DialogTitle className="pr-6">{campione.nome}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-20 h-20 rounded-2xl border border-black/10 shrink-0 flex items-end justify-end p-2"
              style={hex ? { backgroundColor: hex } : undefined}
            >
              {hex && (
                <span className="text-[10px] font-bold uppercase" style={{ color: testoSuColore(hex) }}>
                  {hex}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block rounded-full bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1">
                {etichettaTipo(campione.tipo)}
              </span>
              {campione.colore_nome && <p className="text-sm font-semibold mt-1.5">{campione.colore_nome}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                {Number(campione.quantita || 0) > 0
                  ? `${campione.quantita} ${campione.unita_misura || ""} rimasti`
                  : "Quantità non indicata"}
              </p>
            </div>
          </div>

          {usato && (
            <div className="rounded-xl border border-border bg-muted/50 p-3">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Utilizzato
                {campione.usato_cantiere_nome ? ` per ${campione.usato_cantiere_nome}` : ""}
              </p>
              {campione.usato_nota && <p className="text-xs text-muted-foreground mt-1">{campione.usato_nota}</p>}
              <p className="text-[11px] text-muted-foreground mt-1">
                {campione.usato_da_nome || ""}
                {campione.data_utilizzo
                  ? ` · ${format(new Date(campione.data_utilizzo), "d MMMM yyyy", { locale: it })}`
                  : ""}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-border px-3 py-1">
            <Riga label="Marca" value={campione.marca} />
            <Riga label="Codice" value={campione.codice} />
            <Riga label="Fornitore" value={campione.fornitore} />
            <Riga
              label="Data etichetta"
              value={campione.data_etichetta ? format(new Date(campione.data_etichetta), "d MMMM yyyy", { locale: it }) : ""}
            />
            <Riga label="Da cantiere" value={campione.cantiere_nome || campione.cantiere_etichetta} />
            <Riga label="Note" value={campione.note} />
            <Riga label="Caricato da" value={campione.user_nome} />
          </div>

          {foto.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Foto</p>
              <div className="grid grid-cols-2 gap-2">
                {foto.map((f) => (
                  <div key={f.chiave}>
                    <FotoCampione file_uri={campione[`foto_${f.chiave}`]} className="w-full h-36 rounded-xl border border-border" />
                    <p className="text-[11px] text-muted-foreground mt-1">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(campione.testo_fornitore || campione.testo_azienda) && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Testo letto sulle etichette
              </p>
              <div className="rounded-xl bg-muted/60 p-3 space-y-2">
                {campione.testo_fornitore && (
                  <p className="text-[11px] whitespace-pre-line text-muted-foreground">{campione.testo_fornitore}</p>
                )}
                {campione.testo_azienda && (
                  <p className="text-[11px] whitespace-pre-line text-muted-foreground">{campione.testo_azienda}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 space-y-2">
          {usato ? (
            <Button variant="outline" className="w-full gap-2" onClick={annullaUso} disabled={inCorso}>
              {inCorso ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
              Torna disponibile
            </Button>
          ) : (
            <Button className="w-full gap-2" onClick={() => onUsa(campione)}>
              <CheckCircle2 className="w-4 h-4" />
              Segna come utilizzato
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => onModifica(campione)}>
              <Pencil className="w-4 h-4" />
              Modifica
            </Button>
            {puoEliminare && (
              <Button variant="outline" className="gap-2 text-destructive" onClick={elimina} disabled={inCorso}>
                <Trash2 className="w-4 h-4" />
                Elimina
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}