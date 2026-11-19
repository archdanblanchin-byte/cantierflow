import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Check, Minus, RotateCcw } from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 9);
const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

export default function FotoAnnotata({ fotoAnnotata, onChange, onDelete }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState(null);
  const [current, setCurrent] = useState(null);
  const [editingQuota, setEditingQuota] = useState(null); // id quota in editing misura
  const [colore, setColore] = useState('#ef4444');
  const [misuraInput, setMisuraInput] = useState('');

  const quote = fotoAnnotata.quote || [];

  const disegna = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const disegnaQuota = (x1, y1, x2, y2, misura, color, alpha = 1) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, canvas.width / 300);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Frecce
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrLen = Math.max(10, canvas.width / 60);
      [[x1, y1, angle + Math.PI], [x2, y2, angle]].forEach(([ax, ay, ang]) => {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - arrLen * Math.cos(ang - 0.4), ay - arrLen * Math.sin(ang - 0.4));
        ctx.lineTo(ax - arrLen * Math.cos(ang + 0.4), ay - arrLen * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      });

      if (misura) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const fs = Math.max(14, canvas.width / 40);
        ctx.font = `bold ${fs}px sans-serif`;
        const tw = ctx.measureText(misura).width;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(mx - tw / 2 - 6, my - fs - 4, tw + 12, fs + 8);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(misura, mx, my - fs / 2 + 2);
      }
      ctx.restore();
    };

    quote.forEach(q => disegnaQuota(q.x1, q.y1, q.x2, q.y2, q.misura, q.colore || '#ef4444'));
    if (drawing && start && current) {
      disegnaQuota(start.x, start.y, current.x, current.y, '', colore, 0.7);
    }
  }, [imgLoaded, quote, drawing, start, current, colore]);

  useEffect(() => { disegna(); }, [disegna]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    const pos = getPos(e, canvasRef.current);
    setStart(pos);
    setCurrent(pos);
    setDrawing(true);
  };

  const onMouseMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    setCurrent(getPos(e, canvasRef.current));
  };

  const onMouseUp = (e) => {
    if (!drawing || !start) return;
    e.preventDefault();
    const end = getPos(e, canvasRef.current);
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist > 10) {
      const nuova = { id: uid(), x1: start.x, y1: start.y, x2: end.x, y2: end.y, misura: '', colore };
      const nuoveQuote = [...quote, nuova];
      onChange({ ...fotoAnnotata, quote: nuoveQuote });
      setEditingQuota(nuova.id);
      setMisuraInput('');
    }
    setDrawing(false);
    setStart(null);
    setCurrent(null);
  };

  const salvaQuota = (id) => {
    onChange({ ...fotoAnnotata, quote: quote.map(q => q.id === id ? { ...q, misura: misuraInput } : q) });
    setEditingQuota(null);
    setMisuraInput('');
  };

  const eliminaQuota = (id) => {
    onChange({ ...fotoAnnotata, quote: quote.filter(q => q.id !== id) });
    if (editingQuota === id) setEditingQuota(null);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Canvas foto + disegno */}
      <div className="relative select-none bg-black">
        <img
          ref={imgRef}
          src={fotoAnnotata.foto_url}
          alt=""
          className="hidden"
          onLoad={() => setImgLoaded(true)}
        />
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          style={{ maxHeight: '60vh', objectFit: 'contain' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onMouseDown}
          onTouchMove={onMouseMove}
          onTouchEnd={onMouseUp}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Colore quota:</span>
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColore(c)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${colore === c ? 'border-foreground scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
          <span className="text-xs text-muted-foreground ml-2">← Disegna una linea sulla foto per aggiungere una quota</span>
        </div>

        {/* Lista quote */}
        {quote.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quote ({quote.length})</p>
            {quote.map((q, i) => (
              <div key={q.id} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: q.colore || '#ef4444' }} />
                <span className="text-xs text-muted-foreground flex-shrink-0">Quota {i + 1}</span>
                {editingQuota === q.id ? (
                  <>
                    <Input
                      autoFocus
                      value={misuraInput}
                      onChange={e => setMisuraInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && salvaQuota(q.id)}
                      placeholder="Es: 3,50m o 120cm"
                      className="h-7 text-xs flex-1"
                    />
                    <button type="button" onClick={() => salvaQuota(q.id)} className="text-green-600 hover:text-green-700 flex-shrink-0">
                      <Check className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold flex-1">{q.misura || <span className="text-muted-foreground italic text-xs">nessuna misura</span>}</span>
                    <button type="button" onClick={() => { setEditingQuota(q.id); setMisuraInput(q.misura || ''); }}
                      className="text-xs text-primary underline flex-shrink-0">
                      {q.misura ? 'modifica' : 'aggiungi misura'}
                    </button>
                  </>
                )}
                <button type="button" onClick={() => eliminaQuota(q.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Descrizione + elimina foto */}
        <div className="flex items-center gap-2">
          <Input
            value={fotoAnnotata.descrizione || ''}
            onChange={e => onChange({ ...fotoAnnotata, descrizione: e.target.value })}
            placeholder="Descrizione (es: Facciata nord, Parete soggiorno...)"
            className="h-8 text-xs flex-1"
          />
          <button type="button" onClick={onDelete} className="text-muted-foreground hover:text-destructive flex-shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}