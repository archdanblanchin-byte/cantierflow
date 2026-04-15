import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MousePointer, Minus, ArrowRight, Circle, Square,
  Type, Ruler, Trash2, Check, Undo
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [
  { id: "select", icon: MousePointer, label: "Seleziona" },
  { id: "line", icon: Minus, label: "Linea" },
  { id: "arrow", icon: ArrowRight, label: "Freccia" },
  { id: "circle", icon: Circle, label: "Cerchio" },
  { id: "rect", icon: Square, label: "Riquadro" },
  { id: "text", icon: Type, label: "Testo" },
  { id: "measure", icon: Ruler, label: "Misura" },
];

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#000000"];

export default function FotoEditor({ imageUrl, annotazioni: initialAnnotazioni = [], onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState("arrow");
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(3);
  const [shapes, setShapes] = useState(initialAnnotazioni);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (!imgLoaded) return;
    redraw();
  }, [imgLoaded, shapes, currentShape]);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    canvas.width = imgRef.current.naturalWidth;
    canvas.height = imgRef.current.naturalHeight;
    ctx.drawImage(imgRef.current, 0, 0);
    [...shapes, currentShape].filter(Boolean).forEach((s) => drawShape(ctx, s));
  };

  const drawShape = (ctx, s) => {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.lineWidth || 3;
    ctx.font = `${s.fontSize || 20}px sans-serif`;

    if (s.type === "line") {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    } else if (s.type === "arrow") {
      drawArrow(ctx, s.x1, s.y1, s.x2, s.y2, s.color, s.lineWidth);
    } else if (s.type === "circle") {
      const rx = Math.abs(s.x2 - s.x1) / 2;
      const ry = Math.abs(s.y2 - s.y1) / 2;
      ctx.beginPath();
      ctx.ellipse(s.x1 + (s.x2 - s.x1) / 2, s.y1 + (s.y2 - s.y1) / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === "rect") {
      ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
    } else if (s.type === "text" || s.type === "measure") {
      ctx.fillText(s.text, s.x, s.y);
    }
  };

  const drawArrow = (ctx, x1, y1, x2, y2, color, lw) => {
    const headlen = 15 + lw * 2;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = e.touches?.[0] || e;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const onMouseDown = (e) => {
    const pos = getPos(e);
    if (tool === "text" || tool === "measure") {
      setTextPos(pos);
      return;
    }
    setDrawing(true);
    setStartPos(pos);
  };

  const onMouseMove = (e) => {
    if (!drawing || !startPos) return;
    const pos = getPos(e);
    setCurrentShape({ type: tool, x1: startPos.x, y1: startPos.y, x2: pos.x, y2: pos.y, color, lineWidth });
  };

  const onMouseUp = (e) => {
    if (!drawing || !startPos) return;
    const pos = getPos(e);
    const newShape = { type: tool, x1: startPos.x, y1: startPos.y, x2: pos.x, y2: pos.y, color, lineWidth };
    setShapes((prev) => [...prev, newShape]);
    setDrawing(false);
    setStartPos(null);
    setCurrentShape(null);
  };

  const addText = () => {
    if (!textPos || !textInput.trim()) return;
    const label = tool === "measure" ? `${textInput} cm` : textInput;
    setShapes((prev) => [...prev, { type: tool, x: textPos.x, y: textPos.y, text: label, color, fontSize: 22, lineWidth }]);
    setTextInput("");
    setTextPos(null);
  };

  const undo = () => setShapes((prev) => prev.slice(0, -1));

  const handleSave = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onSave({ annotazioni: shapes, url_annotata: dataUrl });
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-xl border border-border">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            className={cn(
              "p-2 rounded-lg transition-colors",
              tool === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            <t.icon className="w-4 h-4" />
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{ background: c }}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-transform",
              color === c ? "border-primary scale-125" : "border-border"
            )}
          />
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={undo} className="p-2 rounded-lg hover:bg-muted" title="Annulla"><Undo className="w-4 h-4" /></button>
        <button onClick={() => setShapes([])} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title="Cancella tutto"><Trash2 className="w-4 h-4" /></button>
      </div>

      {/* Testo / Misura input */}
      {(tool === "text" || tool === "measure") && textPos && (
        <div className="flex gap-2 items-center bg-card border border-border rounded-xl p-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={tool === "measure" ? "Es. 120 cm" : "Testo..."}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && addText()}
            autoFocus
          />
          <Button size="sm" onClick={addText}><Check className="w-4 h-4" /></Button>
        </div>
      )}
      {(tool === "text" || tool === "measure") && !textPos && (
        <p className="text-xs text-muted-foreground text-center">Tocca la foto per posizionare {tool === "measure" ? "la misura" : "il testo"}</p>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-black flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[50vh] object-contain cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={(e) => { e.preventDefault(); onMouseDown(e); }}
          onTouchMove={(e) => { e.preventDefault(); onMouseMove(e); }}
          onTouchEnd={(e) => { e.preventDefault(); onMouseUp(e); }}
        />
      </div>

      {/* Azioni */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button onClick={handleSave} className="gap-2"><Check className="w-4 h-4" />Salva annotazioni</Button>
      </div>
    </div>
  );
}