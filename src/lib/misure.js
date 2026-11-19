// Geometria e formattazione del modulo Misurazioni.

export const TIPI = {
  line: { label: "Misura", chiuso: false, minPunti: 2, maxPunti: 2 },
  quota: { label: "Quota", chiuso: false, minPunti: 2, maxPunti: 2 },
  area: { label: "Area", chiuso: true, minPunti: 3 },
  room: { label: "Ambiente", chiuso: true, minPunti: 3 },
  perimeter: { label: "Perimetro", chiuso: true, minPunti: 3 },
  text: { label: "Testo", chiuso: false, minPunti: 1, maxPunti: 1 },
};

export const COLORI = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9", "#6366f1", "#a855f7", "#0f172a"];

export const arr = (r) => (Array.isArray(r) ? r : r?.items || []);

export const parseNum = (s) => {
  const n = parseFloat(String(s ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function polyLen(pts, chiuso) {
  let t = 0;
  for (let i = 1; i < pts.length; i++) t += dist(pts[i - 1], pts[i]);
  if (chiuso && pts.length > 2) t += dist(pts[pts.length - 1], pts[0]);
  return t;
}

// Formula di Gauss
export function polyArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

// Restituisce {length, area, perimeter} in metri / metri quadri
export function computeMetrics(m, scale) {
  const s = scale || 0;
  const pts = m.points || [];
  if (!s) return {};
  if (m.type === "line" || m.type === "quota") return { length: dist(pts[0], pts[1]) * s };
  if (m.type === "area" || m.type === "room" || m.type === "perimeter") {
    const per = polyLen(pts, true) * s;
    return { length: per, perimeter: per, area: polyArea(pts) * s * s };
  }
  return {};
}

const nf = (v, d) => v.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtNum = (v, d = 2) => (v == null ? "—" : nf(v, d));
export const fmtArea = (v) => (v == null ? "—" : `${nf(v, 2)} m²`);

export function fmtLen(v, unit = "auto") {
  if (v == null) return "—";
  if (unit === "cm") return `${nf(v * 100, 1)} cm`;
  if (unit === "mm") return `${nf(v * 1000, 0)} mm`;
  return `${nf(v, 2)} m`;
}

// Testo mostrato sul disegno e negli elenchi
export function valoreMisura(m) {
  if (m.type === "area" || m.type === "room") return fmtArea(m.area);
  if (m.type === "perimeter") return fmtLen(m.perimeter, m.unit);
  if (m.type === "line" || m.type === "quota") return fmtLen(m.length, m.unit);
  return m.text || "";
}

export const nomeMisura = (m) =>
  m.room_name || m.label || m.text || TIPI[m.type]?.label || m.type;