# Componenti integri (parte 1)

Codice completo dei componenti Foto + Anagrafe Furgoni.

## src/components/foto/AggiungiFotoModal.jsx

```jsx
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Upload, Camera, Palette, Loader2, ArrowRight, Edit3 } from "lucide-react";
import FotoEditor from "./FotoEditor";

export default function AggiungiFotoModal({ open, onClose, cantieri = [], onSaved }) {
  const [step, setStep] = useState("upload"); // upload | annotate | done
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("foto");
  const [imageUrl, setImageUrl] = useState("");
  const [colore, setColore] = useState("#ef4444");
  const [nota, setNota] = useState("");
  const [cantiereId, setCantiereId] = useState("");
  const [annotazioni, setAnnotazioni] = useState([]);
  const [urlAnnotata, setUrlAnnotata] = useState("");

  const reset = () => {
    setStep("upload");
    setImageUrl("");
    setNota("");
    setColore("#ef4444");
    setAnnotazioni([]);
    setUrlAnnotata("");
    setTipo("foto");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const handleSaveAnnotations = ({ annotazioni: ann, url_annotata }) => {
    setAnnotazioni(ann);
    setUrlAnnotata(url_annotata);
    setStep("upload");
  };

  const handleSave = async () => {
    if (!cantiereId) return;
    setSaving(true);
    let finalUrl = imageUrl;
    if (urlAnnotata && tipo === "foto") {
      const blob = await (await fetch(urlAnnotata)).blob();
      const file = new File([blob], "annotata.jpg", { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      finalUrl = file_url;
    }
    const cantiere = cantieri.find((c) => c.id === cantiereId);
    const payload = {
      url: imageUrl || colore,
      url_annotata: finalUrl !== imageUrl ? finalUrl : undefined,
      nota,
      cantiere_id: cantiereId,
      cantiere_nome: cantiere?.nome || "",
      annotazioni,
      tipo,
      colore: tipo === "codice_colore" ? colore : undefined,
    };
    await base44.entities.Foto.create(payload);
    setSaving(false);
    onSaved?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "annotate" ? (
          <FotoEditor
            imageUrl={imageUrl}
            annotazioni={annotazioni}
            onSave={handleSaveAnnotations}
            onCancel={() => setStep("upload")}
          />
        ) : (
          <div className="space-y-5 p-1">
            <h2 className="text-lg font-bold">Aggiungi Foto</h2>

            {/* Cantiere */}
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere *</Label>
              <Select value={cantiereId} onValueChange={setCantiereId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Seleziona cantiere..." /></SelectTrigger>
                <SelectContent>
                  {cantieri.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTipo("foto")} className={`rounded-xl border-2 p-4 text-left transition-colors ${tipo === "foto" ? "border-primary bg-primary/5" : "border-border"}`}>
                <Camera className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-semibold">Foto / Immagine</p>
                <p className="text-xs text-muted-foreground mt-0.5">Scatta o carica dalla galleria</p>
              </button>
              <button onClick={() => setTipo("codice_colore")} className={`rounded-xl border-2 p-4 text-left transition-colors ${tipo === "codice_colore" ? "border-primary bg-primary/5" : "border-border"}`}>
                <Palette className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-semibold">Codice Colore</p>
                <p className="text-xs text-muted-foreground mt-0.5">Registra un colore campione</p>
              </button>
            </div>

            {/* Foto upload */}
            {tipo === "foto" && (
              <div className="space-y-3">
                {imageUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img src={urlAnnotata || imageUrl} alt="" className="w-full max-h-56 object-contain bg-black" />
                      {annotazioni.length > 0 && (<div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">{annotazioni.length} annotazioni</div>)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep("annotate")}>
                        <Edit3 className="w-3.5 h-3.5" />{annotazioni.length > 0 ? "Modifica annotazioni" : "Aggiungi annotazioni"}
                      </Button>
                      <label className="cursor-pointer">
                        <Button variant="ghost" size="sm" asChild>
                          <span className="gap-1.5"><Upload className="w-3.5 h-3.5" />Cambia foto</span>
                        </Button>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-6 flex flex-col items-center gap-2 transition-colors">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground text-center">Scatta foto</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-6 flex flex-col items-center gap-2 transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground text-center">Carica da galleria</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                )}
                {uploading && (<div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento...</div>)}
              </div>
            )}

            {/* Codice colore */}
            {tipo === "codice_colore" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Seleziona colore</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input type="color" value={colore} onChange={(e) => setColore(e.target.value)} className="w-16 h-16 rounded-xl border border-border cursor-pointer" />
                    <div>
                      <p className="font-mono text-sm font-bold">{colore.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">Codice HEX</p>
                    </div>
                    <div className="w-16 h-16 rounded-xl border border-border" style={{ background: colore }} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Foto di riferimento (opzionale)</Label>
                  {imageUrl ? (
                    <div className="space-y-2 mt-2">
                      <div className="relative rounded-xl overflow-hidden border border-border">
                        <img src={urlAnnotata || imageUrl} alt="" className="w-full max-h-48 object-contain bg-black" />
                        {annotazioni.length > 0 && (<div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">{annotazioni.length} annotazioni</div>)}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep("annotate")}>
                          <Edit3 className="w-3.5 h-3.5" />{annotazioni.length > 0 ? "Modifica annotazioni" : "Aggiungi annotazioni"}
                        </Button>
                        <label className="cursor-pointer">
                          <Button variant="ghost" size="sm" asChild>
                            <span className="gap-1.5"><Upload className="w-3.5 h-3.5" />Cambia foto</span>
                          </Button>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-4 flex flex-col items-center gap-2 transition-colors">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">Scatta foto</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                      </label>
                      <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-4 flex flex-col items-center gap-2 transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">Carica da galleria</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )}
                  {uploading && (<div className="flex items-center gap-2 text-sm text-muted-foreground mt-2"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento...</div>)}
                </div>
              </div>
            )}

            {/* Nota */}
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nota / Descrizione</Label>
              <Textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Aggiungi una nota a questa foto..." className="mt-1.5 min-h-[70px]" />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClose}>Annulla</Button>
              <Button onClick={handleSave} disabled={saving || !cantiereId || (tipo === "foto" && !imageUrl)} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}Salva
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

## src/components/foto/FotoEditor.jsx

```jsx
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MousePointer, Minus, ArrowRight, Circle, Square, Type, Ruler, Trash2, Check, Undo } from "lucide-react";
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
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => { if (!imgLoaded) return; redraw(); }, [imgLoaded, shapes, currentShape]);

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
    if (s.type === "line") { ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); }
    else if (s.type === "arrow") { drawArrow(ctx, s.x1, s.y1, s.x2, s.y2, s.color, s.lineWidth); }
    else if (s.type === "circle") {
      const rx = Math.abs(s.x2 - s.x1) / 2;
      const ry = Math.abs(s.y2 - s.y1) / 2;
      ctx.beginPath();
      ctx.ellipse(s.x1 + (s.x2 - s.x1) / 2, s.y1 + (s.y2 - s.y1) / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (s.type === "rect") { ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1); }
    else if (s.type === "text" || s.type === "measure") { ctx.fillText(s.text, s.x, s.y); }
  };

  const drawArrow = (ctx, x1, y1, x2, y2, color, lw) => {
    const headlen = 15 + lw * 2;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill();
  };

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = e.touches?.[0] || e;
    return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
  };

  const onMouseDown = (e) => {
    const pos = getPos(e);
    if (tool === "text" || tool === "measure") { setTextPos(pos); return; }
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
      <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/50 rounded-xl border border-border">
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label} className={cn("p-2 rounded-lg transition-colors", tool === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            <t.icon className="w-4 h-4" />
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        {COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} style={{ background: c }} className={cn("w-6 h-6 rounded-full border-2 transition-transform", color === c ? "border-primary scale-125" : "border-border")} />
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={undo} className="p-2 rounded-lg hover:bg-muted" title="Annulla"><Undo className="w-4 h-4" /></button>
        <button onClick={() => setShapes([])} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title="Cancella tutto"><Trash2 className="w-4 h-4" /></button>
      </div>

      {(tool === "text" || tool === "measure") && textPos && (
        <div className="flex gap-2 items-center bg-card border border-border rounded-xl p-2">
          <Input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={tool === "measure" ? "Es. 120 cm" : "Testo..."} className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && addText()} autoFocus />
          <Button size="sm" onClick={addText}><Check className="w-4 h-4" /></Button>
        </div>
      )}
      {(tool === "text" || tool === "measure") && !textPos && (
        <p className="text-xs text-muted-foreground text-center">Tocca la foto per posizionare {tool === "measure" ? "la misura" : "il testo"}</p>
      )}

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

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button onClick={handleSave} className="gap-2"><Check className="w-4 h-4" />Salva annotazioni</Button>
      </div>
    </div>
  );
}
```

## src/components/anagrafe/FurgoniPage.jsx

```jsx
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePermessi } from "@/hooks/usePermessi";
import { useAuth } from "@/lib/AuthContext";
import moment from "moment";
import { Plus, Pencil, Trash2, Check, X, ChevronRight, AlertTriangle, Info, Bell } from "lucide-react";

