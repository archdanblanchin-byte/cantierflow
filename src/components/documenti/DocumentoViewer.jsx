import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Flag, MessageSquare, Trash2, Search, Minus, Plus, BookOpen, FileType2, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { formatBytes, matchCount } from "./utils";

// Worker pdf.js via CDN corrispondente alla versione bundled
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FONT_SIZES = ["text-sm", "text-base", "text-lg", "text-xl", "text-2xl"];

function renderHighlighted(text, term) {
  if (!text) return <span className="text-muted-foreground">Testo non estratto.</span>;
  if (!term) return text;
  const parts = [];
  const lower = text.toLowerCase();
  const t = term.toLowerCase();
  let i = 0, idx, key = 0;
  while ((idx = lower.indexOf(t, i)) !== -1) {
    if (idx > i) parts.push(<span key={key++}>{text.slice(i, idx)}</span>);
    parts.push(<mark key={key++} className="bg-yellow-300 text-black rounded px-0.5">{text.slice(idx, idx + t.length)}</mark>);
    i = idx + t.length;
  }
  if (i < text.length) parts.push(<span key={key++}>{text.slice(i)}</span>);
  return parts;
}

export default function DocumentoViewer({ documento, searchTerm, canManage, onSegnalazione, onSegnalazioni, onDelete, segnalazioniCount }) {
  const [view, setView] = useState("pagine"); // pagine | lettore
  const [fontSize, setFontSize] = useState(1);
  const [scale, setScale] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [fullText, setFullText] = useState("");
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setView(documento?.tipo_file === "pdf" ? "pagine" : "lettore");
    setFontSize(1);
    setScale(1);
    setNumPages(0);
    setFullText("");
    setPdfError(false);
  }, [documento?.id]);

  useEffect(() => {
    if (documento && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [documento?.id, view, scale]);

  if (!documento) return null;
  const isPdf = documento.tipo_file === "pdf";
  const displayText = isPdf && fullText ? fullText : documento.contenuto_testo;
  const occorrenze = matchCount(displayText, searchTerm);
  const hasText = !!displayText?.trim();

  const onPdfLoad = async (pdf) => {
    setNumPages(pdf.numPages);
    setLoadingPdf(true);
    try {
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it) => it.str).join(" ") + "\n\n";
      }
      setFullText(text);
    } catch (e) {
      // testo non disponibile, resta il rendering pagine
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <Dialog open={!!documento} onOpenChange={(v) => { if (!v) onSegnalazione?.(null); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="w-5 h-5 shrink-0" />
            <span className="truncate">{documento.nome}</span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {documento.categoria && <Badge variant="secondary">{documento.categoria}</Badge>}
            <Badge variant="outline">{(documento.tipo_file || "file").toUpperCase()}</Badge>
            {documento.dimensione_bytes ? <span>{formatBytes(documento.dimensione_bytes)}</span> : null}
            {documento.caricato_da_nome ? <span>· {documento.caricato_da_nome}</span> : null}
          </DialogDescription>
        </DialogHeader>

        {/* Barra vista + controlli */}
        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 flex-wrap">
          {isPdf && (
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <Button size="sm" variant={view === "pagine" ? "default" : "ghost"} className="h-7 gap-1 text-xs" onClick={() => setView("pagine")}>
                <FileType2 className="w-3.5 h-3.5" /> Pagine
              </Button>
              <Button size="sm" variant={view === "lettore" ? "default" : "ghost"} className="h-7 gap-1 text-xs" onClick={() => setView("lettore")}>
                <BookOpen className="w-3.5 h-3.5" /> Lettore
              </Button>
            </div>
          )}

          {view === "pagine" && isPdf && (
            <div className="flex items-center gap-1 ml-auto">
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))} disabled={scale <= 0.5}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))} disabled={scale >= 3}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {view === "lettore" && hasText && (
            <div className="flex items-center gap-1 ml-auto">
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setFontSize((f) => Math.max(0, f - 1))} disabled={fontSize === 0}>
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">A</span>
              <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setFontSize((f) => Math.min(FONT_SIZES.length - 1, f + 1))} disabled={fontSize === FONT_SIZES.length - 1}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {searchTerm && occorrenze > 0 && (
            <div className="flex items-center gap-1.5 text-xs rounded-md px-2 py-1 ml-auto sm:ml-0 bg-yellow-50 border border-yellow-200 text-yellow-800">
              <Search className="w-3.5 h-3.5" />
              <span><b>{occorrenze}</b> occorrenze</span>
            </div>
          )}
        </div>

        {/* Corpo */}
        <div ref={scrollRef} className="flex-1 overflow-auto min-h-0 bg-muted/30">
          {view === "pagine" && isPdf ? (
            <div className="flex flex-col items-center gap-3 py-4">
              {pdfError ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground max-w-xs">Impossibile visualizzare il PDF. Apri la modalità Lettore per il testo.</p>
                  <Button size="sm" variant="outline" onClick={() => setView("lettore")}>Apri Lettore</Button>
                </div>
              ) : (
                <Document
                  file={documento.file_url}
                  onLoadSuccess={onPdfLoad}
                  onLoadError={() => setPdfError(true)}
                  loading={<div className="py-16 flex items-center gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> Caricamento documento...</div>}
                >
                  {Array.from({ length: numPages }, (_, i) => (
                    <Page key={i} pageNumber={i + 1} scale={scale} className="shadow-md" renderTextLayer={false} renderAnnotationLayer={false} />
                  ))}
                </Document>
              )}
            </div>
          ) : (
            <div className="px-5 py-4 bg-background min-h-full">
              {loadingPdf && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3"><Loader2 className="w-4 h-4 animate-spin" /> Estrazione testo...</div>
              )}
              <article className={`prose prose-sm max-w-none ${FONT_SIZES[fontSize]} leading-relaxed text-foreground whitespace-pre-wrap break-words`}>
                {renderHighlighted(displayText, searchTerm)}
              </article>
              {!hasText && !loadingPdf && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground max-w-xs">Testo non disponibile per la lettura fluida.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 px-4 py-3 border-t shrink-0">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => onSegnalazione?.(documento)}>
            <Flag className="w-4 h-4" /> Segnala
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => onSegnalazioni?.(documento)}>
              <MessageSquare className="w-4 h-4" /> Segnalazioni{typeof segnalazioniCount === "number" ? ` (${segnalazioniCount})` : ""}
            </Button>
          )}
          {canManage && (
            <a href={documento.file_url} download={documento.file_nome} target="_blank" rel="noopener noreferrer" className="ml-auto">
              <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> Scarica</Button>
            </a>
          )}
          {canManage && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={() => onDelete?.(documento)}>
              <Trash2 className="w-4 h-4" /> Elimina
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}