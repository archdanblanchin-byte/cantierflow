import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { urlFoto } from "@/lib/campioni";

// Mostra una foto salvata nello storage privato risolvendo il link firmato.
export default function FotoCampione({ file_uri, className }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let attivo = true;
    if (!file_uri) {
      setUrl("");
      return;
    }
    urlFoto(file_uri)
      .then((u) => {
        if (attivo) setUrl(u);
      })
      .catch(() => {
        if (attivo) setUrl("");
      });
    return () => {
      attivo = false;
    };
  }, [file_uri]);

  return (
    <div className={cn("bg-muted overflow-hidden", className)}>
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
    </div>
  );
}