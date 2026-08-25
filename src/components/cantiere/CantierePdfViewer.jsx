import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function CantierePdfViewer({ cantiere, onClose }) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    setNumPages(0);
    setScale(1);
    setPdfError(false);
    setFullscreen(false);
  }, [cantiere?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cantiere?.id, fullscreen]);

  if (!cantiere) return null;
  const nome = cantiere.nome || "cantiere";

  return (
    <Dialog open={!!cantiere} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className={`overflow-hidden flex flex-col p-0 gap-0 ${fullscreen ? "!fixed !inset-0 !left-0 !top-0 max-w-none max-h-none w-full h-full !rounded-none !translate-x-0 !translate-y-0" : "max-w-3xl max-h-[92vh]"}`}>
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 pr-16">
            <FileText className="w-5 h-5 shrink-0" />
            <span className="truncate">PDF · {nome}</span>
            <Button size="icon" variant="ghost" className="absolute right-10 top-3.5 h-7 w-7" onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Riduci" : "Schermo intero"}>
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 px-4 py-2 border-b shrink-0">
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))} disabled={scale <= 0.5}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))} disabled={scale >= 3}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-auto min-h-0 bg-muted/30">
          {pdfError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground max-w-xs">Impossibile visualizzare il PDF in linea.</p>
              <a href={cantiere.pdf_url} download className="mt-2">
                <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> Scarica PDF</Button>
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <Document
                file={cantiere.pdf_url}
                onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
                onLoadError={() => setPdfError(true)}
                loading={<div className="py-16 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Caricamento PDF...</div>}
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <Page
                    key={i}
                    pageNumber={i + 1}
                    width={containerWidth > 0 ? Math.max(80, Math.floor((containerWidth - 16) * scale)) : undefined}
                    className="shadow-md bg-white"
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />
                ))}
              </Document>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 px-4 py-3 border-t shrink-0">
          <Button variant="default" size="sm" className="gap-2" onClick={onClose}>Chiudi</Button>
          <a href={cantiere.pdf_url} download className="ml-auto">
            <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> Scarica</Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}