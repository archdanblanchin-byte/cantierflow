import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Upload, X, Edit3, MessageSquare, Loader2 } from "lucide-react";
import FotoEditor from "@/components/foto/FotoEditor";

// foto = [{ url, url_annotata, nota, annotazioni }]
export default function FotoRapportino({ foto = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingNota, setEditingNota] = useState(null); // index nota aperta

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const nuove = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      nuove.push({ url: file_url, url_annotata: "", nota: "", annotazioni: [] });
    }
    onChange([...foto, ...nuove]);
    setUploading(false);
  };

  const remove = (i) => onChange(foto.filter((_, idx) => idx !== i));

  const saveAnnotations = ({ annotazioni, url_annotata }) => {
    const updated = [...foto];
    updated[editingIndex] = { ...updated[editingIndex], annotazioni, url_annotata };
    onChange(updated);
    setEditingIndex(null);
  };

  const updateNota = (i, nota) => {
    const updated = [...foto];
    updated[i] = { ...updated[i], nota };
    onChange(updated);
  };

  return (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Foto</Label>
      <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {foto.map((f, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden bg-card">
            {/* Anteprima */}
            <div className="relative aspect-video">
              <img
                src={f.url_annotata || f.url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditingIndex(i)}
                  className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow"
                  title="Annota"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {f.annotazioni?.length > 0 && (
                <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                  {f.annotazioni.length} annot.
                </div>
              )}
            </div>
            {/* Nota */}
            <div className="p-2">
              {editingNota === i ? (
                <Textarea
                  value={f.nota || ""}
                  onChange={(e) => updateNota(i, e.target.value)}
                  onBlur={() => setEditingNota(null)}
                  autoFocus
                  className="text-xs min-h-[50px]"
                  placeholder="Scrivi una nota..."
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingNota(i)}
                  className="w-full text-left flex items-start gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{f.nota || "Aggiungi nota..."}</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Upload */}
        <label className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 aspect-video flex flex-col items-center justify-center cursor-pointer transition-colors">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground mt-1">Carica foto</span>
            </>
          )}
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {/* Editor annotazioni */}
      <Dialog open={editingIndex !== null} onOpenChange={() => setEditingIndex(null)}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          {editingIndex !== null && foto[editingIndex] && (
            <FotoEditor
              imageUrl={foto[editingIndex].url}
              annotazioni={foto[editingIndex].annotazioni || []}
              onSave={saveAnnotations}
              onCancel={() => setEditingIndex(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}