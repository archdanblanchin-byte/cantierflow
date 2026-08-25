import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

function fmt(n) {
  return `${(n || 0).toFixed(1)}h`;
}

function Section({ title, color = "#2563eb", children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontSize: 14, fontWeight: 700, color,
        borderBottom: `2px solid ${color}`,
        paddingBottom: 6, marginBottom: 12,
        textTransform: "uppercase", letterSpacing: 1
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value, sub }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "5px 0", fontSize: 13 }}>
      <span style={{ color: "#374151" }}>
        {label}
        {sub && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>({sub})</span>}
      </span>
      <span style={{ fontWeight: 600, color: "#1f2937" }}>{value}</span>
    </div>
  );
}

function DateBadge({ data }) {
  const str = data ? format(new Date(data), "d MMM yyyy", { locale: it }) : "";
  return (
    <span style={{
      fontSize: 10, color: "#6b7280", background: "#f3f4f6",
      borderRadius: 4, padding: "1px 6px", marginLeft: 6, fontWeight: 400
    }}>{str}</span>
  );
}

export function ReportPDFContent({ cantiere, rapportini = [], foto = [], trasferte = [], spostamenti = [], id = "pdf-content" }) {
  const sorted = [...rapportini].sort((a, b) => new Date(a.data) - new Date(b.data));

  // ── Totali ────────────────────────────────────────────────────────────────
  const totOreSquadra = sorted.reduce((s, r) => {
    const c = (r.collaboratori || []).reduce((a, c) => a + (c.ore_lavorate || 0), 0);
    return s + (c || r.ore_totali_squadra || 0);
  }, 0);
  const totOreNormali = sorted.reduce((s, r) =>
    s + (r.lavorazioni_normali || []).reduce((a, l) => a + (l.ore_totali || 0), 0), 0);
  const totOreExtra = sorted.reduce((s, r) =>
    r.has_lavorazioni_extra
      ? s + (r.lavorazioni_extra || []).reduce((a, l) => a + (l.ore || 0), 0)
      : s, 0);
  const totPiattaforma = sorted.reduce((s, r) => s + (r.piattaforma?.ore || r.ore_utilizzo_piattaforma || 0), 0);
  const totMezzi = sorted.reduce((s, r) => s + (r.ore_noleggio_mezzi || 0), 0);
  const totOreSpostamento = sorted.reduce((s, r) => s + (r.ore_spostamento || 0), 0);

  // ── Aggregazioni per voce ─────────────────────────────────────────────────
  // Lavorazioni normali → mappa nome → [{data, ore, descrizione}]
  const lavorazioniMap = {};
  sorted.forEach(r => {
    (r.lavorazioni_normali || []).forEach(l => {
      const key = l.tipo_lavorazione_nome || l.descrizione_custom || "—";
      if (!lavorazioniMap[key]) lavorazioniMap[key] = [];
      lavorazioniMap[key].push({ data: r.data, ore: l.ore_totali || 0, descrizione: l.descrizione || l.descrizione_custom });
    });
  });

  // Lavorazioni extra → mappa descrizione → [{data, ore}]
  const extraMap = {};
  sorted.forEach(r => {
    if (!r.has_lavorazioni_extra) return;
    (r.lavorazioni_extra || []).forEach(l => {
      const key = l.descrizione || "—";
      if (!extraMap[key]) extraMap[key] = [];
      extraMap[key].push({ data: r.data, ore: l.ore || 0 });
    });
  });

  // Collaboratori → mappa nome → [{data, ore, note}]
  const collaboratoriMap = {};
  sorted.forEach(r => {
    (r.collaboratori || []).forEach(c => {
      const key = c.nome;
      if (!collaboratoriMap[key]) collaboratoriMap[key] = [];
      collaboratoriMap[key].push({ data: r.data, ore: c.ore_lavorate || 0, note: c.note_imprevisti });
    });
  });

  // Materiali → mappa nome → [{data, quantita, unita}]
  const materialiMap = {};
  sorted.forEach(r => {
    (r.materiali || []).forEach(m => {
      const key = m.nome || m.descrizione_custom || "—";
      if (!materialiMap[key]) materialiMap[key] = [];
      materialiMap[key].push({ data: r.data, quantita: m.quantita || 0, unita: m.unita_misura || "", descrizione: m.descrizione || "" });
    });
  });

  // Mezzi: piattaforma, idropulitrice, attrezzi, noleggio
  const piattaformaEntries = sorted
    .filter(r => (r.piattaforma?.ore || r.ore_utilizzo_piattaforma || 0) > 0)
    .map(r => ({ data: r.data, tipo: r.piattaforma?.tipo || "—", ore: r.piattaforma?.ore || r.ore_utilizzo_piattaforma || 0 }));

  const idropulitriciEntries = [];
  sorted.forEach(r => {
    (r.macchinari || []).forEach(m => {
      idropulitriciEntries.push({ data: r.data, nome: m.tipo_custom || m.tipo || "—", ore: m.ore || 0 });
    });
  });

  const attrezziEntries = [];
  sorted.forEach(r => {
    (r.attrezzi || []).forEach(a => {
      attrezziEntries.push({ data: r.data, nome: a.tipo_custom || a.tipo || "—", ore: a.ore || 0 });
    });
  });

  const noleggioEntries = sorted
    .filter(r => (r.ore_noleggio_mezzi || 0) > 0)
    .map(r => ({ data: r.data, descrizione: r.descrizione_noleggio_mezzi || "Noleggio mezzi", ore: r.ore_noleggio_mezzi || 0 }));

  const hasMezzi = piattaformaEntries.length > 0 || idropulitriciEntries.length > 0 || attrezziEntries.length > 0 || noleggioEntries.length > 0;

  // Note generali (solo quelle non vuote)
  const noteGenerali = sorted.filter(r => r.note_generali?.trim());

  // Trasferte collegate al cantiere (primo o ultimo cantiere della giornata)
  const trasferteCantiere = (trasferte || []).slice().sort((a, b) => new Date(a.data) - new Date(b.data));

  // Spostamenti (timbrature tipo spostamento) collegati al cantiere
  const spostamentiCantiere = (spostamenti || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const totKmSpostamento = spostamentiCantiere.reduce((s, t) => s + (t.km_spostamento || 0), 0);

  // Foto
  const fotoFacciata = foto.find(f => f.tipo !== "codice_colore") || null;
  const altreFoto = foto.filter(f => f.tipo !== "codice_colore" && f.id !== fotoFacciata?.id);
  const codiciColore = foto.filter(f => f.tipo === "codice_colore");

  // Tutte le foto dai rapportini
  const fotoRapportini = [];
  sorted.forEach(r => {
    (r.foto_annotate || []).forEach(f => fotoRapportini.push({ ...f, data: r.data }));
  });

  return (
    <div id={id} style={{ background: "white", padding: 32, maxWidth: 760, margin: "0 auto", fontFamily: "sans-serif", color: "#1f2937" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #2563eb", paddingBottom: 20, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", margin: 0 }}>{cantiere?.nome}</h1>
          {cantiere?.indirizzo && <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{cantiere.indirizzo}{cantiere.citta ? `, ${cantiere.citta}` : ""}</p>}
          {cantiere?.cliente && <p style={{ fontSize: 13, marginTop: 2 }}>Cliente: <strong>{cantiere.cliente}</strong></p>}
          {cantiere?.codice && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>{cantiere.codice}</p>}
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#9ca3af" }}>
          <p>Generato il {new Date().toLocaleDateString("it-IT")}</p>
          <p style={{ marginTop: 4 }}>{sorted.length} rapportini</p>
          {sorted.length > 0 && (
            <p style={{ marginTop: 2 }}>
              {format(new Date(sorted[0].data), "d MMM yyyy", { locale: it })}
              {sorted.length > 1 ? ` → ${format(new Date(sorted[sorted.length - 1].data), "d MMM yyyy", { locale: it })}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* IMMAGINE FACCIATA */}
      {fotoFacciata && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#9ca3af", marginBottom: 8 }}>Immagine Cantiere</p>
          <img
            src={fotoFacciata.url_annotata || fotoFacciata.url}
            alt="Facciata cantiere"
            style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: 12, border: "1px solid #e5e7eb" }}
          />
          {fotoFacciata.nota && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{fotoFacciata.nota}</p>}
        </div>
      )}

      {/* 1. RIEPILOGO ORE */}
      <Section title="Riepilogo Ore" color="#2563eb">
        <Row label="Ore totali squadra" value={fmt(totOreSquadra)} />
        <Row label="di cui lavorazioni preventivate" value={fmt(totOreNormali)} />
        <Row label="di cui lavorazioni extra" value={fmt(totOreExtra)} />
        {totOreSpostamento > 0 && <Row label="Ore spostamento (auto)" value={fmt(totOreSpostamento)} />}
        {totOreSpostamento > 0 && <Row label="Totale ore cantiere (lav. + spost.)" value={fmt(totOreSquadra + totOreSpostamento)} />}
        {totPiattaforma > 0 && <Row label="Ore piattaforma" value={fmt(totPiattaforma)} />}
        {totMezzi > 0 && <Row label="Ore noleggio mezzi" value={fmt(totMezzi)} />}
        {cantiere?.ore_stimate > 0 && <Row label="Ore stimate totali" value={fmt(cantiere.ore_stimate)} />}
      </Section>

      {/* 2. LAVORAZIONI PREVENTIVATE */}
      {Object.keys(lavorazioniMap).length > 0 && (
        <Section title="Lavorazioni Preventivate" color="#1d4ed8">
          {Object.entries(lavorazioniMap).map(([nome, voci]) => {
            const totale = voci.reduce((s, v) => s + v.ore, 0);
            return (
              <div key={nome} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #dbeafe" }}>
                  <strong style={{ fontSize: 13, color: "#1e3a8a" }}>{nome}</strong>
                  <strong style={{ fontSize: 13, color: "#1e3a8a" }}>{fmt(totale)} totali</strong>
                </div>
                {voci.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
                    <span><DateBadge data={v.data} />{v.descrizione && v.descrizione !== nome ? ` ${v.descrizione}` : ""}</span>
                    <span>{fmt(v.ore)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </Section>
      )}

      {/* 3. LAVORAZIONI EXTRA */}
      {Object.keys(extraMap).length > 0 && (
        <Section title="Lavorazioni Extra (Concordato)" color="#d97706">
          {Object.entries(extraMap).map(([desc, voci]) => {
            const totale = voci.reduce((s, v) => s + v.ore, 0);
            return (
              <div key={desc} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #fed7aa" }}>
                  <strong style={{ fontSize: 13, color: "#92400e" }}>{desc}</strong>
                  <strong style={{ fontSize: 13, color: "#92400e" }}>{fmt(totale)} totali</strong>
                </div>
                {voci.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
                    <span><DateBadge data={v.data} /></span>
                    <span>{fmt(v.ore)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </Section>
      )}

      {/* 4. COLLABORATORI */}
      {Object.keys(collaboratoriMap).length > 0 && (
        <Section title="Collaboratori" color="#059669">
          {Object.entries(collaboratoriMap).map(([nome, voci]) => {
            const totale = voci.reduce((s, v) => s + v.ore, 0);
            return (
              <div key={nome} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #bbf7d0" }}>
                  <strong style={{ fontSize: 13, color: "#065f46" }}>{nome}</strong>
                  <strong style={{ fontSize: 13, color: "#065f46" }}>{fmt(totale)} totali</strong>
                </div>
                {voci.map((v, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
                    <span>
                      <DateBadge data={v.data} />
                      {v.note && <em style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af" }}>{v.note}</em>}
                    </span>
                    <span>{fmt(v.ore)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </Section>
      )}

      {/* 5. MEZZI E ATTREZZATURE */}
      {hasMezzi && (
        <Section title="Mezzi e Attrezzature" color="#7c3aed">
          {piattaformaEntries.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "5px 0", fontSize: 13 }}>
              <span>Piattaforma <span style={{ color: "#6b7280", fontSize: 11 }}>({e.tipo})</span> <DateBadge data={e.data} /></span>
              <span style={{ fontWeight: 600 }}>{fmt(e.ore)}</span>
            </div>
          ))}
          {idropulitriciEntries.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "5px 0", fontSize: 13 }}>
              <span>Idropulitrice: {e.nome} <DateBadge data={e.data} /></span>
              <span style={{ fontWeight: 600 }}>{e.ore > 0 ? fmt(e.ore) : "—"}</span>
            </div>
          ))}
          {attrezziEntries.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "5px 0", fontSize: 13 }}>
              <span>Attrezzo: {e.nome} <DateBadge data={e.data} /></span>
              <span style={{ fontWeight: 600 }}>{e.ore > 0 ? fmt(e.ore) : "—"}</span>
            </div>
          ))}
          {noleggioEntries.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "5px 0", fontSize: 13 }}>
              <span>{e.descrizione} <DateBadge data={e.data} /></span>
              <span style={{ fontWeight: 600 }}>{fmt(e.ore)}</span>
            </div>
          ))}
        </Section>
      )}

      {/* 6. MATERIALI */}
      {Object.keys(materialiMap).length > 0 && (
        <Section title="Materiali Utilizzati" color="#0891b2">
          {Object.entries(materialiMap).map(([nome, voci]) => {
            const totale = voci.reduce((s, v) => s + v.quantita, 0);
            const unita = voci[0]?.unita || "";
            return (
              <div key={nome} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #bae6fd" }}>
                  <strong style={{ fontSize: 13, color: "#0e7490" }}>{nome}</strong>
                  <strong style={{ fontSize: 13, color: "#0e7490" }}>{totale} {unita} totali</strong>
                </div>
                {voci.map((v, i) => (
                  <div key={i} style={{ padding: "3px 12px", fontSize: 12, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span><DateBadge data={v.data} /></span>
                      <span>{v.quantita} {v.unita}</span>
                    </div>
                    {v.descrizione && (
                      <em style={{ fontSize: 11, color: "#9ca3af", display: "block", marginTop: 2 }}>{v.descrizione}</em>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </Section>
      )}

      {/* 7. TRASFERTE */}
      {trasferteCantiere.length > 0 && (
        <Section title="Trasferte" color="#0d9488">
          {trasferteCantiere.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "5px 0", fontSize: 13 }}>
              <span>
                <DateBadge data={t.data} />
                {" "}· {" "}
                {t.user_nome || t.user_email}
                {t.mezzo_proprio && <span style={{ fontSize: 11, color: "#9ca3af" }}> (mezzo proprio)</span>}
                {" — "}
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {t.primo_cantiere_nome || "—"} → {t.ultimo_cantiere_nome || "—"}
                </span>
              </span>
              <span style={{ fontWeight: 600 }}>
                {t.km_totali ? `${t.km_totali} km` : "—"}
                {t.tipo_trasferta && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>({t.tipo_trasferta})</span>}
              </span>
            </div>
          ))}
          <Row label="Totale km trasferte" value={`${trasferteCantiere.reduce((s, t) => s + (t.km_totali || 0), 0)} km`} />
        </Section>
      )}

      {/* 8. SPOSTAMENTI */}
      {spostamentiCantiere.length > 0 && (
        <Section title="Spostamenti" color="#ea580c">
          {spostamentiCantiere.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "5px 0", fontSize: 13 }}>
              <span>
                <DateBadge data={t.data_ora} />
                {" "}· {" "}
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {t.cantiere_nome || "—"} → {t.cantiere_destinazione_nome || "—"}
                </span>
                {t.mezzo_proprio && <span style={{ fontSize: 11, color: "#9ca3af" }}> (mezzo proprio)</span>}
                {t.user_nome && <span style={{ fontSize: 11, color: "#9ca3af" }}> · {t.user_nome}</span>}
              </span>
              <span style={{ fontWeight: 600 }}>{t.km_spostamento ? `${t.km_spostamento} km` : "—"}</span>
            </div>
          ))}
          {totKmSpostamento > 0 && <Row label="Totale km spostamenti" value={`${totKmSpostamento.toFixed(1)} km`} />}
        </Section>
      )}

      {/* 9. NOTE GENERALI */}
      {noteGenerali.length > 0 && (
        <Section title="Note Generali" color="#6b7280">
          {noteGenerali.map((r, i) => (
            <div key={i} style={{ marginBottom: 8, padding: "8px 12px", background: "#f9fafb", borderRadius: 8, borderLeft: "3px solid #d1d5db" }}>
              <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, fontWeight: 600 }}>
                {format(new Date(r.data), "d MMM yyyy", { locale: it })}
              </p>
              <p style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>{r.note_generali}</p>
            </div>
          ))}
        </Section>
      )}

      {/* 8. FOTO DAI RAPPORTINI */}
      {fotoRapportini.length > 0 && (
        <Section title="Foto Cantiere (dai rapportini)" color="#64748b">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {fotoRapportini.map((f, i) => (
              <div key={i}>
                <img src={f.url_annotata || f.url} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2, textAlign: "center" }}>
                  {format(new Date(f.data), "d MMM", { locale: it })}{f.nota ? ` — ${f.nota}` : ""}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 9. ALTRE FOTO CANTIERE (dall'archivio) */}
      {altreFoto.length > 0 && (
        <Section title="Altre Foto Archivio" color="#64748b">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {altreFoto.map((f, i) => (
              <div key={i}>
                <img src={f.url_annotata || f.url} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }} />
                {f.nota && <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3, textAlign: "center" }}>{f.nota}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 10. CODICI COLORE */}
      {codiciColore.length > 0 && (
        <Section title="Codici Colore" color="#64748b">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {codiciColore.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: f.colore }} />
                <div>
                  <p style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{f.colore}</p>
                  {f.nota && <p style={{ fontSize: 10, color: "#9ca3af" }}>{f.nota}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div style={{ marginTop: 32, paddingTop: 12, borderTop: "1px solid #f3f4f6", fontSize: 11, color: "#d1d5db", textAlign: "center" }}>
        Report generato automaticamente — {new Date().toLocaleString("it-IT")}
      </div>
    </div>
  );
}

export async function captureAndSavePdf(rootEl, nomeCantiere) {
  if (!rootEl) { toast.error("Contenuto non trovato"); throw new Error("Contenuto non trovato"); }
  const wrap = document.createElement("div");
  wrap.style.position = "fixed";
  wrap.style.left = "-99999px";
  wrap.style.top = "0";
  wrap.style.width = "794px";
  wrap.style.background = "#ffffff";
  wrap.style.zIndex = "-1";
  const clone = rootEl.cloneNode(true);
  wrap.appendChild(clone);
  document.body.appendChild(wrap);

  const imgs = [...clone.querySelectorAll("img")];
  await Promise.all(imgs.map((img) =>
    img.complete ? Promise.resolve() : new Promise((res) => {
      img.onload = res;
      img.onerror = res;
    })
  ));

  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  document.body.removeChild(wrap);

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;

  let heightLeft = imgH;
  let position = 0;
  pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
    heightLeft -= pageH;
  }

  const nome = (nomeCantiere || "cantiere").replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "cantiere";
  pdf.save(`Report_${nome}.pdf`);
}

export default function ReportPDFButton({ cantiere, rapportini, foto, contentId = "pdf-content" }) {
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    const el = document.getElementById(contentId);
    if (!el) { toast.error("Contenuto non trovato"); return; }
    setLoading(true);
    try {
      await captureAndSavePdf(el, cantiere?.nome);
      toast.success("PDF generato");
    } catch (e) {
      console.error("PDF error", e);
      toast.error("Errore generazione PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handlePrint} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Esporta PDF
    </Button>
  );
}