import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Flag, MessageSquare, Trash2, Search } from "lucide-react";
import { formatBytes } from "./utils";

function countOccurrences(text, term) {
  if (!text || !term) return 0;
  const t = term.toLowerCase();
  const s = text.toLowerCase();
  let count = 0, idx = 0;
  while ((idx = s.indexOf(t, idx)) !== -1) { count++; idx += t.length; }
  return count;
}

function renderHighlighted(text, term) {
  if (!text) return <span className="text-muted-foreground">Testo non estratto. Usa l'anteprima o scarica il file.</span>;
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

function snippet(text, term, len = 200) {
  if (!text || !term) return null;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - len / 2);
  const end = Math.min(text.length, idx + term.length + len / 2);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export default function DocumentoViewer({ documento, searchTerm, canManage, onSegnalazione, onSegnalazioni, onDelete, segnalazioniCount }) {
  if (!documento) return null;
  const isPdf = documento.tipo_file === "pdf";
  const occorrenze = countOccurrences(documento.contenuto_testo, searchTerm);
  const snip = snippet(documento.contenuto_testo, searchTerm);

  return (
    <Dialog open={!!documento} onOpenChange={(v) => { if (!v) { onSegnalazione?.(null); } }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="w-5 h-5" />
            <span className="truncate">{documento.nome}</span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {documento.categoria && <Badge variant="secondary">{documento.categoria}</Badge>}
            <Badge variant="outline">{(documento.tipo_file || "file").toUpperCase()}</Badge>
            {documento.dimensione_bytes ? <span>{formatBytes(documento.dimensione_bytes)}</span> : null}
            {documento.caricato_da_nome && <span>· caricato da {documento.caricato_da_nome}</span>}
          </DialogDescription>
        </DialogHeader>

        {searchTerm && occorrenze > 0 && (
          <div className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-3 py-2">
            <Search className="w-3.5 h-3.5" />
            <span><b>{occorrenze}</b> occorrenze di "{searchTerm}" nel documento</span>
          </div>
        )}
        {searchTerm && snip && (
          <div className="text-xs bg-muted rounded-md px-3 py-2 max-h-20 overflow-auto">
            {renderHighlighted(snip, searchTerm)}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
          {isPdf ? (
            <div className="flex-1 min-h-0">
              <iframe src={documento.file_url} title={documento.nome} className="w-full h-full min-h-[55vh] rounded-md border" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 p-4 border rounded-md bg-muted/40">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Anteprima non disponibile per questo formato.</span>
              <a href={documento.file_url} download={documento.file_nome} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" /> Scarica</Button>
              </a>
            </div>
          )}

          <div className="border rounded-md">
            <div className="px-3 py-2 border-b bg-muted/50 text-xs font-semibold flex items-center gap-2">
              <Search className="w-3.5 h-3.5" /> Testo indicizzato
            </div>
            <div className="px-3 py-2 max-h-40 overflow-auto text-sm whitespace-pre-wrap leading-relaxed">
              {renderHighlighted(documento.contenuto_testo, searchTerm)}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
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