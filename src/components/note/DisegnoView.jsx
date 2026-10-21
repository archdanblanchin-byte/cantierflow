import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Mostra un disegno salvato (file privato) risolvendo il link temporaneo.
 */
export default function DisegnoView({ file_uri, className, onClick }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let attivo = true;
    if (!file_uri) { setUrl(""); return; }
    base44.integrations.Core.CreateFileSignedUrl({ file_uri })
      .then((r) => { if (attivo) setUrl(r.signed_url); })
      .catch(() => {});
    return () => { attivo = false; };
  }, [file_uri]);

  if (!url) return null;
  return <img src={url} alt="Disegno" className={className} onClick={onClick} />;
}