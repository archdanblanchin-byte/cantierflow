import { useState } from "react";
import { ArrowLeft, FileDown, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FotoPrivata from "@/components/foto/FotoPrivata";
import ImageViewer from "./ImageViewer";
import SezioniNota from "./SezioniNota";
import RiepilogoTotali from "./RiepilogoTotali";
import EliminaDialog from "./EliminaDialog";
import { calcolaMisura, fmt, fmtTotali, MODALITA, totaliRilievi } from "@/lib/sopralluogoCalc";
import { nomeCliente, statoEffettivo, statoInfo } from "@/lib/sopralluogo";
import { generaPdfSopralluogo } from "@/lib/sopralluogoPdf";
import { urlFoto } from "@/lib/fotoCantiere";

const Blocco = ({ titolo, children }) => (
  <Card className="p-4 space-y-2"><h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{titolo}</h2>{children}</Card>
);

function Galleria({ items = [], onOpen }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {items.map((it, i) => (
        <button key={i} type="button" onClick={() => onOpen(items.map((x) => x.url_annotata || x.file_uri), i)}>
          <FotoPrivata file_uri={it.url_annotata || it.file_uri} className="w-full aspect-square rounded-lg" />
          {it.nota && <p className="text-[10px] text-muted-foreground truncate">{it.nota}</p>}
        </button>
      ))}
    </div>
  );
}

