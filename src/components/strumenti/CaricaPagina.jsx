import React, { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const dimensioni = (file) => new Promise((res, rej) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { res({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
  img.onerror = () => rej(new Error("Immagine non valida"));
  img.src = url;
});

// Carica un'immagine come nuova pagina del progetto (stored privately)
export default function CaricaPagina({ projectId, prossimoIndice, onCreata }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const scelto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    const [dim, { file_uri }] = await Promise.all([
      dimensioni(file),
      base44.integrations.Core.UploadPrivateFile({ file }),
    ]);
    const pagina = await base44.entities.SurveyPage.create({
      project_id: projectId,
      name: file.name.replace(/\.[^.]+$/, ""),
      source_type: "image",
      source_url: file_uri,
      page_index: prossimoIndice,
      ...dim,
    });
    setBusy(false);
    onCreata(pagina);
  };

  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={scelto} />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => ref.current.click()}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        <span className="hidden sm:inline">Carica immagine</span>
      </Button>
    </>
  );
}