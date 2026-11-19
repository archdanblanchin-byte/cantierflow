import React, { useState } from 'react';
import { Camera, Plus, Trash2, FileText, Loader2, X, ChevronLeft, ChevronRight, Check, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import jsPDF from 'jspdf';

// Chiama l'AI per ritagliare e raddrizzare il documento
// Restituisce un data URL dell'immagine elaborata
async function elaboraFoglioAI(dataUrl) {
  // 1. Carica l'immagine originale su storage
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], 'scan.jpg', { type: blob.type });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  // 2. Chiedi all'AI i 4 angoli del foglio come percentuali (0-1): le percentuali
  //    sono più robuste dei pixel assoluti. La richiesta all'AI (gemini_3_flash con
  //    immagine) è eseguita dalla funzione backend 'sopraluogoAI', azione 'bordi_foglio'.
  const res = await base44.functions.invoke('sopraluogoAI', { action: 'bordi_foglio', file_url });
  const result = res.data;

  if (!result?.trovato || !result?.topLeft) return dataUrl;

  // 3. Raddrizza la prospettiva localmente usando le percentuali
  return await raddrizzaPerspective(dataUrl, result);
}

async function raddrizzaPerspective(dataUrl, corners) {
  const img = await new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.src = dataUrl;
  });

  const W = img.naturalWidth;
  const H = img.naturalHeight;

  // Converti percentuali in pixel
  const tl = { x: corners.topLeft.x * W,     y: corners.topLeft.y * H };
  const tr = { x: corners.topRight.x * W,    y: corners.topRight.y * H };
  const bl = { x: corners.bottomLeft.x * W,  y: corners.bottomLeft.y * H };
  const br = { x: corners.bottomRight.x * W, y: corners.bottomRight.y * H };

  // Calcola dimensioni output
  const topW    = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bottomW = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH   = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightH  = Math.hypot(br.x - tr.x, br.y - tr.y);
  const outW = Math.round(Math.max(topW, bottomW));
  const outH = Math.round(Math.max(leftH, rightH));

  if (outW < 50 || outH < 50) return dataUrl;

  // Leggi i pixel sorgente
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = W; srcCanvas.height = H;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, W, H).data;

  // Canvas output
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW; outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  const outImg = outCtx.createImageData(outW, outH);

  // Trasformazione bilineare inversa
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const u = ox / (outW - 1);
      const v = oy / (outH - 1);
      // Interpolazione bilineare dei 4 angoli sorgente
      const sx = Math.round((1-u)*(1-v)*tl.x + u*(1-v)*tr.x + (1-u)*v*bl.x + u*v*br.x);
      const sy = Math.round((1-u)*(1-v)*tl.y + u*(1-v)*tr.y + (1-u)*v*bl.y + u*v*br.y);
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
      const si = (sy * W + sx) * 4;
      const di = (oy * outW + ox) * 4;
      outImg.data[di]   = srcData[si];
      outImg.data[di+1] = srcData[si+1];
      outImg.data[di+2] = srcData[si+2];
      outImg.data[di+3] = srcData[si+3];
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return outCanvas.toDataURL('image/jpeg', 0.93);
}

export default function ScansionePDF({ onComplete, onCancel }) {
  const [pagine, setPagine] = useState([]);
  const [creandoPdf, setCreandoPdf] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const aggiungiPagina = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = '';

    for (const file of files) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });

      const id = Math.random().toString(36).slice(2, 9);
      setPagine((prev) => [...prev, { id, dataUrl, elaborando: true }]);

      elaboraFoglioAI(dataUrl)
        .then((elaborato) => {
          setPagine((prev) =>
            prev.map((p) => p.id === id ? { ...p, dataUrl: elaborato, elaborando: false } : p)
          );
        })
        .catch(() => {
          setPagine((prev) =>
            prev.map((p) => p.id === id ? { ...p, elaborando: false } : p)
          );
        });
    }
  };

  const rimuoviPagina = (id) => setPagine((prev) => prev.filter((p) => p.id !== id));

  const spostaSu = (index) => {
    if (index === 0) return;
    setPagine((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const spostaGiu = (index) => {
    if (index === pagine.length - 1) return;
    setPagine((prev) => {
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  const creaePdf = async () => {
    if (!pagine.length) return;
    setCreandoPdf(true);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let i = 0; i < pagine.length; i++) {
      const { dataUrl } = pagine[i];
      if (i > 0) doc.addPage();

      const img = await new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = dataUrl;
      });

      const pageW = 210, pageH = 297, margin = 8;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const w = img.naturalWidth * ratio;
      const h = img.naturalHeight * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      const ext = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(dataUrl, ext, x, y, w, h);
    }

    const blob = doc.output('blob');
    const file = new File([blob], `scansione_${Date.now()}.pdf`, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setCreandoPdf(false);
    onComplete({ url: file_url, nome: file.name, size: blob.size });
  };

  const tutteElaborate = pagine.every((p) => !p.elaborando);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-4 sm:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Scan className="w-4 h-4 text-blue-600" /> Scansione documento AI
            </h2>
            <p className="text-xs text-muted-foreground">
              {pagine.length} {pagine.length === 1 ? 'pagina' : 'pagine'}
              {!tutteElaborate && ' · riconoscimento in corso...'}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex items-start gap-2 flex-shrink-0">
          <Scan className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Scatta la foto, l'AI individua il foglio, lo ritaglia e lo raddrizza automaticamente.</span>
        </div>

        {/* Lista pagine */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {pagine.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="text-sm font-medium">Nessuna pagina ancora</p>
              <p className="text-xs mt-1">Scatta una foto al documento da scansionare</p>
            </div>
          )}

          {pagine.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 bg-muted/40 rounded-xl p-2">
              <button
                type="button"
                onClick={() => !p.elaborando && setLightbox(p.dataUrl)}
                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-border relative"
              >
                <img src={p.dataUrl} alt="" className={`w-full h-full object-cover ${p.elaborando ? 'opacity-40' : ''}`} />
                {p.elaborando && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 gap-1">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span className="text-white text-[9px] font-medium">AI...</span>
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Pagina {i + 1}</p>
                <p className="text-xs text-muted-foreground">
                  {p.elaborando ? '🔍 Riconoscimento foglio in corso...' : '✅ Foglio ritagliato'}
                </p>
              </div>
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => spostaSu(i)} disabled={i === 0}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30">
                  <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                </button>
                <button type="button" onClick={() => spostaGiu(i)} disabled={i === pagine.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30">
                  <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
                </button>
              </div>
              <button type="button" onClick={() => rimuoviPagina(p.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer sempre visibile */}
        <div className="flex-shrink-0 p-4 border-t border-border space-y-2 bg-background">
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-sm text-muted-foreground font-medium">
              <Camera className="w-4 h-4" /> Fotocamera
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={aggiungiPagina} />
            </label>
            <label className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-sm text-muted-foreground font-medium">
              <Plus className="w-4 h-4" /> Galleria
              <input type="file" accept="image/*" multiple className="hidden" onChange={aggiungiPagina} />
            </label>
          </div>
          <Button
            type="button"
            className="w-full gap-2 h-12 text-base"
            disabled={pagine.length === 0 || creandoPdf || !tutteElaborate}
            onClick={creaePdf}
          >
            {creandoPdf
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creazione PDF...</>
              : !tutteElaborate
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Attendi riconoscimento AI...</>
              : <><Check className="w-4 h-4" /> Salva PDF ({pagine.length} {pagine.length === 1 ? 'pagina' : 'pagine'})</>
            }
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="w-7 h-7" />
          </button>
        </div>
      )}
    </>
  );
}