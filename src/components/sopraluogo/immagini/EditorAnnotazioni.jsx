import React, { useRef, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ToolbarAnnotazioni from './annotazioni/ToolbarAnnotazioni';
import PannelloElemento from './annotazioni/PannelloElemento';
import {
  creaTesto, creaQuota, creaEvidenziatore, creaFigura, caricaColori, salvaColori,
  disegnaElementi, colpito, sposta, maniglie, applicaManiglia, normalizzaBox, segmentoVicino
} from './annotazioni/elementi';

const TOLLERANZA = 14;

const SUGGERIMENTI = {
  seleziona: 'Tocca un elemento per selezionarlo, trascinalo per spostarlo, usa i pallini per ridimensionarlo.',
  quota: 'Trascina da un punto all\'altro per disegnare una quota e scrivine la misura.',
  testo: 'Tocca il punto dell\'immagine dove vuoi la nota, poi scrivi il testo.',
  evidenzia: 'Trascina per evidenziare un\'area; un tocco semplice crea un punto.',
  figura: 'Traccia liberamente il contorno della zona da evidenziare.',
  pan: 'Trascina per spostare l\'immagine.'
};

/**
 * Lavagna di annotazione: quote, testi, evidenziatori e figure libere sopra l'immagine.
 * Al salvataggio tutto viene incorporato nell'immagine definitiva.
 */
export default function EditorAnnotazioni({ url, onSave, onClose }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const drag = useRef(null);
  const panStart = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [elementi, setElementi] = useState([]);
  const [bozza, setBozza] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [strumento, setStrumento] = useState('seleziona');
  const [colori, setColori] = useState(caricaColori);
  const [coloreAttivo, setColoreAttivo] = useState(0);
  const [opacita, setOpacita] = useState(0.35);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const colore = colori[coloreAttivo];
  const selezionato = elementi.find((e) => e.id === selectedId) || null;

  // Carica l'immagine e adatta il canvas (bande nere per coerenza mobile/PC)
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxW = Math.min(window.innerWidth - 32, 700);
      const maxH = Math.min(window.innerHeight * 0.6, 600);
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const imgW = img.width * scale;
      const imgH = img.height * scale;
      setCanvasSize({ w: maxW, h: maxH, imgW, imgH, offsetX: (maxW - imgW) / 2, offsetY: (maxH - imgH) / 2 });
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = url;
  }, [url]);

  // Ridisegna canvas
  useEffect(() => {
    if (!imgLoaded || !canvasSize.w) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(canvasSize.offsetX, canvasSize.offsetY);
    ctx.drawImage(imgRef.current, 0, 0, canvasSize.imgW, canvasSize.imgH);
    disegnaElementi(ctx, bozza ? [...elementi, bozza] : elementi, selectedId, 1 / zoom);
    ctx.restore();
  }, [imgLoaded, elementi, bozza, selectedId, canvasSize, zoom, pan]);

  const zoomTo = (delta, focusX, focusY) => {
    const nuovo = Math.min(6, Math.max(1, +(zoom + delta).toFixed(2)));
    if (nuovo === zoom) return;
    const fx = focusX ?? canvasSize.w / 2;
    const fy = focusY ?? canvasSize.h / 2;
    const ratio = nuovo / zoom;
    setPan((p) => ({ x: fx - (fx - p.x) * ratio, y: fy - (fy - p.y) * ratio }));
    setZoom(nuovo);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    zoomTo(e.deltaY < 0 ? 0.2 : -0.2, (e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
  };

  // Coordinate in spazio immagine (relative all'angolo dell'immagine)
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: ((e.clientX - rect.left) * scaleX - pan.x) / zoom - canvasSize.offsetX,
      y: ((e.clientY - rect.top) * scaleY - pan.y) / zoom - canvasSize.offsetY
    };
  };

  const onPointerDown = (e) => {
    if (!imgLoaded) return;
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const p = getPos(e);
    const tol = TOLLERANZA / zoom;

    if (strumento === 'pan') {
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
      return;
    }

    if (strumento === 'seleziona') {
      if (selezionato) {
        for (const m of maniglie(selezionato)) {
          if (Math.hypot(m.x - p.x, m.y - p.y) < tol) {
            drag.current = { tipo: 'maniglia', id: selezionato.id, maniglia: m.id };
            return;
          }
        }
        if (selezionato.tipo === 'figura') {
          const i = segmentoVicino(selezionato.punti, p, selezionato.chiusa, tol);
          if (i !== -1) {
            const punti = [...selezionato.punti];
            punti.splice(i + 1, 0, { x: p.x, y: p.y });
            setElementi((prev) => prev.map((el) => (el.id === selezionato.id ? { ...el, punti } : el)));
            drag.current = { tipo: 'maniglia', id: selezionato.id, maniglia: `p${i + 1}` };
            return;
          }
        }
      }
      for (let i = elementi.length - 1; i >= 0; i--) {
        if (colpito(elementi[i], p, tol)) {
          setSelectedId(elementi[i].id);
          drag.current = { tipo: 'muovi', id: elementi[i].id, ultimo: p };
          return;
        }
      }
      setSelectedId(null);
      return;
    }

    if (strumento === 'testo') {
      const el = creaTesto(p.x, p.y);
      setElementi((prev) => [...prev, el]);
      setSelectedId(el.id);
      setStrumento('seleziona');
      return;
    }

    drag.current = { tipo: 'crea' };
    if (strumento === 'quota') setBozza(creaQuota(p.x, p.y, p.x, p.y));
    if (strumento === 'evidenzia') setBozza(creaEvidenziatore(p.x, p.y, colore, opacita));
    if (strumento === 'figura') {
      drag.current = { tipo: 'libero', punti: [p] };
      setBozza(creaFigura([p, p], colore, opacita));
    }
  };

  const onPointerMove = (e) => {
    if (panStart.current) {
      setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) });
      return;
    }
    const d = drag.current;
    if (!d) return;
    const p = getPos(e);
    if (d.tipo === 'muovi') {
      const dx = p.x - d.ultimo.x;
      const dy = p.y - d.ultimo.y;
      d.ultimo = p;
      setElementi((prev) => prev.map((el) => (el.id === d.id ? sposta(el, dx, dy) : el)));
      return;
    }
    if (d.tipo === 'maniglia') {
      setElementi((prev) => prev.map((el) => (el.id === d.id ? applicaManiglia(el, d.maniglia, p) : el)));
      return;
    }
    if (d.tipo === 'crea') {
      setBozza((b) => (!b ? b : b.tipo === 'quota' ? { ...b, x2: p.x, y2: p.y } : { ...b, w: p.x - b.x, h: p.y - b.y }));
      return;
    }
    if (d.tipo === 'libero') {
      const ultimo = d.punti[d.punti.length - 1];
      if (Math.hypot(p.x - ultimo.x, p.y - ultimo.y) > 5 / zoom) {
        d.punti = [...d.punti, p];
        setBozza((b) => (b ? { ...b, punti: d.punti } : b));
      }
    }
  };

  const onPointerUp = () => {
    if (panStart.current) { panStart.current = null; return; }
    const d = drag.current;
    drag.current = null;
    if (!d || d.tipo === 'muovi' || d.tipo === 'maniglia') return;
    if (d.tipo === 'crea') {
      const el = bozza;
      setBozza(null);
      if (!el) return;
      if (el.tipo === 'quota') {
        if (Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 15) return;
      } else {
        const b = normalizzaBox(el);
        const finale = b.w < 12 && b.h < 12
          ? { ...el, forma: 'punto', x: b.x + b.w / 2 - 26, y: b.y + b.h / 2 - 26, w: 52, h: 52 }
          : { ...el, x: b.x, y: b.y, w: Math.max(12, b.w), h: Math.max(12, b.h) };
        setElementi((prev) => [...prev, finale]);
        setSelectedId(finale.id);
        return;
      }
      setElementi((prev) => [...prev, el]);
      setSelectedId(el.id);
      return;
    }
    if (d.tipo === 'libero') {
      setBozza(null);
      if (d.punti.length < 3) return;
      const fig = creaFigura(d.punti, colore, opacita);
      setElementi((prev) => [...prev, fig]);
      setSelectedId(fig.id);
    }
  };

  const aggiornaColore = (i, valore) => {
    const nuovi = colori.map((c, idx) => (idx === i ? valore : c));
    setColori(nuovi);
    salvaColori(nuovi);
    setElementi((prev) => prev.map((el) => (el.colore === colori[i] && el.tipo !== 'quota' && el.tipo !== 'testo' ? { ...el, colore: valore } : el)));
  };

  // Crea l'immagine definitiva con tutte le annotazioni incorporate
  const flatten = async () => {
    const img = imgRef.current;
    if (!img || !canvasSize.imgW) return null;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    const scale = natW / canvasSize.imgW;
    const off = document.createElement('canvas');
    off.width = natW;
    off.height = natH;
    const ctx = off.getContext('2d');
    ctx.drawImage(img, 0, 0, natW, natH);
    ctx.save();
    ctx.scale(scale, scale);
    disegnaElementi(ctx, elementi, null, 0);
    ctx.restore();
    const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return null;
    const file = new File([blob], `annotata_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
    return file_url;
  };

  const handleSalva = async () => {
    if (!elementi.length) { onSave(url); return; }
    setSaving(true);
    let finale = url;
    try {
      finale = (await flatten()) || url;
    } catch (err) {
      console.error('Errore creazione immagine annotata', err);
    }
    setSaving(false);
    onSave(finale);
  };

  const cursore = strumento === 'pan' ? 'grab' : strumento === 'seleziona' ? 'default' : 'crosshair';

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 text-white flex-shrink-0">
        <span className="text-sm font-medium">✏️ Lavagna annotazioni</span>
        <span className="text-[11px] text-white/60">{elementi.length} elementi</span>
      </div>
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        <div className="relative" style={{ width: canvasSize.w, height: canvasSize.h }}>
          {imgLoaded ? (
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              style={{ width: canvasSize.w, height: canvasSize.h, touchAction: 'none', cursor: cursore }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={handleWheel}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-40 text-white">Caricamento…</div>
          )}
        </div>
      </div>
      <p className="flex-shrink-0 px-3 pb-2 text-[11px] text-white/60 text-center">{SUGGERIMENTI[strumento]}</p>
      {selezionato && (
        <PannelloElemento
          elemento={selezionato}
          colori={colori}
          coloreAttivo={coloreAttivo}
          setColoreAttivo={setColoreAttivo}
          onChange={(aggiornato) => setElementi((prev) => prev.map((el) => (el.id === aggiornato.id ? aggiornato : el)))}
          onElimina={() => {
            setElementi((prev) => prev.filter((el) => el.id !== selezionato.id));
            setSelectedId(null);
          }} />
      )}
      <ToolbarAnnotazioni
        strumento={strumento}
        setStrumento={setStrumento}
        colori={colori}
        onColoriChange={aggiornaColore}
        coloreAttivo={coloreAttivo}
        setColoreAttivo={setColoreAttivo}
        opacita={opacita}
        setOpacita={setOpacita}
        zoom={zoom}
        onZoomIn={() => zoomTo(0.3)}
        onZoomOut={() => zoomTo(-0.3)}
        onResetZoom={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
        onSalva={handleSalva}
        onClose={onClose}
        saving={saving} />
    </div>
  );
}