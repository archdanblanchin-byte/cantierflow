import { useEffect, useId, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ReportPDFContent, captureToPdfFile } from "@/components/ReportPDF";

export default function CantierePdfGenerator({ cantiere, active, onComplete, onError }) {
  const rawId = useId();
  const contentId = `pdf-close-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!active || !cantiere?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const [rapportini, foto, trasferteAll, timb] = await Promise.all([
          base44.entities.Rapportino.filter({ cantiere_id: cantiere.id }),
          base44.entities.Foto.filter({ cantiere_id: cantiere.id }),
          base44.entities.Trasferta.list(),
          base44.entities.Timbratura.filter({ cantiere_id: cantiere.id }),
        ]);
        const trasferte = trasferteAll.filter(
          (t) => t.primo_cantiere_id === cantiere.id || t.ultimo_cantiere_id === cantiere.id
        );
        const spostamenti = timb.filter((t) => t.tipo_evento === "spostamento");
        if (!cancelled) setData({ rapportini, foto, trasferte, spostamenti });
      } catch (e) {
        if (!cancelled) onError?.(e?.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [active, cantiere?.id]);

  useEffect(() => {
    if (!active || !data) return;
    const el = document.getElementById(contentId);
    if (!el) return;
    let cancelled = false;
    (async () => {
      try {
        const file = await captureToPdfFile(el, cantiere?.nome);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        if (!cancelled) onComplete?.(file_url);
      } catch (e) {
        if (!cancelled) onError?.(e?.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [active, data, contentId, cantiere]);

  if (!active || !data) return null;
  return (
    <div style={{ position: "fixed", left: "-99999px", top: 0, width: 794, background: "#ffffff", zIndex: -1 }}>
      <ReportPDFContent
        id={contentId}
        cantiere={cantiere}
        rapportini={data.rapportini}
        foto={data.foto}
        trasferte={data.trasferte}
        spostamenti={data.spostamenti}
      />
    </div>
  );
}