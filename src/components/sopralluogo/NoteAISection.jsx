import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VoceAI from "./VoceAI";
import SezioniNota from "./SezioniNota";

export default function NoteAISection({ draft, set }) {
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState("");
  const risultato = (d) => {
    set("nota_vocale_trascrizione", d.trascrizione || "");
    set("nota_vocale_analisi", d.analisi || {});
  };

  const rianalizza = async () => {
    setBusy(true);
    setErrore("");
    try {
      const res = await base44.functions.invoke("sopralluogo_ai", { action: "nota", trascrizione: draft.nota_vocale_trascrizione });
      if (res.data?.error) throw new Error(res.data.error);
      risultato(res.data);
    } catch (e) {
      setErrore(`Rianalisi non riuscita: ${e?.response?.data?.error || e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const ha = !!draft.nota_vocale_trascrizione;

  return (
    <div className="space-y-3">
      <div className="space-y-1"><Label className="text-xs">Prodotti particolari</Label><Textarea rows={2} value={draft.prodotti_particolari || ""} onChange={(e) => set("prodotti_particolari", e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">Note generali</Label><Textarea rows={3} value={draft.note_generali || ""} onChange={(e) => set("note_generali", e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">Note di dettaglio</Label><Textarea rows={3} value={draft.note_dettaglio || ""} onChange={(e) => set("note_dettaglio", e.target.value)} /></div>

      <div className="rounded-xl border p-3 space-y-2">
        <p className="text-sm font-semibold">Nota vocale su cliente e cantiere</p>
        <VoceAI action="nota" onResult={risultato} guida="Racconta cliente, contesto del cantiere, accessi in quota, stato delle superfici, lavori, prodotti, organizzazione e accordi." />
        {ha && (
          <>
            <SezioniNota analisi={draft.nota_vocale_analisi} />
            <details><summary className="text-xs cursor-pointer text-muted-foreground">Trascrizione</summary><p className="text-xs whitespace-pre-wrap pt-1">{draft.nota_vocale_trascrizione}</p></details>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={rianalizza}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Rianalizza
              </Button>
              <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => { set("nota_vocale_trascrizione", ""); set("nota_vocale_analisi", {}); }}>
                <Trash2 className="w-3.5 h-3.5" /> Elimina
              </Button>
            </div>
          </>
        )}
        {errore && <p className="text-xs text-destructive">{errore}</p>}
      </div>
    </div>
  );
}