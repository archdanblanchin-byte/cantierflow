import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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
    <div className="flex justify-between py-1 border-b border-gray-100 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function fmt(n) {
  return `${(n || 0).toFixed(1)}h`;
}

export function ReportPDFContent({ cantiere, rapportini = [], foto = [] }) {
  // ---- Totali aggregati ----
  const totOreSquadra = rapportini.reduce((s, r) => {
    const c = (r.collaboratori || []).reduce((a, c) => a + (c.ore_lavorate || 0), 0);
    return s + (c || r.ore_totali_squadra || 0);
  }, 0);

  const totOreExtra = rapportini.reduce((s, r) => {
    if (!r.has_lavorazioni_extra) return s;
    return s + (r.lavorazioni_extra || []).reduce((a, l) => a + (l.ore || 0), 0);
  }, 0);

  const totOreNormali = rapportini.reduce((s, r) =>
    s + (r.lavorazioni_normali || []).reduce((a, l) => a + (l.ore_totali || 0), 0), 0);

  const totPiattaforma = rapportini.reduce((s, r) => s + (r.piattaforma?.ore || r.ore_utilizzo_piattaforma || 0), 0);
  const totMezzi = rapportini.reduce((s, r) => s + (r.ore_noleggio_mezzi || 0), 0);
  const totAttrezzi = rapportini.reduce((s, r) => s + (r.ore_noleggio_plexi || 0), 0);

  // Aggregati lavorazioni normali
  const lavorazioniAgg = {};
  rapportini.forEach((r) => {
    (r.lavorazioni_normali || []).forEach((l) => {
      const key = l.tipo_lavorazione_nome || l.descrizione_custom || "—";
      lavorazioniAgg[key] = (lavorazioniAgg[key] || 0) + (l.ore_totali || 0);
    });
  });

  // Aggregati lavorazioni extra
  const extraAgg = {};
  rapportini.forEach((r) => {
    if (!r.has_lavorazioni_extra) return;
    (r.lavorazioni_extra || []).forEach((l) => {
      const key = l.descrizione || "—";
      extraAgg[key] = (extraAgg[key] || 0) + (l.ore || 0);
    });
  });

  // Aggregati collaboratori
  const collabAgg = {};
  rapportini.forEach((r) => {
    (r.collaboratori || []).forEach((c) => {
      if (!collabAgg[c.nome]) collabAgg[c.nome] = 0;
      collabAgg[c.nome] += c.ore_lavorate || 0;
    });
  });

  // Aggregati materiali
  const materialiAgg = {};
  rapportini.forEach((r) => {
    (r.materiali || []).forEach((m) => {
      const key = m.nome || m.descrizione_custom || "—";
      if (!materialiAgg[key]) materialiAgg[key] = { qta: 0, um: m.unita_misura };
      materialiAgg[key].qta += m.quantita || 0;
    });
  });

  // Sort rapportini per data
  const sortedRapportini = [...rapportini].sort((a, b) => new Date(a.data) - new Date(b.data));

  return (
    <div id="pdf-content" className="bg-white p-8 max-w-3xl mx-auto font-sans text-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-blue-600">
        <div>
          <h1 className="text-2xl font-bold text-blue-600">{cantiere?.nome}</h1>
          {cantiere?.indirizzo && <p className="text-gray-500 text-sm mt-1">{cantiere.indirizzo}{cantiere.citta ? `, ${cantiere.citta}` : ""}</p>}
          {cantiere?.cliente && <p className="text-sm mt-0.5">Cliente: <strong>{cantiere.cliente}</strong></p>}
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>Generato il {new Date().toLocaleDateString("it-IT")}</p>
          <p className="mt-1 font-bold text-blue-600">{rapportini.length} rapportini</p>
        </div>
      </div>

      {/* ===== SEZIONE RIEPILOGO GENERALE ===== */}
      <Section title="Riepilogo Generale — Ore Totali">
        <Row label="Ore totali squadra" value={fmt(totOreSquadra)} />
        <Row label="di cui ore normali (preventivo)" value={fmt(totOreNormali)} />
        <Row label="di cui ore extra" value={fmt(totOreExtra)} />
        {totPiattaforma > 0 && <Row label="Ore piattaforma" value={fmt(totPiattaforma)} />}
        {totMezzi > 0 && <Row label="Ore noleggio mezzi" value={fmt(totMezzi)} />}
        {totAttrezzi > 0 && <Row label="Ore noleggio attrezzi" value={fmt(totAttrezzi)} />}
        {cantiere?.ore_stimate > 0 && <Row label="Ore stimate totali" value={fmt(cantiere.ore_stimate)} />}
      </Section>

      {/* ===== LAVORAZIONI NORMALI AGGREGATE ===== */}
      {Object.keys(lavorazioniAgg).length > 0 && (
        <Section title="Lavorazioni Normali — Totale">
          {Object.entries(lavorazioniAgg).map(([k, v]) => (
            <Row key={k} label={k} value={fmt(v)} />
          ))}
        </Section>
      )}

      {/* ===== LAVORAZIONI EXTRA AGGREGATE ===== */}
      {Object.keys(extraAgg).length > 0 && (
        <Section title="Lavorazioni Extra — Totale">
          {Object.entries(extraAgg).map(([k, v]) => (
            <Row key={k} label={k} value={fmt(v)} />
          ))}
        </Section>
      )}

      {/* ===== COLLABORATORI AGGREGATI ===== */}
      {Object.keys(collabAgg).length > 0 && (
        <Section title="Collaboratori — Totale Ore">
          {Object.entries(collabAgg).map(([nome, ore]) => (
            <Row key={nome} label={nome} value={fmt(ore)} />
          ))}
        </Section>
      )}

      {/* ===== MATERIALI AGGREGATI ===== */}
      {Object.keys(materialiAgg).length > 0 && (
        <Section title="Materiali Utilizzati — Totale">
          {Object.entries(materialiAgg).map(([nome, { qta, um }]) => (
            <Row key={nome} label={nome} value={`${qta} ${um || ""}`} />
          ))}
        </Section>
      )}

      {/* ===== DETTAGLIO PER GIORNO ===== */}
      <div className="mt-8 mb-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-blue-600 border-b-2 border-blue-600 pb-2">
          Dettaglio Per Giorno
        </h2>
      </div>

      {sortedRapportini.map((r, idx) => {
        const dataStr = r.data ? format(new Date(r.data), "d MMMM yyyy", { locale: it }) : `Rapportino #${idx + 1}`;
        const oreCollGiorno = (r.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0);
        const oreExtraGiorno = r.has_lavorazioni_extra
          ? (r.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0) : 0;
        const oreNormGiorno = (r.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);

        return (
          <div key={r.id} className="mb-8 border border-gray-200 rounded-xl overflow-hidden">
            {/* Header giorno */}
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div>
                <span className="font-bold text-sm">{dataStr}</span>
                {r.note_generali && <p className="text-xs text-gray-500 mt-0.5">{r.note_generali}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.stato === "inviato" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {r.stato === "inviato" ? "Inviato" : "Bozza"}
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Ore giorno */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Ore</p>
                <Row label="Ore squadra" value={fmt(r.ore_totali_squadra)} />
                {oreCollGiorno > 0 && <Row label="Ore lavoratori" value={fmt(oreCollGiorno)} />}
                {oreNormGiorno > 0 && <Row label="Ore normali" value={fmt(oreNormGiorno)} />}
                {oreExtraGiorno > 0 && <Row label="Ore extra" value={fmt(oreExtraGiorno)} />}
              </div>

              {/* Collaboratori del giorno */}
              {(r.collaboratori || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Collaboratori</p>
                  {r.collaboratori.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5 border-b border-gray-50">
                      <span>{c.nome}</span>
                      <span className="text-gray-500">
                        {fmt(c.ore_lavorate)}
                        {c.note_imprevisti ? <em className="ml-1 text-xs text-gray-400">({c.note_imprevisti})</em> : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Mezzi del giorno */}
              {(r.piattaforma?.ore > 0 || r.ore_noleggio_mezzi > 0 || r.ore_noleggio_plexi > 0 ||
                (r.macchinari || []).length > 0 || (r.attrezzi || []).length > 0) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Mezzi e Attrezzature</p>
                  {r.piattaforma?.ore > 0 && <Row label={`Piattaforma (${r.piattaforma.tipo || ""})`} value={fmt(r.piattaforma.ore)} />}
                  {r.ore_noleggio_mezzi > 0 && <Row label={r.descrizione_noleggio_mezzi || "Noleggio mezzi"} value={fmt(r.ore_noleggio_mezzi)} />}
                  {r.ore_noleggio_plexi > 0 && <Row label={r.descrizione_noleggio_plexi || "Noleggio attrezzi"} value={fmt(r.ore_noleggio_plexi)} />}
                  {(r.macchinari || []).map((m, i) => (
                    <Row key={i} label={`Idropulitrice: ${m.tipo_custom || m.tipo}`} value={fmt(m.ore)} />
                  ))}
                  {(r.attrezzi || []).map((a, i) => (
                    <Row key={i} label={`Attrezzo: ${a.tipo_custom || a.tipo}`} value={fmt(a.ore)} />
                  ))}
                </div>
              )}

              {/* Lavorazioni normali del giorno */}
              {(r.lavorazioni_normali || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Lavorazioni Normali</p>
                  {r.lavorazioni_normali.map((l, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5 border-b border-gray-50">
                      <span>{l.tipo_lavorazione_nome || l.descrizione_custom}</span>
                      <span>{fmt(l.ore_totali)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Lavorazioni extra del giorno */}
              {r.has_lavorazioni_extra && (r.lavorazioni_extra || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Lavorazioni Extra</p>
                  {r.lavorazioni_extra.map((l, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5 border-b border-gray-50">
                      <span>{l.descrizione}</span>
                      <span>{fmt(l.ore)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Materiali del giorno */}
              {(r.materiali || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Materiali</p>
                  {r.materiali.map((m, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5 border-b border-gray-50">
                      <span>{m.nome || m.descrizione_custom}</span>
                      <span>{m.quantita} {m.unita_misura}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Foto del giorno */}
              {(r.foto_annotate || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Foto</p>
                  <div className="grid grid-cols-3 gap-2">
                    {r.foto_annotate.map((f, i) => (
                      <div key={i}>
                        <img src={f.url_annotata || f.url} alt="" className="w-full aspect-video object-cover rounded-lg border border-gray-100" />
                        {f.nota && <p className="text-xs text-gray-400 mt-1">{f.nota}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Foto cantiere */}
      {foto.length > 0 && (
        <Section title="Foto Cantiere">
          <div className="grid grid-cols-3 gap-3">
            {foto.map((f, i) => (
              <div key={i}>
                {f.tipo === "codice_colore" ? (
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded border border-gray-200" style={{ background: f.colore }} />
                    <span className="text-xs font-mono">{f.colore}</span>
                  </div>
                ) : (
                  <img src={f.url_annotata || f.url} alt="" className="w-full aspect-video object-cover rounded-xl border border-gray-100" />
                )}
                {f.nota && <p className="text-xs text-gray-400 mt-1 text-center">{f.nota}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-300 text-center">
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