const FURGONE_FIELDS = [
  { key: "nome", label: "Nome", required: true, type: "text" },
  { key: "targa", label: "Targa", type: "text" },
  { key: "marca_modello", label: "Marca / Modello", type: "text" },
  { key: "assicurazione_scadenza", label: "Scadenza assicurazione", type: "date" },
  { key: "revisione_scadenza", label: "Scadenza revisione / collaudo", type: "date" },
  { key: "ultima_manutenzione", label: "Ultima manutenzione", type: "date" },
  { key: "km", label: "Chilometri", type: "number" },
  { key: "note", label: "Note generali", type: "text" },
];

const TIPI_NOTA = {
  nota: { icon: Info, classes: "bg-blue-50 text-blue-700 border-blue-200", label: "Nota" },
  problema: { icon: AlertTriangle, classes: "bg-red-50 text-red-700 border-red-200", label: "Problema" },
  avviso: { icon: Bell, classes: "bg-amber-50 text-amber-700 border-amber-200", label: "Avviso" },
};

function renderValore(field, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "date") return moment(value).format("DD/MM/YYYY");
  if (field.type === "number") return Number(value).toLocaleString("it-IT");
  return value;
}

function FurgoneForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      {FURGONE_FIELDS.map(f => (
        <div key={f.key}>
          <Label className="text-xs text-muted-foreground">{f.label}{f.required ? " *" : ""}</Label>
          <Input
            type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
            inputMode={f.type === "number" ? "decimal" : undefined}
            value={form[f.key] ?? ""}
            onChange={e => setForm(prev => ({
              ...prev,
              [f.key]: f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
            }))}
            className="mt-1 h-9 text-sm"
          />
        </div>
      ))}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.nome}><Check className="w-3.5 h-3.5 mr-1" /> Salva</Button>
      </div>
    </div>
  );
}

