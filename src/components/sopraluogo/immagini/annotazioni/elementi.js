/**
 * Elementi della lavagna di annotazione (testi, quote, evidenziatori, figure).
 * Tutte le coordinate sono in "spazio immagine": pixel riferiti all'angolo in alto
 * a sinistra dell'immagine, alla scala con cui è mostrata nell'editor.
 */
export const uid = () => Math.random().toString(36).slice(2, 9);

export const COLORI_DEFAULT = ['#ef4444', '#3b82f6', '#f59e0b'];

const KEY_COLORI = 'workflow_colori_annotazioni';

export function caricaColori() {
  try {
    const raw = localStorage.getItem(KEY_COLORI);
    const p = raw ? JSON.parse(raw) : null;
    if (Array.isArray(p) && p.length === 3 && p.every((c) => typeof c === 'string')) return p;
  } catch (e) { /* preferenze non disponibili */ }
  return COLORI_DEFAULT;
}

export function salvaColori(colori) {
  try { localStorage.setItem(KEY_COLORI, JSON.stringify(colori)); } catch (e) { /* ignora */ }
}

// ── Creazione ────────────────────────────────────────────────────────────────
export const creaTesto = (x, y, colore = '#ffffff') =>
  ({ id: uid(), tipo: 'testo', x, y, testo: '', size: 24, colore });

export const creaQuota = (x1, y1, x2, y2) =>
  ({ id: uid(), tipo: 'quota', x1, y1, x2, y2, testo: '?', colore: '#facc15' });

export const creaEvidenziatore = (x, y, colore, opacita) =>
  ({ id: uid(), tipo: 'evidenziatore', forma: 'area', x, y, w: 0, h: 0, colore, opacita });

export const creaFigura = (punti, colore, opacita) =>
  ({ id: uid(), tipo: 'figura', punti, chiusa: true, colore, opacita, spessore: 3 });

// ── Geometria ────────────────────────────────────────────────────────────────
export const normalizzaBox = (el) => {
  const x = el.w < 0 ? el.x + el.w : el.x;
  const y = el.h < 0 ? el.y + el.h : el.y;
  return { x, y, w: Math.abs(el.w), h: Math.abs(el.h) };
};

export function boundsOf(el) {
  if (el.tipo === 'quota') {
    return {
      x: Math.min(el.x1, el.x2), y: Math.min(el.y1, el.y2),
      w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1)
    };
  }
  if (el.tipo === 'testo') {
    const righe = String(el.testo || '').split('\n');
    const w = Math.max(...righe.map((r) => r.length)) * el.size * 0.6;
    return { x: el.x, y: el.y, w: Math.max(40, w), h: el.size * 1.25 * righe.length };
  }
  if (el.tipo === 'evidenziatore') return normalizzaBox(el);
  const p = el.punti || [];
  if (!p.length) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = p.map((pt) => pt.x);
  const ys = p.map((pt) => pt.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export function distPuntoSegmento(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function puntoInPoligono(p, punti) {
  let dentro = false;
  for (let i = 0, j = punti.length - 1; i < punti.length; j = i++) {
    const a = punti[i], b = punti[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

/** Indice del segmento più vicino al punto, o -1 se oltre la tolleranza. */
export function segmentoVicino(punti, p, chiusa, tol) {
  let best = -1, bestDist = tol;
  const n = punti.length;
  const fine = chiusa ? n : n - 1;
  for (let i = 0; i < fine; i++) {
    const d = distPuntoSegmento(p, punti[i], punti[(i + 1) % n]);
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return best;
}

export function colpito(el, p, tol = 12) {
  if (el.tipo === 'quota') return distPuntoSegmento(p, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }) < tol;
  if (el.tipo === 'figura') {
    const punti = el.punti || [];
    if (punti.length < 2) return false;
    if (el.chiusa && puntoInPoligono(p, punti)) return true;
    return segmentoVicino(punti, p, el.chiusa, tol) !== -1;
  }
  const b = boundsOf(el);
  return p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol;
}

// ── Trasformazioni ───────────────────────────────────────────────────────────
export function sposta(el, dx, dy) {
  if (el.tipo === 'quota') return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
  if (el.tipo === 'testo') return { ...el, x: el.x + dx, y: el.y + dy };
  if (el.tipo === 'evidenziatore') return { ...el, x: el.x + dx, y: el.y + dy };
  return { ...el, punti: (el.punti || []).map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) };
}

export function maniglie(el) {
  if (el.tipo === 'evidenziatore') {
    const { x, y, w, h } = normalizzaBox(el);
    return [{ id: 'nw', x, y }, { id: 'ne', x: x + w, y }, { id: 'se', x: x + w, y: y + h }, { id: 'sw', x, y: y + h }];
  }
  if (el.tipo === 'testo') {
    const b = boundsOf(el);
    return [{ id: 'size', x: b.x + b.w + 6, y: b.y + b.h + 6 }];
  }
  if (el.tipo === 'figura') return (el.punti || []).map((p, i) => ({ id: `p${i}`, x: p.x, y: p.y }));
  return [{ id: 'a', x: el.x1, y: el.y1 }, { id: 'b', x: el.x2, y: el.y2 }];
}

export function applicaManiglia(el, id, p) {
  if (el.tipo === 'evidenziatore') {
    const b = normalizzaBox(el);
    let { x, y, w, h } = b;
    if (id === 'nw') { w = b.x + b.w - p.x; h = b.y + b.h - p.y; x = p.x; y = p.y; }
    if (id === 'ne') { w = p.x - b.x; h = b.y + b.h - p.y; y = p.y; }
    if (id === 'se') { w = p.x - b.x; h = p.y - b.y; }
    if (id === 'sw') { w = b.x + b.w - p.x; h = p.y - b.y; x = p.x; }
    return { ...el, x, y, w, h };
  }
  if (el.tipo === 'testo') {
    const distanza = Math.hypot(p.x - el.x, p.y - el.y);
    return { ...el, size: Math.max(10, Math.min(220, Math.round(distanza / 1.6))) };
  }
  if (el.tipo === 'figura') {
    const i = Number(String(id).slice(1));
    return { ...el, punti: (el.punti || []).map((pt, idx) => (idx === i ? { x: p.x, y: p.y } : pt)) };
  }
  if (el.tipo === 'quota') return id === 'a' ? { ...el, x1: p.x, y1: p.y } : { ...el, x2: p.x, y2: p.y };
  return el;
}

// ── Disegno ──────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  const raggio = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + raggio, y);
  ctx.lineTo(x + w - raggio, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + raggio);
  ctx.lineTo(x + w, y + h - raggio);
  ctx.quadraticCurveTo(x + w, y + h, x + w - raggio, y + h);
  ctx.lineTo(x + raggio, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - raggio);
  ctx.lineTo(x, y + raggio);
  ctx.quadraticCurveTo(x, y, x + raggio, y);
  ctx.closePath();
}

function disegnaQuota(ctx, el) {
  const { x1, y1, x2, y2 } = el;
  const col = el.colore || '#facc15';
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = 14;
  [[x1, y1, ang + Math.PI], [x2, y2, ang]].forEach(([px, py, a]) => {
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - len * Math.cos(a - 0.4), py - len * Math.sin(a - 0.4));
    ctx.moveTo(px, py);
    ctx.lineTo(px - len * Math.cos(a + 0.4), py - len * Math.sin(a + 0.4));
    ctx.stroke();
  });
  if (el.testo && el.testo !== '?') {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    ctx.font = 'bold 18px sans-serif';
    const tw = ctx.measureText(el.testo).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, mx - tw / 2 - 6, my - 28, tw + 12, 24, 5);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.testo, mx, my - 16);
  }
}

