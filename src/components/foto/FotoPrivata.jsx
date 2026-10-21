import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { urlFoto } from "@/lib/fotoCantiere";

// Mostra una foto salvata nello storage privato risolvendo il link firmato.
export default function FotoPrivata({ file_uri, className, fit = "cover", alt = "" }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let attivo = true;
    if (!file_uri) {
      setUrl("");
      return;
    }
    urlFoto(file_uri)
      .then((u) => attivo && setUrl(u))
      .catch(() => attivo && setUrl(""));
    return () => {
      attivo = false;
    };
  }, [file_uri]);

  return (
    <div className={cn("bg-muted overflow-hidden", className)}>
      {url && <img src={url} alt={alt} className={cn("w-full h-full", fit === "contain" ? "object-contain" : "object-cover")} />}
    </div>
  );
}