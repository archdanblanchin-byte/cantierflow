import React from "react";
import { TIPI, valoreMisura, nomeMisura } from "@/lib/misure";

const centro = (pts) => [
  pts.reduce((a, p) => a + p[0], 0) / pts.length,
  pts.reduce((a, p) => a + p[1], 0) / pts.length,
];

function Etichetta({ x, y, testo, fs, color }) {
  if (!testo) return null;
  return (
    <text x={x} y={y} fontSize={fs} textAnchor="middle" fill={color} stroke="white" strokeWidth={3}
      paintOrder="stroke" fontWeight={600} vectorEffect="non-scaling-stroke" pointerEvents="none">
      {testo}
    </text>
  );
}

// Una misurazione disegnata sull'immagine (coordinate in pixel dell'immagine).
export default function MisureShape({ m, pts, selected, k, interactive, onSelect, onHandleDown }) {
  const color = m.color || "#ef4444";
  const sw = m.stroke_width || 3;
  const fs = 13 / k;
  const chiuso = TIPI[m.type]?.chiuso;
  const str = pts.map((p) => p.join(",")).join(" ");
  const c = pts.length ? centro(pts) : [0, 0];
  const base = { stroke: color, strokeWidth: sw, vectorEffect: "non-scaling-stroke", strokeLinejoin: "round", fill: "none" };
  const hit = { stroke: "transparent", strokeWidth: 14, vectorEffect: "non-scaling-stroke", fill: "none", pointerEvents: interactive ? "stroke" : "none" };
  const click = interactive ? { onClick: (e) => { e.stopPropagation(); onSelect(m.id); } } : {};

  let testo = valoreMisura(m);
  if (m.type === "room" || m.type === "area") testo = `${m.room_name || m.label || ""} ${testo}`.trim();
  else if (m.label && m.type !== "text") testo = `${m.label} ${testo}`.trim();

  return (
    <g>
      {m.type === "text" ? (
        <g {...click} style={{ cursor: interactive ? "pointer" : "default" }}>
          <Etichetta x={pts[0][0]} y={pts[0][1]} testo={m.text} fs={fs * 1.2} color={color} />
          {interactive && <circle cx={pts[0][0]} cy={pts[0][1]} r={10 / k} fill="transparent" />}
        </g>
      ) : chiuso ? (
        <>
          <polygon points={str} {...base} fill={m.type === "perimeter" ? "none" : color}
            fillOpacity={m.opacity ?? 0.35} pointerEvents={interactive ? "all" : "none"} {...click} />
        </>
      ) : (
        <>
          <polyline points={str} {...base} />
          <polyline points={str} {...hit} {...click} />
          {m.type === "quota" && pts.length === 2 && <Tacche a={pts[0]} b={pts[1]} k={k} color={color} sw={sw} />}
        </>
      )}
      {m.type !== "text" && pts.length > 1 && (
        <Etichetta x={c[0]} y={c[1] - 6 / k} testo={testo} fs={fs} color={color} />
      )}
      {selected && pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={6 / k} fill="white" stroke={color} strokeWidth={2}
          vectorEffect="non-scaling-stroke" style={{ cursor: "move" }}
          onPointerDown={(e) => { e.stopPropagation(); onHandleDown(i, e); }} />
      ))}
    </g>
  );
}

function Tacche({ a, b, k, color, sw }) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * (8 / k), ny = (dx / l) * (8 / k);
  return [a, b].map((p, i) => (
    <line key={i} x1={p[0] - nx} y1={p[1] - ny} x2={p[0] + nx} y2={p[1] + ny}
      stroke={color} strokeWidth={sw} vectorEffect="non-scaling-stroke" />
  ));
}

export { nomeMisura };