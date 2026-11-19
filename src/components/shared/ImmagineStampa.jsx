import React, { useEffect, useState } from 'react';
import { caricaImmagineStampa } from '@/lib/immaginiStampa';

/** Immagine per i documenti di stampa: usa una versione ridimensionata dell'originale. */
export default function ImmagineStampa({ src, alt = '', style, className }) {
  const [url, setUrl] = useState(src);

  useEffect(() => {
    let attivo = true;
    setUrl(src);
    if (!src) return undefined;
    caricaImmagineStampa(src).then((ridotta) => {
      if (attivo) setUrl(ridotta);
    });
    return () => {
      attivo = false;
    };
  }, [src]);

  return <img src={url} alt={alt} style={style} className={className} />;
}