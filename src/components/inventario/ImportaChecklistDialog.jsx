import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileUp, Loader2, Upload } from "lucide-react";
import { caricaTuttiMateriali } from "@/lib/inventario";
import { leggiChecklistPdf } from "@/lib/checklistPdf";

// Importa in inventario i prodotti della check list di magazzino.
// Mostra sempre l'anteprima prima di creare qualcosa.
export default function ImportaChecklistDialog({ open, onClose, onImported }) {
  const [nomeFile, setNomeFile] = useState("");
  const [leggendo, setLeggendo] = useState(false);
  const [righe, setRighe] = useState(null);
  const [importando, setImportando] = useState(false);
  const queryClient = useQueryClient();

  const { data: esistenti = [] } = useQuery({
    queryKey: ["materiali-inventario"],
    queryFn: () => caricaTuttiMateriali({ gestito_magazzino: true }),
    enabled: open,
  });

  const nomiEsistenti = new Set(esistenti.map((m) => String(m.nome || "").toLowerCase().replace(/\s+/g, " ").trim()));
  const anteprima = (righe || []).map((r) => ({
    ...r,
    esistente: nomiEsistenti.has(r.nome.toLowerCase().replace(/\s+/g, " ").trim()),
  }));

  const reset = () => {
    setNomeFile("");
    setRighe(null);
  };

  const leggi = async (file) => {
    if (!file) return;
    setNomeFile(file.name);
    setRighe(null);
    setLeggendo(true);
    try {
      const lette = await leggiChecklistPdf(file);
      if (!lette.length) throw new Error("nessun prodotto riconosciuto nel PDF");
      setRighe(lette);
      toast.success(`${lette.length} prodotti letti dalla check list`);
    } catch (err) {
      toast.error("Lettura non riuscita: " + (err?.message || "riprova"));
    } finally {
      setLeggendo(false);
    }
  };

  const importa = async () => {
    setImportando(true);
    try {
      const res = await base44.functions.invoke("importa_checklist_inventario", { azione: "importa", righe });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`${res.data.creati} prodotti aggiunti, ${res.data.aggiornati} completati`);
      onImported?.();
      classificaInBackground();
      reset();
      onClose();
    } catch (err) {
      toast.error("Importazione non riuscita: " + (err?.message || "riprova"));
    } finally {
      setImportando(false);
    }
  };

  // I prodotti appena importati vengono classificati dall'AI in automatico.
  const classificaInBackground = () => {
    (async () => {
      for (let i = 0; i < 12; i++) {
        const res = await base44.functions.invoke("classifica_materiali", { azione: "classifica", limite: 120 });
        if (!res.data?.rimanenti) break;
      }
      queryClient.invalidateQueries({ queryKey: ["materiali-inventario"] });
    })().catch(() => {});
  };

  const nuovi = anteprima.filter((r) => !r.esistente).length;
  const presenti = anteprima.length - nuovi;
  const daVerificare = anteprima.filter((r) => r.minimo === null).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle className="pr-6 flex items-center gap-2">
            <FileUp className="w-5 h-5 text-primary" /> Importa check list magazzino
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Carica il PDF della check list: vengono letti prodotto, numero di sezione (posizione scaffale), quantità
              minima, unità di misura e fornitore. La giacenza iniziale copia la quantità minima.
            </p>
            <label className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-3 cursor-pointer hover:bg-accent">
              {leggendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {leggendo ? "Lettura del PDF..." : nomeFile || "Scegli il PDF della check list"}
              </span>
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => leggi(e.target.files?.[0])} />
            </label>
          </div>

          {righe && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border p-2.5">
                  <p className="text-lg font-bold">{nuovi}</p>
                  <p className="text-[11px] text-muted-foreground">nuovi prodotti</p>
                </div>
                <div className="rounded-xl border border-border p-2.5">
                  <p className="text-lg font-bold">{presenti}</p>
                  <p className="text-[11px] text-muted-foreground">già presenti</p>
                </div>
                <div className="rounded-xl border border-border p-2.5">
                  <p className="text-lg font-bold">{daVerificare}</p>
                  <p className="text-[11px] text-muted-foreground">da verificare</p>
                </div>
              </div>

              {daVerificare > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {daVerificare} prodotti hanno un minimo non numerico (X, trattino): vengono importati con soglia e
                    giacenza a 0 e l'annotazione originale resta nelle note.
                  </span>
                </p>
              )}

              <div className="rounded-xl border border-border divide-y divide-border max-h-72 overflow-y-auto">
                {anteprima.map((r, i) => (
                  <div key={`${r.nome}-${i}`} className="p-2.5 flex items-center gap-3">
                    <span className="w-10 shrink-0 text-[11px] font-bold text-muted-foreground">
                      {r.posizione_scaffale || "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{r.nome}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {r.minimo === null ? "minimo da verificare" : `minimo ${r.minimo}`} {r.unita_misura || ""}
                        {r.fornitore ? ` · ${r.fornitore}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        r.esistente ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {r.esistente ? "già presente" : "nuovo"}
                    </span>
                  </div>
                ))}
              </div>

              <Button className="w-full gap-2" onClick={importa} disabled={importando}>
                {importando && <Loader2 className="w-4 h-4 animate-spin" />}
                Conferma importazione
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}