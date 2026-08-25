import { useEffect, useId, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { ReportPDFContent, captureAndSavePdf } from "@/components/ReportPDF";
import { toast } from "sonner";

export default function CantiereListPdfButton({ cantiere, rapportini = [] }) {
  const rawId = useId();
  const contentId = `pdf-list-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const [foto, trasferteAll, timb] = await Promise.all([
        base44.entities.Foto.filter({ cantiere_id: cantiere.id }),
        base44.entities.Trasferta.list(),
        base44.entities.Timbratura.filter({ cantiere_id: cantiere.id }),
      ]);
      const trasferte = trasferteAll.filter(
        (t) => t.primo_cantiere_id === cantiere.id || t.ultimo_cantiere_id === cantiere.id
      );
      const spostamenti = timb.filter((t) => t.tipo_evento === "spostamento");
      setData({ foto, trasferte, spostamenti });
    } catch (e) {
      toast.error("Errore caricamento dati PDF");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading || !data) return;
    const el = document.getElementById(contentId);
    if (!el) return;
    let cancelled = false;
    (async () => {
      try {
        await captureAndSavePdf(el, cantiere?.nome);
        if (!cancelled) toast.success("PDF generato");
      } catch (e) {
        if (!cancelled) toast.error("Errore generazione PDF");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setData(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loading, data, contentId, cantiere]);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-primary"
        title="PDF riepilogo cantiere"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      </Button>
      {loading && data && (
        <div style={{ position: "fixed", left: "-99999px", top: 0, width: 794, background: "#ffffff", zIndex: -1 }}>
          <ReportPDFContent
            id={contentId}
            cantiere={cantiere}
            rapportini={rapportini}
            foto={data.foto}
            trasferte={data.trasferte}
            spostamenti={data.spostamenti}
          />
        </div>
      )}
    </>
  );
}