function FurgoneNotes({ furgone }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [testo, setTesto] = useState("");
  const [tipo, setTipo] = useState("nota");
  const [invio, setInvio] = useState(false);

  const { data: note = [] } = useQuery({
    queryKey: ["note-furgone", furgone.id],
    queryFn: () => base44.entities.NotaFurgone.filter({ furgone_id: furgone.id }, "-created_date", 200),
  });

  useEffect(() => {
    const unsubscribe = base44.entities.NotaFurgone.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["note-furgone", furgone.id] });
    });
    return unsubscribe;
  }, [furgone.id, queryClient]);

  const handleAdd = async () => {
    if (!testo.trim()) return;
    setInvio(true);
    try {
      await base44.entities.NotaFurgone.create({
        furgone_id: furgone.id,
        furgone_nome: furgone.nome,
        testo: testo.trim(),
        tipo,
        autore_nome: user?.full_name || "Anonimo",
        autore_email: user?.email || "",
      });
      setTesto("");
      setTipo("nota");
    } finally {
      setInvio(false);
    }
  };

  const sorted = [...note].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Bell className="w-4 h-4" /> Note e segnalazioni</h4>
      <div className="space-y-2 mb-3 max-h-56 overflow-y-auto pr-1">
        {sorted.length === 0 && (<p className="text-xs text-muted-foreground">Nessuna nota. Aggiungi la prima segnalazione.</p>)}
        {sorted.map(n => {
          const T = TIPI_NOTA[n.tipo] || TIPI_NOTA.nota;
          const Icon = T.icon;
          return (
            <div key={n.id} className={`rounded-lg border px-3 py-2 ${T.classes}`}>
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{n.testo}</p>
                  <p className="text-xs opacity-70 mt-1">{n.autore_nome || "Anonimo"} · {moment(n.created_date).format("DD/MM/YYYY HH:mm")}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <Textarea value={testo} onChange={e => setTesto(e.target.value)} placeholder="Aggiungi una nota o segnala un problema..." className="text-sm" rows={2} />
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(TIPI_NOTA).map(([k, v]) => (
            <button key={k} type="button" onClick={() => setTipo(k)} className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${tipo === k ? `${v.classes} font-semibold` : "bg-muted text-muted-foreground border-border"}`}>{v.label}</button>
          ))}
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!testo.trim() || invio}><Plus className="w-4 h-4 mr-1" /> Aggiungi</Button>
      </div>
    </div>
  );
}

export default function FurgoniPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermessi();
  const [adding, setAdding] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editInDetail, setEditInDetail] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["anagrafe", "Furgone"],
    queryFn: () => base44.entities.Furgone.list(),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["anagrafe", "Furgone"] });

  const handleCreate = async (form) => { await base44.entities.Furgone.create({ ...form, attivo: true }); setAdding(false); refresh(); };
  const handleUpdate = async (id, form) => { await base44.entities.Furgone.update(id, form); setEditInDetail(false); setDetailItem(null); refresh(); };
  const handleDelete = async (id) => { await base44.entities.Furgone.delete(id); setDetailItem(null); refresh(); };

  if (isLoading) return (<div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>);

  return (
    <div className="space-y-3">
      {items.map(item => (
        <button key={item.id} onClick={() => { setDetailItem(item); setEditInDetail(false); }} className="flex items-center justify-between w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent transition-colors">
          <div>
            <p className="text-sm font-medium">{item.nome || "—"}</p>
            {item.targa && (<p className="text-xs text-muted-foreground mt-0.5">{item.targa}{item.marca_modello ? ` · ${item.marca_modello}` : ""}</p>)}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}
      {items.length === 0 && !adding && (<div className="text-center py-10 text-muted-foreground text-sm">Nessun furgone. Aggiungi il primo!</div>)}
      {adding ? <FurgoneForm onSave={handleCreate} onCancel={() => setAdding(false)} /> : <Button variant="outline" className="w-full gap-2" onClick={() => setAdding(true)}><Plus className="w-4 h-4" /> Aggiungi furgone</Button>}
      <Dialog open={!!detailItem} onOpenChange={(v) => { if (!v) { setDetailItem(null); setEditInDetail(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detailItem ? detailItem.nome : "Furgone"}</DialogTitle></DialogHeader>
          {detailItem && (editInDetail ? (
            <FurgoneForm initial={detailItem} onSave={(form) => handleUpdate(detailItem.id, form)} onCancel={() => setEditInDetail(false)} />
          ) : (
            <>
              <div className="space-y-2 py-1">
                {FURGONE_FIELDS.map(f => (
                  <div key={f.key} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
                    <span className="text-xs text-muted-foreground shrink-0">{f.label}</span>
                    <span className="text-sm font-medium text-right break-words">{renderValore(f, detailItem[f.key])}</span>
                  </div>
                ))}
              </div>
              <FurgoneNotes furgone={detailItem} />
            </>
          ))}
          {!editInDetail && detailItem && (
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => setEditInDetail(true)}><Pencil className="w-4 h-4 mr-1" /> Modifica</Button>
              {isAdmin && (<Button variant="destructive" onClick={() => handleDelete(detailItem.id)}><Trash2 className="w-4 h-4 mr-1" /> Elimina</Button>)}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
``