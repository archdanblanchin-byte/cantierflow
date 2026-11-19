import { jsPDF } from "jspdf";
import { TIPI, fmtNum, nomeMisura } from "@/lib/misure";

const num = (v, d = 2) => (v == null ? "" : fmtNum(v, d));

function scarica(blob, nome) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const nomeFile = (project, page, ext) =>
  `${project.name}-${page.name}`.replace(/[^\w\-]+/g, "_") + `.${ext}`;

export function exportCSV({ project, page, misure }) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const righe = [
    ["Progetto", project.name],
    ["Pagina", page.name],
    ["Scala (m per pixel)", page.scale ? String(page.scale).replace(".", ",") : ""],
    [],
    ["Tipo", "Nome", "Lunghezza (m)", "Area (m²)", "Perimetro (m)", "Lavorazione", "Note"],
    ...misure.map((m) => [
      TIPI[m.type]?.label || m.type, nomeMisura(m), num(m.length), num(m.area), num(m.perimeter),
      m.lavorazione || "", m.notes || "",
    ]),
  ];
  const csv = "\uFEFF" + righe.map((r) => r.map(esc).join(";")).join("\n");
  scarica(new Blob([csv], { type: "text/csv;charset=utf-8" }), nomeFile(project, page, "csv"));
}

const carica = (url) => new Promise((res) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = url;
});

// Disegna immagine e misure su un canvas fuori schermo
async function istantanea(imageUrl, page, misure) {
  const img = imageUrl ? await carica(imageUrl) : null;
  if (!img) return null;
  const f = Math.min(1, 1800 / page.width);
  const c = document.createElement("canvas");
  c.width = page.width * f;
  c.height = page.height * f;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const lw = Math.max(2, c.width / 500);
  ctx.lineWidth = lw;
  ctx.font = `600 ${Math.max(12, c.width / 70)}px sans-serif`;
  ctx.textAlign = "center";
  misure.forEach((m) => {
    const pts = (m.points || []).map((p) => [p[0] * f, p[1] * f]);
    if (!pts.length) return;
    const col = m.color || "#ef4444";
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    if (m.type !== "text") {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      if (TIPI[m.type]?.chiuso) {
        ctx.closePath();
        if (m.type !== "perimeter") { ctx.globalAlpha = m.opacity ?? 0.35; ctx.fill(); ctx.globalAlpha = 1; }
      }
      ctx.stroke();
    }
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const testo = m.type === "text" ? m.text : [m.room_name || m.label, m.type === "area" || m.type === "room" ? num(m.area) + " m²" : num(m.length) + " m"].filter(Boolean).join(" ");
    ctx.lineWidth = lw * 2.5;
    ctx.strokeStyle = "white";
    ctx.strokeText(testo || "", cx, cy - lw * 3);
    ctx.lineWidth = lw;
    ctx.fillStyle = col;
    ctx.fillText(testo || "", cx, cy - lw * 3);
  });
  return c.toDataURL("image/jpeg", 0.85);
}

export async function exportPDF({ project, page, misure, imageUrl }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 14;
  let y = M + 4;
  doc.setFontSize(16); doc.setFont(undefined, "bold");
  doc.text(project.name, M, y); y += 6;
  doc.setFontSize(10); doc.setFont(undefined, "normal"); doc.setTextColor(100);
  doc.text(`Pagina: ${page.name}${page.scale ? `   ·   1 px = ${String(page.scale.toFixed(5)).replace(".", ",")} m` : ""}`, M, y);
  y += 6;

  const snap = await istantanea(imageUrl, page, misure);
  if (snap) {
    const maxW = W - 2 * M, maxH = 130;
    const r = Math.min(maxW / page.width, maxH / page.height);
    const w = page.width * r, h = page.height * r;
    doc.addImage(snap, "JPEG", M, y, w, h);
    y += h + 6;
  }

  const riga = (cols, bold) => {
    if (y > 280) { doc.addPage(); y = M + 4; }
    doc.setFontSize(9); doc.setFont(undefined, bold ? "bold" : "normal"); doc.setTextColor(bold ? 0 : 50);
    const xs = [M, M + 28, M + 100, M + 130, M + 158];
    cols.forEach((c, i) => doc.text(String(c).slice(0, i === 1 ? 45 : 22), xs[i], y, i > 1 ? { align: "left" } : undefined));
    y += 5.5;
  };
  riga(["Tipo", "Nome", "Lunghezza", "Area", "Perimetro"], true);
  misure.forEach((m) => riga([
    TIPI[m.type]?.label || m.type, nomeMisura(m),
    m.length != null ? `${num(m.length)} m` : "", m.area != null ? `${num(m.area)} m²` : "",
    m.perimeter != null ? `${num(m.perimeter)} m` : "",
  ]));

  const aree = misure.reduce((a, m) => a + (m.area || 0), 0);
  const linee = misure.filter((m) => m.type === "line").reduce((a, m) => a + (m.length || 0), 0);
  y += 3;
  riga(["Totali", `Segmenti: ${num(linee)} m`, "", `${num(aree)} m²`, ""], true);
  doc.save(nomeFile(project, page, "pdf"));
}