function disegnaTesto(ctx, el) {
  const righe = String(el.testo || '').split('\n');
  ctx.font = `bold ${el.size}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const larg = Math.max(...righe.map((r) => ctx.measureText(r || ' ').width));
  const alt = el.size * 1.25 * righe.length;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, el.x - 5, el.y - 5, larg + 10, alt + 10, 5);
  ctx.fill();
  ctx.fillStyle = el.colore || '#ffffff';
  righe.forEach((r, i) => ctx.fillText(r, el.x, el.y + i * el.size * 1.25));
}

function disegnaEvidenziatore(ctx, el) {
  const { x, y, w, h } = normalizzaBox(el);
  const alpha = el.opacita ?? 0.35;
  ctx.fillStyle = el.colore;
  ctx.strokeStyle = el.colore;
  ctx.globalAlpha = alpha;
  if (el.forma === 'cerchio' || el.forma === 'punto') {
    ctx.beginPath();
    if (el.forma === 'cerchio') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.min(1, alpha + 0.5);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.globalAlpha = Math.min(1, alpha + 0.45);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function disegnaFigura(ctx, el) {
  const punti = el.punti || [];
  if (punti.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(punti[0].x, punti[0].y);
  for (let i = 1; i < punti.length; i++) ctx.lineTo(punti[i].x, punti[i].y);
  if (el.chiusa) {
    ctx.closePath();
    ctx.globalAlpha = el.opacita ?? 0.25;
    ctx.fillStyle = el.colore;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = el.colore;
  ctx.lineWidth = el.spessore || 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function disegnaSelezione(ctx, el, ui) {
  const b = boundsOf(el);
  const r = 7 * ui;
  ctx.setLineDash([6 * ui, 4 * ui]);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5 * ui;
  ctx.strokeRect(b.x - 6 * ui, b.y - 6 * ui, b.w + 12 * ui, b.h + 12 * ui);
  ctx.setLineDash([]);
  maniglie(el).forEach((m) => {
    ctx.beginPath();
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2 * ui;
    ctx.stroke();
  });
}

/**
 * Disegna gli elementi. `ui` è il fattore che mantiene costanti sullo schermo
 * le maniglie di selezione (1/zoom); con ui = 0 non vengono disegnate.
 */
export function disegnaElementi(ctx, elementi, selectedId, ui = 1) {
  elementi.forEach((el) => {
    ctx.save();
    if (el.tipo === 'quota') disegnaQuota(ctx, el);
    else if (el.tipo === 'testo') disegnaTesto(ctx, el);
    else if (el.tipo === 'evidenziatore') disegnaEvidenziatore(ctx, el);
    else if (el.tipo === 'figura') disegnaFigura(ctx, el);
    ctx.restore();
    if (el.id === selectedId && ui > 0) {
      ctx.save();
      disegnaSelezione(ctx, el, ui);
      ctx.restore();
    }
  });
}