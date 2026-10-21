import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eraser, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { caricaFilePrivato } from "@/lib/allegati";

const COLORI = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#f59e0b"];
const SPESSORI = [2, 4, 8];

/**
 * Disegno a mano libera su tela, salvato come immagine privata della nota.
 */
export default function DisegnoEditor({ open, onOpenChange, onSaved }) {
  const canvasRef = useRef(null);
  const disegnando = useRef(false);
  const [colore, setColore] = useState(COLORI[0]);
  const [spessore, setSpessore] = useState(SPESSORI[1]);
  const [saving, setSaving] = useState(false);

  const prepara = () => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || 320;
    const h = c.clientHeight || 240;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(prepara);
    return () => cancelAnimationFrame(id);
  }, [open]);

  const punto = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const inizia = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    const p = punto(e);
    disegnando.current = true;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.strokeStyle = colore;
    ctx.lineWidth = spessore;
  };

  const muovi = (e) => {
    if (!disegnando.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const p = punto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const fine = () => { disegnando.current = false; };

  const pulisci = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.clientWidth, c.clientHeight);
  };

  const salva = () => {
    const c = canvasRef.current;
    if (!c) return;
    setSaving(true);
    c.toBlob(async (blob) => {
      try {
        if (!blob) throw new Error("Disegno non disponibile");
        const file = new File([blob], "disegno.png", { type: "image/png" });
        const file_uri = await caricaFilePrivato(file);
        onSaved?.(file_uri);
        toast.success("Disegno salvato");
        onOpenChange(false);
      } catch (e) {
        toast.error("Errore: " + e.message);
      } finally {
        setSaving(false);
      }
    }, "image/png");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Disegna</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          {COLORI.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColore(c)}
              aria-label={`Colore ${c}`}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${colore === c ? "border-foreground scale-110" : "border-border"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            {SPESSORI.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpessore(s)}
                aria-label={`Spessore ${s}`}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${spessore === s ? "border-foreground bg-accent" : "border-border"}`}
              >
                <span className="rounded-full bg-foreground" style={{ width: s + 2, height: s + 2 }} />
              </button>
            ))}
            <Button variant="ghost" size="icon" onClick={pulisci} aria-label="Pulisci">
              <Eraser className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={inizia}
          onPointerMove={muovi}
          onPointerUp={fine}
          onPointerLeave={fine}
          className="w-full h-64 rounded-xl border border-border bg-white touch-none"
          style={{ touchAction: "none" }}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={salva} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva disegno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}