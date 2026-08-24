export function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export function highlightSnippet(text, term, len = 160) {
  if (!text || !term) return null;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - len / 2);
  const end = Math.min(text.length, idx + term.length + len / 2);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

export function matchCount(text, term) {
  if (!text || !term) return 0;
  const t = term.toLowerCase();
  const s = text.toLowerCase();
  let count = 0, idx = 0;
  while ((idx = s.indexOf(t, idx)) !== -1) { count++; idx += t.length; }
  return count;
}