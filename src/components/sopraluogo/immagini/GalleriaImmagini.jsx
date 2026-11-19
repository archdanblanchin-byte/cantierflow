import React, { useState } from 'react';
import { Camera, ImageIcon, Paperclip, Pencil, ZoomIn, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EditorAnnotazioni from './EditorAnnotazioni';

const btn = 'flex-1 min-w-[130px] flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all text-sm text-muted-foreground font-medium';

/**
 * GalleriaImmagini: gestione unica delle immagini (foto, galleria, file).
 * Ogni immagine è un URL definitivo: quote, testi, evidenziatori e figure
 * vengono incorporate nell'immagine al momento del salvataggio.
 * Props: immagini (array di URL), onChange(array di URL)
 */
export default function GalleriaImmagini({ immagini = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [editing, setEditing] = useState(null);

  const carica = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(
      files.map((f) => base44.integrations.Core.UploadPublicFile({ file: f }).then((r) => r.file_url))
    );
    const nuove = [...immagini, ...urls];
    onChange(nuove);
    setUploading(false);
    e.target.value = '';
    // apre subito l'editor per inserire le quote sull'immagine appena caricata
    setEditing(nuove.length - 1);
  };

  const salvaModifica = (urlFinale) => {
    onChange(immagini.map((u, i) => (i === editing ? urlFinale : u)));
    setEditing(null);
  };

  const rimuovi = (i) => onChange(immagini.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {immagini.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {immagini.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-black group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setLightbox(url)}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                <ZoomIn className="w-6 h-6 text-white drop-shadow" />
              </button>
              <button type="button" onClick={() => setEditing(i)}
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                title="Annota l'immagine (testi, evidenziazioni, figure, quote)">
                <Pencil className="w-3.5 h-3.5 text-slate-800" />
              </button>
              <button type="button" onClick={() => rimuovi(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-600 transition-colors"
                title="Elimina immagine">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className={btn}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Scatta foto
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={carica} disabled={uploading} />
        </label>
        <label className={btn}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />} Galleria
          <input type="file" accept="image/*" multiple className="hidden" onChange={carica} disabled={uploading} />
        </label>
        <label className={btn}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />} Carica immagine
          <input type="file" accept="image/*" multiple className="hidden" onChange={carica} disabled={uploading} />
        </label>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
            <X className="w-7 h-7" />
          </button>
        </div>
      )}

      {editing !== null && immagini[editing] && (
        <EditorAnnotazioni url={immagini[editing]} onSave={salvaModifica} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}