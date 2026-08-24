import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Flag, MessageSquare, Trash2, Search, Minus, Plus, BookOpen, FileType2 } from "lucide-react";
import { formatBytes, matchCount } from "./utils";

const FONT_SIZES = ["text-sm", "text-base", "text-lg", "text-xl", "text-2xl"];

function renderHighlighted(text, term) {
  if (!text) return <span className="text-muted-foreground">Testo non estratto. Usa la vista PDF o scarica il file.</span>;
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
  const [view, setView] = useState("reader"); // reader | pdf
  const [fontSize, setFontSize] = useState(1); // index in FONT_SIZES
  const scrollRef = useRef(null);

  // Reset view quando cambia documento: PDF apre nella vista visuale, altri nel reader
  useEffect(() => {
    setView(documento?.tipo_file === "pdf" ? "pdf" : "reader");
    setFontSize(1);
  }, [documento?.id]);

  // Scroll in alto all'apertura
  useEffect(() => {
    if (documento && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [documento?.id]);

  if (!documento) return null;
  const isPdf = documento.tipo_file === "pdf";
  const occorrenze = matchCount(documento.contenuto_testo, searchTerm);
  const hasText = !!documento.contenuto_testo?.trim();

  return (
    <Dialog open={!!documento} onOpenChange={(v) => { if (!v) { onSegnalazione?.(null); } }}>
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

        {/* Barra ricerca + vista + font */}
        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 flex-wrap">
          {/* Toggle vista */}
          {isPdf && (
            <div className="flex items-center bg-muted rounded-md p-0.5">
              <Button size="sm" variant={view === "reader" ? "default" : "ghost"} className="h-7 gap-1 text-xs" onClick={() => setView("reader")}>
                <BookOpen className="w-3.5 h-3.5" /> Reader
              </Button>
              <Button size="sm" variant={view === "pdf" ? "default" : "ghost"} className="h-7 gap-1 text-xs" onClick={() => setView("pdf")}>
                <FileType2 className="w-3.5 h-3.5" /> PDF
              </Button>
            </div>
          )}

          {/* Font size (solo reader) */}
          {view === "reader" && hasText && (
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
            <div className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 ${view === "reader" ? "" : "ml-auto"} bg-yellow-50 border border-yellow-200 text-yellow-800`}>
              <Search className="w-3.5 h-3.5" />
              <span><b>{occorrenze}</b> occorrenze</span>
            </div>
          )}
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-hidden min-h-0">
          {view === "pdf" && isPdf ? (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(documento.file_url)}&embedded=true`}
              title={documento.nome}
              className="w-full h-full min-h-[60vh]"
            />
          ) : (
            <div ref={scrollRef} className="h-full overflow-auto px-5 py-4 bg-background">
              <article className={`prose prose-sm max-w-none ${FONT_SIZES[fontSize]} leading-relaxed text-foreground whitespace-pre-wrap break-words`}>
                {renderHighlighted(documento.contenuto_testo, searchTerm)}
              </article>
              {!hasText && (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Testo non disponibile per la lettura fluida.
                    {isPdf ? " Puoi aprire il PDF originale o scaricarlo." : " Scarica il file per consultarlo."}
                  </p>
                  {isPdf && <Button size="sm" variant="outline" onClick={() => setView("pdf")}>Apri PDF originale</Button>}
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
          <a href={documento.file_url} download={documento.file_nome} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <Button variant="outline" size="sm" className="gap-2"><Download className="w-4 h-4" /> Scarica</Button>
          </a>
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