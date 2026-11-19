import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';

export default function GpsButton({ onResult }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGps = () => {
    if (!navigator.geolocation) {
      setError('GPS non disponibile su questo dispositivo');
      return;
    }
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
          onResult({
            gps_lat: latitude,
            gps_lng: longitude,
            gps_indirizzo_completo: data.display_name || '',
            cliente_indirizzo: `${addr.road || ''} ${addr.house_number || ''}`.trim(),
            cliente_citta: addr.city || addr.town || addr.village || addr.municipality || '',
            cliente_cap: addr.postcode || '',
          });
        } catch {
          onResult({ gps_lat: latitude, gps_lng: longitude, gps_indirizzo_completo: `${latitude}, ${longitude}` });
        }
        setLoading(false);
      },
      (err) => {
        setError('Impossibile ottenere la posizione. Controlla i permessi.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <Button type="button" variant="outline" onClick={handleGps} disabled={loading} className="gap-2 w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 text-blue-500" />}
        {loading ? 'Rilevamento posizione...' : 'Usa posizione GPS'}
      </Button>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}