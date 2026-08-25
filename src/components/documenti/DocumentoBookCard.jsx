import { highlightSnippet, matchCount, formatBytes } from "./utils";

const PALETTE = [
  "from-rose-500 to-rose-800",
  "from-amber-500 to-orange-800",
  "from-emerald-500 to-emerald-800",
  "from-sky-500 to-blue-800",
  "from-violet-500 to-purple-800",
  "from-teal-500 to-teal-800",
  "from-slate-600 to-slate-900",
  "from-fuchsia-500 to-fuchsia-800",
];

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

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
  return <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 px-0.5">{parts}</p>;
}

export default function DocumentoBookCard({ documento, searchTerm, onClick }) {
  const occorrenze = matchCount(documento.contenuto_testo, searchTerm);
  const isPdf = documento.tipo_file === "pdf";
  const color = PALETTE[hash(documento.categoria || documento.nome || "x") % PALETTE.length];

  return (
    <button type="button" onClick={onClick} className="group flex flex-col text-left focus:outline-none">
      <div className={`relative aspect-[3/4] rounded-r-xl rounded-l-md bg-gradient-to-br ${color} shadow-md group-hover:shadow-xl group-hover:-translate-y-1 transition-all overflow-hidden ring-1 ring-black/10`}>
        {/* Dorso */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/25 rounded-l-md" />
        {/* Pagine (bordo destro) */}
        <div className="absolute right-0 top-1.5 bottom-1.5 w-1.5 bg-white/80 rounded-r-md shadow-inner" />
        {/* Riflesso */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10 pointer-events-none" />

        <div className="absolute inset-0 pl-3.5 pr-3 pt-2.5 pb-2.5 flex flex-col">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white rounded px-1.5 py-0.5 bg-white/15">
              {isPdf ? "PDF" : (documento.tipo_file || "FILE").toUpperCase()}
            </span>
            {occorrenze > 0 && (
              <span className="text-[9px] font-bold text-black bg-yellow-400 rounded px-1.5 py-0.5">{occorrenze}×</span>
            )}
          </div>

          <h3 className="mt-2 font-bold text-white text-sm leading-tight line-clamp-4 drop-shadow-sm">
            {documento.nome}
          </h3>

          <div className="mt-auto flex items-center gap-1.5">
            {documento.categoria && (
              <span className="text-[10px] font-medium text-white/90 border border-white/30 rounded-full px-2 py-0.5 truncate">
                {documento.categoria}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-1 px-0.5">
        {documento.descrizione || (documento.dimensione_bytes ? formatBytes(documento.dimensione_bytes) : "")}
        {documento.caricato_da_nome ? ` · ${documento.caricato_da_nome}` : ""}
      </p>
      <HighlightedSnippet text={documento.contenuto_testo} term={searchTerm} />
    </button>
  );
}