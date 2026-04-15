import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

function fmt(n) {
  return `${(n || 0).toFixed(1)}h`;
}

function DaySection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", borderBottom: "1px solid #bfdbfe", paddingBottom: 4, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "4px 0", fontSize: 13 }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function ReportPDFContent({ cantiere, rapportini = [], foto = [] }) {
  const sortedRapportini = [...rapportini].sort((a, b) => new Date(a.data) - new Date(b.data));

  // Totali aggregati
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

  // Prima foto cantiere (facciata)
  const fotoFacciata = foto.find(f => f.tipo !== "codice_colore") || null;

  return (
    <div id="pdf-content" style={{ background: "white", padding: 32, maxWidth: 720, margin: "0 auto", fontFamily: "sans-serif", color: "#1f2937" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #2563eb", paddingBottom: 20, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", margin: 0 }}>{cantiere?.nome}</h1>
          {cantiere?.indirizzo && <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{cantiere.indirizzo}{cantiere.citta ? `, ${cantiere.citta}` : ""}</p>}
          {cantiere?.cliente && <p style={{ fontSize: 13, marginTop: 2 }}>Cliente: <strong>{cantiere.cliente}</strong></p>}
          {cantiere?.codice && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>{cantiere.codice}</p>}
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#9ca3af" }}>
          <p>Generato il {new Date().toLocaleDateString("it-IT")}</p>
          <p style={{ marginTop: 4, fontWeight: 700, color: "#2563eb" }}>{rapportini.length} rapportini</p>
        </div>
      </div>

      {/* IMMAGINE FACCIATA */}
      {fotoFacciata && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 8 }}>Immagine Cantiere</p>
          <img
            src={fotoFacciata.url_annotata || fotoFacciata.url}
            alt="Facciata cantiere"
            style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
          {fotoFacciata.nota && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{fotoFacciata.nota}</p>}
        </div>
      )}

      {/* RIEPILOGO ORE TOTALI */}
      <DaySection title="Riepilogo Totale Ore">
        <Row label="Ore totali squadra" value={fmt(totOreSquadra)} />
        <Row label="di cui ore normali (preventivo)" value={fmt(totOreNormali)} />
        <Row label="di cui ore extra" value={fmt(totOreExtra)} />
        {totPiattaforma > 0 && <Row label="Ore piattaforma" value={fmt(totPiattaforma)} />}
        {totMezzi > 0 && <Row label="Ore noleggio mezzi" value={fmt(totMezzi)} />}
        {cantiere?.ore_stimate > 0 && <Row label="Ore stimate totali" value={fmt(cantiere.ore_stimate)} />}
      </DaySection>

      {/* DETTAGLIO PER GIORNO */}
      <div style={{ borderTop: "2px solid #2563eb", paddingTop: 16, marginTop: 8, marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
          Dettaglio Per Giorno
        </h2>
      </div>

      {sortedRapportini.map((r, idx) => {
        const dataStr = r.data ? format(new Date(r.data), "d MMMM yyyy", { locale: it }) : `Rapportino #${idx + 1}`;
        const oreCollGiorno = (r.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0);
        const oreExtraGiorno = r.has_lavorazioni_extra
          ? (r.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0) : 0;
        const oreNormGiorno = (r.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
        const hasMezzi = r.piattaforma?.ore > 0 || r.ore_noleggio_mezzi > 0 ||
          (r.macchinari || []).length > 0 || (r.attrezzi || []).length > 0;

        return (
          <div key={r.id} style={{ marginBottom: 28, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            {/* Header giorno */}
            <div style={{ background: "#eff6ff", padding: "10px 16px", borderBottom: "1px solid #bfdbfe", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 14, color: "#1e40af" }}>{dataStr}</strong>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                background: r.stato === "inviato" ? "#dcfce7" : "#fef9c3",
                color: r.stato === "inviato" ? "#166534" : "#854d0e"
              }}>
                {r.stato === "inviato" ? "Inviato" : "Bozza"}
              </span>
            </div>

            <div style={{ padding: "12px 16px" }}>
              {r.note_generali && (
                <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontStyle: "italic" }}>{r.note_generali}</p>
              )}

              {/* ORE */}
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 4 }}>Ore</p>
              <Row label="Ore squadra" value={fmt(r.ore_totali_squadra)} />
              {oreNormGiorno > 0 && <Row label="Ore normali" value={fmt(oreNormGiorno)} />}
              {oreExtraGiorno > 0 && <Row label="Ore extra" value={fmt(oreExtraGiorno)} />}

              {/* LAVORAZIONI NORMALI */}
              {(r.lavorazioni_normali || []).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 4 }}>Lavorazioni</p>
                  {r.lavorazioni_normali.map((l, i) => (
                    <Row key={i} label={l.tipo_lavorazione_nome || l.descrizione_custom || "—"} value={fmt(l.ore_totali)} />
                  ))}
                </div>
              )}

              {/* LAVORAZIONI EXTRA */}
              {r.has_lavorazioni_extra && (r.lavorazioni_extra || []).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 4 }}>Lavorazioni Extra</p>
                  {r.lavorazioni_extra.map((l, i) => (
                    <Row key={i} label={l.descrizione || "—"} value={fmt(l.ore)} />
                  ))}
                </div>
              )}

              {/* LAVORATORI */}
              {(r.collaboratori || []).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 4 }}>Lavoratori</p>
                  {r.collaboratori.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "3px 0", fontSize: 13 }}>
                      <span>{c.nome}</span>
                      <span style={{ color: "#6b7280" }}>
                        {fmt(c.ore_lavorate)}
                        {c.note_imprevisti ? <em style={{ marginLeft: 4, fontSize: 11, color: "#9ca3af" }}>({c.note_imprevisti})</em> : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* MEZZI */}
              {hasMezzi && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 4 }}>Mezzi e Attrezzature</p>
                  {r.piattaforma?.ore > 0 && <Row label={`Piattaforma (${r.piattaforma.tipo || ""})`} value={fmt(r.piattaforma.ore)} />}
                  {r.ore_noleggio_mezzi > 0 && <Row label={r.descrizione_noleggio_mezzi || "Noleggio mezzi"} value={fmt(r.ore_noleggio_mezzi)} />}
                  {(r.macchinari || []).map((m, i) => (
                    <Row key={i} label={`Idropulitrice: ${m.tipo_custom || m.tipo}`} value={m.ore > 0 ? fmt(m.ore) : "—"} />
                  ))}
                  {(r.attrezzi || []).map((a, i) => (
                    <Row key={i} label={`Attrezzo: ${a.tipo_custom || a.tipo}`} value={a.ore > 0 ? fmt(a.ore) : "—"} />
                  ))}
                </div>
              )}

              {/* MATERIALI */}
              {(r.materiali || []).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 4 }}>Materiali</p>
                  {r.materiali.map((m, i) => (
                    <Row key={i} label={m.nome || m.descrizione_custom || "—"} value={`${m.quantita || 0} ${m.unita_misura || ""}`} />
                  ))}
                </div>
              )}

              {/* FOTO DEL GIORNO */}
              {(r.foto_annotate || []).length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 6 }}>Foto</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {r.foto_annotate.map((f, i) => (
                      <div key={i}>
                        <img src={f.url_annotata || f.url} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                        {f.nota && <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{f.nota}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* FOTO CANTIERE (esclusa quella già usata come facciata) */}
      {foto.filter(f => f.tipo !== "codice_colore" && f.id !== fotoFacciata?.id).length > 0 && (
        <DaySection title="Altre Foto Cantiere">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {foto.filter(f => f.tipo !== "codice_colore" && f.id !== fotoFacciata?.id).map((f, i) => (
              <div key={i}>
                <img src={f.url_annotata || f.url} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} />
                {f.nota && <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3, textAlign: "center" }}>{f.nota}</p>}
              </div>
            ))}
          </div>
        </DaySection>
      )}

      {/* CODICI COLORE */}
      {foto.filter(f => f.tipo === "codice_colore").length > 0 && (
        <DaySection title="Codici Colore">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {foto.filter(f => f.tipo === "codice_colore").map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: f.colore }} />
                <div>
                  <p style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{f.colore}</p>
                  {f.nota && <p style={{ fontSize: 10, color: "#9ca3af" }}>{f.nota}</p>}
                </div>
              </div>
            ))}
          </div>
        </DaySection>
      )}

      <div style={{ marginTop: 32, paddingTop: 12, borderTop: "1px solid #f3f4f6", fontSize: 11, color: "#d1d5db", textAlign: "center" }}>
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
        body { margin: 0; padding: 0; font-family: sans-serif; }
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