import React, { useState } from 'react';
import { Paperclip, Trash2, FileText, Image, FileArchive, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function getIcona(nome) {
  const ext = (nome || '').split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return <Image className="w-4 h-4 text-blue-500" />;
  if (['zip', 'rar', '7z'].includes(ext)) return <FileArchive className="w-4 h-4 text-yellow-500" />;
  return <FileText className="w-4 h-4 text-slate-500" />;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AllegatiSopraluogo({ allegati = [], onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const nuovi = await Promise.all(
      files.map(async (f) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        return { id: Math.random().toString(36).slice(2, 9), nome: f.name, url: file_url, size: f.size };
      })
    );
    onChange([...allegati, ...nuovi]);
    setUploading(false);
    e.target.value = '';
  };

  const remove = (id) => onChange(allegati.filter((a) => a.id !== id));

  return (
    <div className="space-y-3">
      {/* Lista allegati */}
      {allegati.length > 0 &&
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {allegati.map((a) =>
        <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-card">
              {getIcona(a.nome)}
              <a href={a.url} target="_blank" rel="noopener noreferrer"
          className="flex-1 min-w-0 text-sm font-medium truncate hover:underline text-foreground">
                {a.nome}
              </a>
              {a.size && <span className="text-xs text-muted-foreground flex-shrink-0">{formatSize(a.size)}</span>}
              <button type="button" onClick={() => remove(a.id)}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
        )}
        </div>
      }
      {/* Pulsante carica */}
    </div>);
}