export default function SopralluogoAnteprima({ s, onBack, onEdit, onDelete }) {
  const [pdf, setPdf] = useState(false);
  const [elimina, setElimina] = useState(false);
  const [viewer, setViewer] = useState({ uris: [], start: null });
  const apri = (uris, start) => setViewer({ uris, start });
  const stato = statoInfo(statoEffettivo(s));
  const rilievi = s.rilievi || [];
  const tot = totaliRilievi(rilievi);
  const att = s.attenzione || {};

  const genera = async () => {
    setPdf(true);
    try { await generaPdfSopralluogo(s); } catch { toast.error("Generazione del PDF non riuscita"); } finally { setPdf(false); }
  };
  const apriFile = async (f) => window.open(await urlFoto(f.file_uri), "_blank", "noopener");

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-10 space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}><ArrowLeft className="w-4 h-4" />Elenco</Button>
        <Button size="sm" className="gap-1.5" onClick={onEdit}><Pencil className="w-4 h-4" />Modifica</Button>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={pdf} onClick={genera}>{pdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}PDF</Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-destructive ml-auto" onClick={() => setElimina(true)}><Trash2 className="w-4 h-4" />Elimina</Button>
      </div>

      <Card className="p-4 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">{nomeCliente(s)}</h1>
          <Badge className={stato.cls}>{stato.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground capitalize">Sopralluogo {s.tipo} · {s.data ? new Date(s.data).toLocaleDateString("it-IT") : "senza data"}</p>
        {s.cantiere_nome && <p className="text-sm">Cantiere: {s.cantiere_nome}</p>}
        <p className="text-sm">{[s.indirizzo, s.citta].filter(Boolean).join(", ")}</p>
        <p className="text-sm text-muted-foreground">{[s.telefono, s.email].filter(Boolean).join(" · ")}</p>
        {s.preventivo_riferimento && <p className="text-sm">Preventivo: {s.preventivo_riferimento}</p>}
        {s.attenzione_attiva && <p className="text-sm pt-1 border-t mt-2">Alla cortese attenzione: {[att.nome, att.cognome].filter(Boolean).join(" ")} {[att.indirizzo, att.citta, att.telefono, att.email].filter(Boolean).join(", ")}</p>}
      </Card>

      {[["Prodotti particolari", s.prodotti_particolari], ["Note generali", s.note_generali], ["Note di dettaglio", s.note_dettaglio]].filter(([, v]) => v).map(([l, v]) => (
        <Blocco key={l} titolo={l}><p className="text-sm whitespace-pre-wrap">{v}</p></Blocco>
      ))}
      {s.nota_vocale_trascrizione && <Blocco titolo="Analisi nota vocale"><SezioniNota analisi={s.nota_vocale_analisi} /></Blocco>}
      {(s.lavorazioni_elenco || []).length > 0 && (
        <Blocco titolo="Lavorazioni da eseguire">
          <ol className="list-decimal pl-5 space-y-1">{s.lavorazioni_elenco.map((l, i) => <li key={i} className="text-sm"><b>{l.nome}</b>{l.descrizione && ` — ${l.descrizione}`}</li>)}</ol>
        </Blocco>
      )}

      {rilievi.length > 0 && (
        <Blocco titolo="Rilievi">
          {rilievi.map((r, ri) => (
            <div key={r.id || ri} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between gap-2"><p className="font-semibold">{r.lavorazione}</p><span className="text-xs capitalize text-muted-foreground">{r.ambito || "interno"}</span></div>
              <p className="text-sm font-medium">Totale: {fmtTotali(tot.lavorazioni[ri].totali)}</p>
              {(r.porzioni || []).map((p, pi) => (
                <div key={p.id || pi} className="pl-3 border-l-2 space-y-1">
                  <p className="text-sm font-medium">{p.nome || "Porzione"} <span className="text-xs text-muted-foreground">· {MODALITA.find((m) => m.key === p.modalita)?.label} · {fmt(tot.lavorazioni[ri].porzioni[pi].totale)} {p.unita || "m²"}</span></p>
                  {(p.misure || []).map((m, mi) => (
                    <p key={m.id || mi} className={`text-xs font-mono ${m.riferimento ? "text-amber-700" : "text-muted-foreground"}`}>
                      {m.descrizione ? `${m.descrizione}: ` : ""}{calcolaMisura(p.modalita, m).formula} {p.unita || "m²"}{m.riferimento ? " · riferimento, non sommata" : ""}
                    </p>
                  ))}
                  {p.note && <p className="text-xs">{p.note}</p>}
                </div>
              ))}
              {r.note && <p className="text-sm">{r.note}</p>}
              {(r.foto || []).length > 0 && <Galleria items={r.foto} onOpen={apri} />}
              {(r.file || []).map((f, i) => <button key={i} type="button" className="block text-sm text-primary underline" onClick={() => apriFile(f)}>{f.nome}</button>)}
            </div>
          ))}
          <RiepilogoTotali tot={tot} />
        </Blocco>
      )}

      {(s.stanze || []).length > 0 && (
        <Blocco titolo="Stanze (dati storici)">
          {s.stanze.map((st, i) => <p key={i} className="text-sm">{st.nome || `Stanza ${i + 1}`}: {fmt(st.lunghezza)} × {fmt(st.larghezza)} × h {fmt(st.altezza)}</p>)}
        </Blocco>
      )}
      {(s.facciate || []).length > 0 && <Blocco titolo="Facciate (dati storici)">{s.facciate.map((f, i) => <p key={i} className="text-sm">{f.orientamento || `Facciata ${i + 1}`}</p>)}</Blocco>}
      {(s.foto_generali || []).length > 0 && <Blocco titolo="Immagini generali"><Galleria items={s.foto_generali} onOpen={apri} /></Blocco>}
      {(s.foto_quote || []).length > 0 && <Blocco titolo="Immagini con quote"><Galleria items={s.foto_quote} onOpen={apri} /></Blocco>}
      {(s.allegati || []).length > 0 && (
        <Blocco titolo="Allegati">{s.allegati.map((f, i) => <button key={i} type="button" className="block text-sm text-primary underline" onClick={() => apriFile(f)}>{f.nome}</button>)}</Blocco>
      )}

      <ImageViewer uris={viewer.uris} start={viewer.start} onClose={() => setViewer({ uris: [], start: null })} />
      <EliminaDialog open={elimina} onOpenChange={setElimina} nome={nomeCliente(s)} onConfirm={onDelete} />
    </div>
  );
}