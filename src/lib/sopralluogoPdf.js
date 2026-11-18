import { jsPDF } from "jspdf";
import { fmt, fmtTotali, calcolaMisura, totaliRilievi, MODALITA } from "@/lib/sopralluogoCalc";
import { nomeCliente, statoEffettivo, statoInfo } from "@/lib/sopralluogo";
import { urlFoto } from "@/lib/fotoCantiere";

async function immagine(uri) {
  try {
    const url = await urlFoto(uri);
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return { data: c.toDataURL("image/jpeg", 0.8), w: c.width, h: c.height };
  } catch {
    return null;
  }
}

// PDF del sopralluogo: dati cliente, note, rilievi con formule e totali, foto, quote e allegati (elenco nomi).
export async function generaPdfSopralluogo(s) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 15;
  const nuovaPagina = (h = 8) => { if (y + h > 285) { doc.addPage(); y = 15; } };
  const riga = (testo, { size = 10, bold = false, gap = 5 } = {}) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.splitTextToSize(String(testo), 180).forEach((l) => { nuovaPagina(gap); doc.text(l, 15, y); y += gap; });
  };
  const titolo = (t) => { y += 3; riga(t, { size: 12, bold: true, gap: 6 }); };
  const foto = async (items, etichetta) => {
    if (!items?.length) return;
    titolo(etichetta);
    for (const it of items) {
      const im = await immagine(it.url_annotata || it.file_uri);
      if (!im) continue;
      const k = Math.min(120 / im.w, 90 / im.h);
      nuovaPagina(im.h * k + 8);
      doc.addImage(im.data, "JPEG", 15, y, im.w * k, im.h * k);
      y += im.h * k + 4;
      if (it.nota) riga(it.nota, { size: 9 });
    }
  };

  riga(`Sopralluogo ${s.tipo === "esterno" ? "esterno" : "interno"} - ${nomeCliente(s)}`, { size: 16, bold: true, gap: 8 });
  riga(`Stato: ${statoInfo(statoEffettivo(s)).label}   Data: ${s.data ? new Date(s.data).toLocaleDateString("it-IT") : "-"}`);
  [s.cantiere_nome && `Cantiere: ${s.cantiere_nome}`, [s.indirizzo, s.citta].filter(Boolean).join(", "), [s.telefono, s.email].filter(Boolean).join(" · ")].filter(Boolean).forEach((t) => riga(t));
  if (s.attenzione_attiva) {
    const a = s.attenzione || {};
    riga(`Alla cortese attenzione: ${[a.nome, a.cognome].filter(Boolean).join(" ")} ${[a.indirizzo, a.citta, a.telefono, a.email].filter(Boolean).join(", ")}`);
  }

  const note = [["Prodotti particolari", s.prodotti_particolari], ["Note generali", s.note_generali], ["Note di dettaglio", s.note_dettaglio]].filter(([, v]) => v);
  note.forEach(([l, v]) => { titolo(l); riga(v); });
  if ((s.lavorazioni_elenco || []).length) {
    titolo("Lavorazioni da eseguire");
    s.lavorazioni_elenco.forEach((l, i) => riga(`${i + 1}. ${l.nome}${l.descrizione ? " - " + l.descrizione : ""}`));
  }

  const rilievi = s.rilievi || [];
  if (rilievi.length) {
    titolo("Rilievi e misure");
    const tot = totaliRilievi(rilievi);
    rilievi.forEach((r, ri) => {
      riga(`${r.lavorazione} (${r.ambito || "interno"}) - ${fmtTotali(tot.lavorazioni[ri].totali)}`, { bold: true });
      (r.porzioni || []).forEach((p) => {
        riga(`  ${p.nome || "Porzione"} [${MODALITA.find((m) => m.key === p.modalita)?.label}]`, { size: 9 });
        (p.misure || []).forEach((m) => riga(`    ${m.descrizione || "Misura"}: ${calcolaMisura(p.modalita, m).formula} ${p.unita || "m²"}${m.riferimento ? " (riferimento, non sommata)" : ""}`, { size: 9, gap: 4 }));
      });
      if (r.note) riga(`  Note: ${r.note}`, { size: 9 });
    });
    titolo("Totali");
    riga(`Interno: ${fmtTotali(tot.perAmbito.interno)}   Esterno: ${fmtTotali(tot.perAmbito.esterno)}`);
    riga(`Totale complessivo: ${fmtTotali(tot.complessivo)}`, { bold: true });
    if (tot.travi || tot.sigillature) riga(`Travi ${fmt(tot.travi)} ml · Sigillature ${fmt(tot.sigillature)} ml`);
  }
  (s.stanze || []).length && titolo("Stanze (dati storici)");
  (s.stanze || []).forEach((st) => riga(`${st.nome || "Stanza"}: ${fmt(st.lunghezza)} × ${fmt(st.larghezza)} × h ${fmt(st.altezza)}`));

  await foto(s.foto_generali, "Immagini generali");
  await foto(s.foto_quote, "Immagini con quote");
  for (const r of rilievi) await foto(r.foto, `Foto - ${r.lavorazione}`);
  const files = [...(s.allegati || []), ...rilievi.flatMap((r) => r.file || [])];
  if (files.length) { titolo("Allegati"); files.forEach((f) => riga(`- ${f.nome}`)); }

  doc.save(`Sopralluogo ${nomeCliente(s)}.pdf`);
}