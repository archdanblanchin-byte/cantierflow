import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, FileArchive } from "lucide-react";
import { formatBytes, highlightSnippet, matchCount } from "./utils";

function HighlightedSnippet({ text, term }) {
  if (!term) return null;
  const snip = highlightSnippet(text, term);
  if (!snip) return null;
  const parts = [];
  const lower = snip.toLowerCase();
  const t = term.toLowerCase();
  let i = 0, idx, key = 0;
  while ((idx = lower.indexOf(t, i)) !== -1) {
    if (idx > i) parts.push(<span key={key++}>{snip.slice(i, idx)}</span>);
    parts.push(<mark key={key++} className="bg-yellow-300 text-black rounded px-0.5">{snip.slice(idx, idx + t.length)}</mark>);
    i = idx + t.length;
  }
  if (i < snip.length) parts.push(<span key={key++}>{snip.slice(i)}</span>);
  return <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{parts}</p>;
}

export default function DocumentoCard({ documento, searchTerm, onClick }) {
  const occorrenze = matchCount(documento.contenuto_testo, searchTerm);
  const isPdf = documento.tipo_file === "pdf";

  return (
    <Card onClick={onClick} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
          {isPdf ? <FileText className="w-5 h-5" /> : <FileArchive className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate flex-1">{documento.nome}</h3>
            {occorrenze > 0 && <Badge className="bg-yellow-400 text-black hover:bg-yellow-400">{occorrenze}×</Badge>}
          </div>
          {documento.categoria && <Badge variant="secondary" className="mt-0.5 text-[10px]">{documento.categoria}</Badge>}
          {documento.descrizione && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{documento.descrizione}</p>}
          <HighlightedSnippet text={documento.contenuto_testo} term={searchTerm} />
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">{(documento.tipo_file || "file").toUpperCase()}</Badge>
            {documento.dimensione_bytes ? <span>{formatBytes(documento.dimensione_bytes)}</span> : null}
            {documento.caricato_da_nome ? <span>· {documento.caricato_da_nome}</span> : null}
          </div>
        </div>
      </div>
    </Card>
  );
}