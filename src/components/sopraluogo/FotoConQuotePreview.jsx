import React, { useRef, useEffect, useState } from 'react';

export default function FotoConQuotePreview({ fotoObj, onClick }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const url = fotoObj?.url_annotata || fotoObj?.url || fotoObj;
  const quote = fotoObj?.url_annotata ? [] : (fotoObj?.quote || []);

  const disegnaQuote = () => {
    if (!canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    quote.forEach(q => {
      const x1 = q.x1 * canvas.width;
      const y1 = q.y1 * canvas.height;
      const x2 = q.x2 * canvas.width;
      const y2 = q.y2 * canvas.height;

      // Linea
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pallini
      [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(({ x, y }) => {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      });

      // Testo misura
      if (q.testo) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        ctx.font = 'bold 13px sans-serif';
        const tw = ctx.measureText(q.testo).width;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.roundRect(mx - tw / 2 - 5, my - 11, tw + 10, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(q.testo, mx, my);
      }
    });
  };

  useEffect(() => {
    if (imgLoaded) disegnaQuote();
  }, [imgLoaded, quote]);

  return (
    <div
      className="relative w-full aspect-video rounded-lg overflow-hidden cursor-pointer bg-muted hover:opacity-90 active:scale-95 transition-transform"
      onClick={onClick}
    >
      <img
        ref={imgRef}
        src={url}
        alt=""
        className="w-full h-full object-cover"
        onLoad={() => setImgLoaded(true)}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}