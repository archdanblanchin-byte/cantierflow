import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

// Estrae via+numero, città e provincia dal risultato Nominatim
function parseNominatim(res) {
  const a = res.address || {};
  const via = [a.road, a.pedestrian, a.path, a.cycleway, a.square, a.place].find(Boolean) || "";
  const numero = a.house_number || "";
  const citta = a.city || a.town || a.village || a.hamlet || a.municipality || a.county || "";
  const provincia = a.county || a.state || "";
  const indirizzo = [via, numero].filter(Boolean).join(" ").trim();
  return {
    indirizzo,
    citta,
    provincia,
    lat: parseFloat(res.lat),
    lon: parseFloat(res.lon),
    display: res.display_name,
  };
}

export default function AddressAutocomplete({ value, onSelect, placeholder = "Via, numero, città..." }) {
  const [text, setText] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { setText(value || ""); }, [value]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const doSearch = (q) => {
    if (abortRef.current) abortRef.current.abort();
    if (q.trim().length < 3) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=it&q=${encodeURIComponent(q)}`,
      { headers: { "Accept-Language": "it" }, signal: ctrl.signal }
    )
      .then((r) => r.json())
      .then((res) => { setResults(res || []); setOpen(true); setActive(-1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // debounce
  useEffect(() => {
    const t = setTimeout(() => doSearch(text), 350);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (res) => {
    const p = parseNominatim(res);
    onSelect(p);
    setText(p.indirizzo ? `${p.indirizzo}, ${p.citta}` : p.display);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(results[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="pr-9"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </span>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-72 overflow-auto">
          {results.map((res, i) => {
            const p = parseNominatim(res);
            return (
              <button
                key={res.place_id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(res)}
                className={`w-full text-left px-3 py-2 text-sm flex gap-2 items-start border-b border-border/50 last:border-0 ${i === active ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="min-w-0">
                  <span className="block font-medium truncate">
                    {p.indirizzo ? `${p.indirizzo}, ${p.citta}` : p.display.split(",")[0]}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">{p.display}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}