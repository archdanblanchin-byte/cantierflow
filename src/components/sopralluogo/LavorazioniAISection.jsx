import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VoceAI from "./VoceAI";

export default function LavorazioniAISection({ draft, set }) {
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState("");
  const elenco = draft.lavorazioni_elenco || [];
  const risultato = (d) => {
    set("lavorazioni_trascrizione", d.trascrizione || "");
    set("lavorazioni_elenco", d.elenco || []);
  };

  const rianalizza = async () => {
    setBusy(true);
    setErrore("");
    try {
      const res = await base44.functions.invoke("sopralluogo_ai", { action: "lavorazioni", trascrizione: draft.lavorazioni_trascrizione });
      if (res.data?.error) throw new Error(res.data.error);
      risultato(res.data);
    } catch (e) {
      setErrore(`Rianalisi non riuscita: ${e?.response?.data?.error || e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <VoceAI action="lavorazioni" onResult={risultato} guida="Descrivi a voce le lavorazioni da eseguire, dalla preparazione alla finitura." />
      {elenco.length > 0 && (
        <ol className="space-y-2 list-decimal pl-5">
          {elenco.map((l, i) => (
            <li key={i} className="text-sm"><b>{l.nome}</b>{l.descrizione && <span className="text-muted-foreground"> — {l.descrizione}</span>}</li>
          ))}
        </ol>
      )}
      {draft.lavorazioni_trascrizione && (
        <>
          <details><summary className="text-xs cursor-pointer text-muted-foreground">Trascrizione</summary><p className="text-xs whitespace-pre-wrap pt-1">{draft.lavorazioni_trascrizione}</p></details>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={rianalizza}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Rianalizza
            </Button>
            <Button type="button" size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => { set("lavorazioni_trascrizione", ""); set("lavorazioni_elenco", []); }}>
              <Trash2 className="w-3.5 h-3.5" /> Elimina
            </Button>
          </div>
        </>
      )}
      {errore && <p className="text-xs text-destructive">{errore}</p>}
    </div>
  );
}