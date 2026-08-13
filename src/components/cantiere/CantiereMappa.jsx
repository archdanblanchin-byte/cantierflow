import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Loader2, Navigation, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Icona marker personalizzata (evita problemi di asset con bundler)
const markerIcon = L.divIcon({
  className: "cantiere-marker",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);transform:rotate(-45deg)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const DEFAULT_CENTER = [45.8533, 12.9997]; // Rivignano Teor

function geocodeAddress(query) {
  return fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { "Accept-Language": "it" } }
  )
    .then((r) => r.json())
    .then((res) => (res && res[0] ? { lat: parseFloat(res[0].lat), lon: parseFloat(res[0].lon), display: res[0].display_name } : null));
}

function reverseGeocode(lat, lon) {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
    { headers: { "Accept-Language": "it" } }
  )
    .then((r) => r.json())
    .then((res) => res?.display_name || null)
    .catch(() => null);
}

// Componente interno che gestisce click sulla mappa
function MapClicker({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

// Centra la mappa quando le coordinate cambiano esternamente
function MapFlyer({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    // La mappa viene montata dentro un dialog animato: ricalcola la size
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  useEffect(() => {
    if (lat != null && lon != null) map.flyTo([lat, lon], Math.max(map.getZoom(), 15), { duration: 0.5 });
  }, [lat, lon]);
  return null;
}

export default function CantiereMappa({ latitudine, longitudine, indirizzo, citta, onPick, onReverseAddress }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(
    latitudine != null && longitudine != null ? { lat: latitudine, lon: longitudine } : null
  );
  const [reverseLabel, setReverseLabel] = useState("");

  useEffect(() => {
    if (open) {
      setPicked(latitudine != null && longitudine != null ? { lat: latitudine, lon: longitudine } : null);
      setSearch([indirizzo, citta].filter(Boolean).join(", "));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    const q = [search, citta].filter(Boolean).join(", ") || search;
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await geocodeAddress(q);
      if (res) setPicked({ lat: res.lat, lon: res.lon });
      else alert("Indirizzo non trovato");
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = async (latlng) => {
    setPicked({ lat: latlng.lat, lon: latlng.lng });
    const label = await reverseGeocode(latlng.lat, latlng.lng);
    setReverseLabel(label || "");
  };

  const handleConfirm = () => {
    if (picked) {
      onPick(picked.lat, picked.lon);
      if (reverseLabel && onReverseAddress) onReverseAddress(reverseLabel);
    }
    setOpen(false);
  };

  const center = picked ? [picked.lat, picked.lon] : DEFAULT_CENTER;

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <MapPin className="w-4 h-4 text-primary" />
        Apri mappa
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Geolocalizza cantiere
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-3 space-y-3">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                placeholder="Cerca indirizzo (es. Via Roma 15, Milano)"
                className="flex-1"
              />
              <Button type="button" size="icon" variant="default" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Cerca l'indirizzo o clicca direttamente sulla mappa per posizionare il cantiere.
            </p>
          </div>

          <div className="h-[380px] w-full">
            <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full" style={{ zIndex: 0 }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClicker onClick={handleMapClick} />
              <MapFlyer lat={picked?.lat} lon={picked?.lon} />
              {picked && <Marker position={[picked.lat, picked.lon]} icon={markerIcon} />}
            </MapContainer>
          </div>

          <div className="px-4 py-3 bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs">
              {picked ? (
                <span className="font-mono">
                  <span className="text-muted-foreground">Coordinate:</span>{" "}
                  <strong>{picked.lat.toFixed(5)}, {picked.lon.toFixed(5)}</strong>
                  {reverseLabel && <span className="block text-muted-foreground mt-0.5 max-w-[420px] truncate">{reverseLabel}</span>}
                </span>
              ) : (
                <span className="text-muted-foreground">Nessun punto selezionato — cerca o clicca sulla mappa</span>
              )}
            </div>
            <DialogFooter className="sm:space-x-2 sm:space-y-0 gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annulla</Button>
              <Button type="button" onClick={handleConfirm} disabled={!picked} className="gap-2">
                <Check className="w-4 h-4" /> Conferma posizione
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}