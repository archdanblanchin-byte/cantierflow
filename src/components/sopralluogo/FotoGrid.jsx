import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Camera, ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import FotoPrivata from "@/components/foto/FotoPrivata";
import FotoEditor from "@/components/foto/FotoEditor";
import ImageViewer from "./ImageViewer";
import { caricaFotoPrivata, caricaAnnotataDaDataUrl, urlFoto } from "@/lib/fotoCantiere";

// Galleria di immagini nello storage privato. Ogni voce: { file_uri, url_annotata?, annotazioni?, nota? }.
// Con annotabile=true si possono aggiungere testo, quote, frecce e disegni (salvati come immagine annotata).
export default function FotoGrid({ items = [], onChange, annotabile = false, titolo = "Immagini" }) {
  const camRef = useRef(null);
  const galRef = useRef(null);
  const [caricamento, setCaricamento] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [editor, setEditor] = useState(null); // { index, url }
  const [salvaAnn, setSalvaAnn] = useState(false);

  const aggiungi = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    setCaricamento(true);
    try {
      const nuove = [];
      for (const f of files) nuove.push({ file_uri: await caricaFotoPrivata(f), nota: "" });
      onChange([...items, ...nuove]);
    } catch {
      toast.error("Caricamento non riuscito. Riprova.");
    } finally {
      setCaricamento(false);
    }
  };

  const apriEditor = async (index) => {
    const it = items[index];
    setEditor({ index, url: await urlFoto(it.file_uri) });
  };

  const salvaAnnotazioni = async ({ annotazioni, url_annotata }) => {
    setSalvaAnn(true);
    try {
      const uri = annotazioni.length ? await caricaAnnotataDaDataUrl(url_annotata) : "";
      onChange(items.map((it, i) => (i === editor.index ? { ...it, annotazioni, url_annotata: uri } : it)));
      setEditor(null);
    } catch {
      toast.error("Salvataggio delle annotazioni non riuscito");
    } finally {
      setSalvaAnn(false);
    }
  };

  const uris = items.map((it) => it.url_annotata || it.file_uri);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium">{titolo} {items.length > 0 && <span className="text-muted-foreground">({items.length})</span>}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={caricamento} onClick={() => camRef.current?.click()}>
            {caricamento ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Fotocamera
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={caricamento} onClick={() => galRef.current?.click()}>
            <ImagePlus className="w-4 h-4" /> Galleria
          </Button>
        </div>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={aggiungi} />
      <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={aggiungi} />

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessuna immagine.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((it, i) => (
            <div key={`${it.file_uri}-${i}`} className="space-y-1">
              <div className="relative">
                <button type="button" className="block w-full" onClick={() => setViewer(i)}>
                  <FotoPrivata file_uri={it.url_annotata || it.file_uri} className="w-full aspect-[4/3] rounded-lg" />
                </button>
                <button type="button" aria-label="Rimuovi" className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1" onClick={() => onChange(items.filter((_, k) => k !== i))}>
                  <X className="w-3.5 h-3.5" />
                </button>
                {annotabile && (
                  <button type="button" aria-label="Annota" className="absolute bottom-1 right-1 bg-primary text-primary-foreground rounded-full p-1.5" onClick={() => apriEditor(i)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Input className="h-8 text-xs" placeholder="Nota" value={it.nota || ""} onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, nota: e.target.value } : x)))} />
            </div>
          ))}
        </div>
      )}

      <ImageViewer uris={uris} start={viewer} onClose={() => setViewer(null)} />
      <Dialog open={!!editor} onOpenChange={(o) => !o && !salvaAnn && setEditor(null)}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-auto">
          <DialogTitle>Quote e annotazioni</DialogTitle>
          {editor && (
            <FotoEditor
              imageUrl={editor.url}
              annotazioni={items[editor.index]?.annotazioni || []}
              onSave={salvaAnnotazioni}
              onCancel={() => setEditor(null)}
            />
          )}
          {salvaAnn && <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Salvataggio...</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}