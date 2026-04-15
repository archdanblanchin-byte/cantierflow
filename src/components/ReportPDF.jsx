import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-primary/20 pb-1 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-1 border-b border-border/50 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function ReportPDFContent({ cantiere, rapportini = [], foto = [] }) {
  return (
    <div id="pdf-content" className="bg-white p-8 max-w-3xl mx-auto font-sans text-foreground">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-primary">
        <div>
          <h1 className="text-2xl font-bold text-primary">{cantiere?.nome}</h1>
          <p className="text-muted-foreground text-sm mt-1">{cantiere?.indirizzo}</p>
          {cantiere?.cliente && <p className="text-sm mt-0.5">Cliente: <strong>{cantiere.cliente}</strong></p>}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Generato il {new Date().toLocaleDateString("it-IT")}</p>
          <p className="mt-1 font-bold text-primary">{rapportini.length} rapportini</p>
        </div>
      </div>

      {/* Riepilogo cantiere */}
      <Section title="Dati Cantiere">
        <Row label="Città" value={cantiere?.citta} />
        <Row label="Ore stimate" value={cantiere?.ore_stimate ? `${cantiere.ore_stimate}h` : null} />
        <Row label="Stato" value={cantiere?.attivo ? "Attivo" : "Chiuso"} />
      </Section>

      {/* Rapportini */}
      {rapportini.map((r, idx) => (
        <div key={r.id} className="mb-8 p-4 bg-gray-50 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-base">
              Rapportino #{idx + 1} — {new Date(r.data).toLocaleDateString("it-IT")}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.stato === "inviato" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {r.stato === "inviato" ? "Inviato" : "Bozza"}
            </span>
          </div>

          <Row label="Ore squadra" value={`${r.ore_totali_squadra}h`} />
          {r.note_generali && <Row label="Note" value={r.note_generali} />}

          {r.collaboratori?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Collaboratori</p>
              {r.collaboratori.map((c, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span>{c.nome}</span>
                  <span>{c.ore_lavorate}h {c.note_imprevisti ? `(${c.note_imprevisti})` : ""}</span>
                </div>
              ))}
            </div>
          )}

          {r.lavorazioni_normali?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Lavorazioni Normali</p>
              {r.lavorazioni_normali.map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span>{l.tipo_lavorazione_nome || l.descrizione_custom}</span>
                  <span>{l.ore_totali}h</span>
                </div>
              ))}
            </div>
          )}

          {r.has_lavorazioni_extra && r.lavorazioni_extra?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Lavorazioni Extra</p>
              {r.lavorazioni_extra.map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span>{l.descrizione}</span>
                  <span>{l.ore}h</span>
                </div>
              ))}
            </div>
          )}

          {r.materiali?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Materiali</p>
              {r.materiali.map((m, i) => (
                <div key={i} className="flex justify-between text-sm py-0.5">
                  <span>{m.nome || m.descrizione_custom}</span>
                  <span>{m.quantita} {m.unita_misura}</span>
                </div>
              ))}
            </div>
          )}

          {/* Foto rapportino */}
          {r.foto_annotate?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Foto</p>
              <div className="grid grid-cols-3 gap-2">
                {r.foto_annotate.map((f, i) => (
                  <div key={i}>
                    <img src={f.url_annotata || f.url} alt="" className="w-full aspect-video object-cover rounded-lg" />
                    {f.nota && <p className="text-xs text-muted-foreground mt-1">{f.nota}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Foto cantiere */}
      {foto.length > 0 && (
        <Section title="Foto Cantiere">
          <div className="grid grid-cols-3 gap-3">
            {foto.map((f, i) => (
              <div key={i}>
                <img
                  src={f.url_annotata || f.url}
                  alt=""
                  className="w-full aspect-video object-cover rounded-xl border border-border"
                />
                {f.nota && <p className="text-xs text-muted-foreground mt-1 text-center">{f.nota}</p>}
                {f.tipo === "codice_colore" && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full border border-border" style={{ background: f.colore }} />
                    <span className="text-xs font-mono">{f.colore}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground text-center">
        Report generato automaticamente — {new Date().toLocaleString("it-IT")}
      </div>
    </div>
  );
}

export default function ReportPDFButton({ cantiere, rapportini, foto }) {
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    setLoading(true);
    const el = document.getElementById("pdf-content");
    if (!el) { setLoading(false); return; }
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Report ${cantiere?.nome}</title>
      <style>
        body { font-family: sans-serif; padding: 24px; color: #1a1a2e; }
        img { max-width: 100%; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        h1 { color: #2563eb; }
        @media print { button { display: none; } }
      </style></head><body>
      ${el.outerHTML}
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>
    `);
    w.document.close();
    setLoading(false);
  };

  return (
    <Button variant="outline" onClick={handlePrint} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Esporta PDF
    </Button>
  );
}