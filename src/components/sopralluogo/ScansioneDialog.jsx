import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ArrowDown, ArrowUp, Camera, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { caricaFotoPrivata } from "@/lib/fotoCantiere";
import { newId, sposta } from "@/lib/sopralluogo";

const MAX = 1600;

function leggi(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => reject(new Error("Immagine non leggibile"));
    img.src = url;
  });
}

// Ritaglia sul rettangolo trovato dall'AI (se plausibile) e riduce la dimensione.
async function render(file, box) {
  const { img, url } = await leggi(file);
  const ok = box && box.x1 - box.x0 > 0.3 && box.y1 - box.y0 > 0.3 && box.x0 >= 0 && box.y0 >= 0 && box.x1 <= 1.01 && box.y1 <= 1.01;
  const sx = ok ? box.x0 * img.naturalWidth : 0;
  const sy = ok ? box.y0 * img.naturalHeight : 0;
  const sw = ok ? (box.x1 - box.x0) * img.naturalWidth : img.naturalWidth;
  const sh = ok ? (box.y1 - box.y0) * img.naturalHeight : img.naturalHeight;
  const k = Math.min(1, MAX / Math.max(sw, sh));
  const c = document.createElement("canvas");
  c.width = Math.round(sw * k);
  c.height = Math.round(sh * k);
  c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return { dataUrl: c.toDataURL("image/jpeg", 0.85), w: c.width, h: c.height, ritagliata: !!ok };
}

// Scansione multipagina: ogni pagina viene elaborata (bordi trovati con AI, altrimenti originale)
// e il PDF si può salvare solo a elaborazione terminata.
export default function ScansioneDialog({ open, onClose, onSalvato }) {
  const [pagine, setPagine] = useState([]);
  const [salvataggio, setSalvataggio] = useState(false);
  const cam = useRef(null);
  const gal = useRef(null);

  const patch = (id, dati) => setPagine((p) => p.map((x) => (x.id === id ? { ...x, ...dati } : x)));

  const elaboraPagina = async (id, file) => {
    let box = null;
    try {
      const uri = await caricaFotoPrivata(file);
      const res = await base44.functions.invoke("sopralluogo_ai", { action: "bordi", image_uri: uri });
      box = res.data?.box || null;
    } catch {
      box = null;
    }
    try {
      const r = await render(file, box);
      patch(id, { stato: r.ritagliata ? "ritagliata" : "originale", ...r });
    } catch {
      patch(id, { stato: "errore" });
    }
  };

  const aggiungi = (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    const nuove = files.map((f) => ({ id: newId(), stato: "elaborazione", file: f, dataUrl: "" }));
    setPagine((p) => [...p, ...nuove]);
    nuove.forEach((n) => elaboraPagina(n.id, n.file));
  };

  const inElaborazione = pagine.some((p) => p.stato === "elaborazione");
  const valide = pagine.filter((p) => p.dataUrl);

  const salva = async () => {
    setSalvataggio(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      valide.forEach((p, i) => {
        if (i > 0) doc.addPage();
        const k = Math.min(190 / p.w, 277 / p.h);
        doc.addImage(p.dataUrl, "JPEG", (210 - p.w * k) / 2, (297 - p.h * k) / 2, p.w * k, p.h * k);
      });
      const nome = `Scansione ${new Date().toLocaleDateString("it-IT")}.pdf`;
      const file_uri = await caricaFotoPrivata(new File([doc.output("blob")], nome, { type: "application/pdf" }));
      onSalvato({ nome, file_uri, tipo: "scansione" });
      setPagine([]);
      onClose();
    } catch {
      toast.error("Generazione del PDF non riuscita");
    } finally {
      setSalvataggio(false);
    }
  };

  const etichetta = { elaborazione: "Elaborazione...", ritagliata: "Bordi rilevati", originale: "Originale (bordi non rilevati)", errore: "Errore" };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !salvataggio && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-auto">
        <DialogTitle>Scansione documento</DialogTitle>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={() => cam.current?.click()}><Camera className="w-4 h-4" />Fotocamera</Button>
          <Button type="button" variant="outline" className="flex-1 gap-1.5" onClick={() => gal.current?.click()}><ImagePlus className="w-4 h-4" />Galleria</Button>
        </div>
        <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={aggiungi} />
        <input ref={gal} type="file" accept="image/*" multiple className="hidden" onChange={aggiungi} />

        {pagine.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aggiungi una o più pagine da scansionare.</p>
        ) : (
          <ul className="space-y-2">
            {pagine.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border rounded-lg p-2">
                <div className="w-16 h-20 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
                  {p.dataUrl ? <img src={p.dataUrl} alt="" className="w-full h-full object-contain" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium">Pagina {i + 1}</p>
                  <p className="text-xs text-muted-foreground">{etichetta[p.stato]}</p>
                </div>
                <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => setPagine(sposta(pagine, i, -1))}><ArrowUp className="w-4 h-4" /></Button>
                <Button type="button" size="icon" variant="ghost" disabled={i === pagine.length - 1} onClick={() => setPagine(sposta(pagine, i, 1))}><ArrowDown className="w-4 h-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => setPagine(pagine.filter((x) => x.id !== p.id))}><X className="w-4 h-4" /></Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">I bordi vengono rilevati dall'AI e la pagina è ritagliata sul foglio (senza correzione di prospettiva). Se il rilevamento non riesce si usa l'immagine originale.</p>
        <Button type="button" disabled={inElaborazione || salvataggio || valide.length === 0} onClick={salva} className="w-full gap-2">
          {(inElaborazione || salvataggio) && <Loader2 className="w-4 h-4 animate-spin" />}
          {inElaborazione ? "Elaborazione pagine..." : "Salva PDF"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}