import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';

/**
 * GpsIndirizzo: bottone GPS che riempie automaticamente indirizzo/città.
 * Props:
 *   value: { indirizzo, citta, lat, lng }
 *   onChange({ indirizzo, citta, lat, lng })
 */
export default function GpsIndirizzo({ value = {}, onChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rileva = () => {
    if (!navigator.geolocation) { setError('GPS non disponibile'); return; }
    setLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=it`
          );
          const data = await res.json();
          const addr = data.address || {};
          const via = [addr.road, addr.house_number].filter(Boolean).join(' ');
          const citta = addr.city || addr.town || addr.village || addr.municipality || '';
          onChange({
            ...value,
            indirizzo: via || data.display_name || '',
            citta,
            lat: latitude,
            lng: longitude,
          });
        } catch {
          onChange({ ...value, lat: latitude, lng: longitude });
        }
        setLoading(false);
      },
      (err) => {
        setError('Impossibile rilevare posizione');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Via, numero civico"
          value={value.indirizzo || ''}
          onChange={e => onChange({ ...value, indirizzo: e.target.value })}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={rileva}
          disabled={loading}
          className="gap-1.5 flex-shrink-0"
          title="Usa posizione GPS"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-primary" />}
          GPS
        </Button>
      </div>
      <Input
        placeholder="Città"
        value={value.citta || ''}
        onChange={e => onChange({ ...value, citta: e.target.value })}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value.lat && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          <a
            href={`https://maps.google.com/?q=${value.lat},${value.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline ml-1"
          >
            Apri mappa
          </a>
        </p>
      )}
    </div>
  );
}