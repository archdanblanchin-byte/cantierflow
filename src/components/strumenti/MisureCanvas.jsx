import React, { useCallback, useEffect, useRef, useState } from "react";
import { TIPI, dist } from "@/lib/misure";
import MisureShape from "./MisureShape";

const DUE_PUNTI = ["calibrate", "line", "quota"];
const POLIGONI = ["area", "room", "perimeter"];

export default function MisureCanvas({
  imageUrl, width, height, measurements, tool, selectedId,
  onSelect, onCreate, onMovePoints, onCalibrate, onText,
}) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [draft, setDraft] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [drag, setDrag] = useState(null);
  const pan = useRef(null);
  const down = useRef(null);
  const fitted = useRef("");

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const adatta = useCallback(() => {
    if (!size.w || !width) return;
    const k = Math.min(size.w / width, size.h / height) * 0.95;
    setView({ k, x: (size.w - width * k) / 2, y: (size.h - height * k) / 2 });
  }, [size, width, height]);

  useEffect(() => {
    const chiave = `${imageUrl}|${size.w > 0}`;
    if (size.w && fitted.current !== chiave) { fitted.current = chiave; adatta(); }
  }, [imageUrl, size, adatta]);

  useEffect(() => { setDraft([]); }, [tool, imageUrl]);

  // Zoom con la rotella, centrato sul cursore
  useEffect(() => {
    const el = ref.current;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      setView((v) => {
        const k = Math.min(40, Math.max(0.02, v.k * Math.exp(-e.deltaY * 0.0015)));
        return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const mondo = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [(e.clientX - r.left - view.x) / view.k, (e.clientY - r.top - view.y) / view.k];
  };

  // Aggancio ai vertici esistenti
  const aggancia = (p) => {
    let best = null, bd = 10 / view.k;
    measurements.forEach((m) => {
      if (m.id === drag?.id) return;
      (m.points || []).forEach((q) => { const d = dist(p, q); if (d < bd) { bd = d; best = q; } });
    });
    return best ? [best[0], best[1]] : p;
  };

  const chiudi = useCallback((pts) => {
    if (tool === "calibrate") onCalibrate(dist(pts[0], pts[1]));
    else onCreate(tool, pts);
    setDraft([]);
  }, [tool, onCalibrate, onCreate]);

  const clic = (p) => {
    const q = aggancia(p);
    if (tool === "select") return onSelect(null);
    if (tool === "text") return onText(q);
    if (DUE_PUNTI.includes(tool)) {
      const pts = [...draft, q];
      return pts.length === 2 ? chiudi(pts) : setDraft(pts);
    }
    if (POLIGONI.includes(tool)) {
      if (draft.length >= 3 && dist(q, draft[0]) * view.k < 10) return chiudi(draft);
      const ultimo = draft[draft.length - 1];
      if (ultimo && dist(q, ultimo) * view.k < 3) return;
      setDraft([...draft, q]);
    }
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    down.current = { sx: e.clientX, sy: e.clientY, moved: 0, button: e.button };
    if (tool === "pan" || e.button === 1 || e.button === 2) {
      pan.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    }
  };

  const onPointerMove = (e) => {
    if (down.current) down.current.moved = Math.max(down.current.moved, Math.hypot(e.clientX - down.current.sx, e.clientY - down.current.sy));
    if (pan.current) {
      setView((v) => ({ ...v, x: pan.current.vx + e.clientX - pan.current.sx, y: pan.current.vy + e.clientY - pan.current.sy }));
      return;
    }
    const p = mondo(e);
    if (drag) setDrag((d) => ({ ...d, pts: d.pts.map((q, i) => (i === d.idx ? aggancia(p) : q)) }));
    else setCursor(aggancia(p));
  };

  const onPointerUp = (e) => {
    const d = down.current;
    down.current = null;
    if (pan.current) { pan.current = null; return; }
    if (drag) { onMovePoints(drag.id, drag.pts); setDrag(null); return; }
    if (d && d.moved < 4 && d.button === 0) clic(mondo(e));
  };

  const iniziaTrascinamento = (m, idx) => setDrag({ id: m.id, idx, pts: m.points.map((q) => [...q]) });

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "Escape") setDraft([]);
      if (e.key === "Enter" && POLIGONI.includes(tool) && draft.length >= 3) chiudi(draft);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, draft, chiudi]);

  const anteprima = cursor && draft.length ? [...draft, cursor] : draft;
  const cursoreCss = tool === "pan" ? "grab" : tool === "select" ? "default" : "crosshair";

  return (
    <div className="relative flex-1 min-h-0 bg-slate-200 overflow-hidden">
      <svg ref={ref} className="w-full h-full touch-none select-none" style={{ cursor: cursoreCss }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onDoubleClick={() => { if (POLIGONI.includes(tool) && draft.length >= 3) chiudi(draft); }}>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {imageUrl && <image href={imageUrl} width={width} height={height} />}
          {measurements.map((m) => (
            <MisureShape key={m.id} m={m} k={view.k} selected={m.id === selectedId}
              pts={drag?.id === m.id ? drag.pts : m.points} interactive={tool === "select"}
              onSelect={onSelect} onHandleDown={(i) => iniziaTrascinamento(m, i)} />
          ))}
          {anteprima.length > 0 && (
            <g>
              <polyline points={anteprima.map((p) => p.join(",")).join(" ")} fill="none"
                stroke={tool === "calibrate" ? "#0ea5e9" : "#ef4444"} strokeWidth={2}
                strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
              {draft.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={4 / view.k} fill="white" stroke="#ef4444"
                  strokeWidth={2} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          )}
        </g>
      </svg>
      <button type="button" onClick={adatta}
        className="absolute bottom-3 right-3 bg-white/90 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-600 hover:bg-white shadow-sm">
        Adatta
      </button>
      {tool !== "select" && tool !== "pan" && TIPI[tool] && POLIGONI.includes(tool) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-xs rounded-full px-3 py-1">
          Clic per i vertici · doppio clic o Invio per chiudere · Esc annulla
        </div>
      )}
    </div>
  );
}