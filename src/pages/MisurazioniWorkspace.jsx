import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { arr, computeMetrics, parseNum } from "@/lib/misure";
import usePrivateImage from "@/hooks/usePrivateImage";
import useMeasureHistory from "@/hooks/useMeasureHistory";
import MisureToolbar from "@/components/strumenti/MisureToolbar";
import MisureCanvas from "@/components/strumenti/MisureCanvas";
import PannelloMisure from "@/components/strumenti/PannelloMisure";
import CaricaPagina from "@/components/strumenti/CaricaPagina";
import ValoreDialog from "@/components/strumenti/ValoreDialog";
import EsportaMisureDialog from "@/components/strumenti/EsportaMisureDialog";

const E = base44.entities;

export default function MisurazioniWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pageId, setPageId] = useState(null);
  const [tool, setTool] = useState("select");
  const [selectedId, setSelectedId] = useState(null);
  const [dialogo, setDialogo] = useState(null); // {tipo:'calibra', px} | {tipo:'testo', punto}
  const [esporta, setEsporta] = useState(false);

  const { data: project } = useQuery({ queryKey: ["misure-progetto", id], queryFn: () => E.SurveyProject.get(id) });
  const { data: pagine = [] } = useQuery({
    queryKey: ["misure-pagine", id],
    queryFn: async () => arr(await E.SurveyPage.filter({ project_id: id }, "page_index", 200)),
  });
  const { data: misureTutte = [] } = useQuery({
    queryKey: ["misure", id],
    queryFn: async () => arr(await E.Measurement.filter({ project_id: id }, "created_date", 2000)),
  });

  const page = pagine.find((p) => p.id === pageId) || pagine[0];
  const misure = misureTutte.filter((m) => m.page_id === page?.id);
  const selezionata = misure.find((m) => m.id === selectedId) || null;
  const { url: imageUrl } = usePrivateImage(page?.source_url);

  const aggiorna = () => qc.invalidateQueries({ queryKey: ["misure", id] });
  const storia = useMeasureHistory({
    create: async (d) => { const r = await E.Measurement.create(d); await aggiorna(); return r; },
    update: async (mid, d) => { await E.Measurement.update(mid, d); await aggiorna(); },
    remove: async (mid) => { await E.Measurement.delete(mid); await aggiorna(); },
  });

  const creaMisura = async (type, points) => {
    if (type !== "text" && !page.scale) {
      toast({ title: "Calibra prima la scala", description: "Usa lo strumento Scala su una misura nota." });
      return;
    }
    const dati = { project_id: id, page_id: page.id, type, points, color: "#ef4444", unit: "auto", ...computeMetrics({ type, points }, page.scale) };
    const r = await E.Measurement.create(dati);
    await aggiorna();
    storia.registra({ kind: "create", record: r });
    setSelectedId(r.id);
    setTool("select");
  };

  const spostaPunti = async (mid, points) => {
    const m = misure.find((x) => x.id === mid);
    const dopo = { points, ...computeMetrics({ ...m, points }, page.scale) };
    const prima = { points: m.points, length: m.length, area: m.area, perimeter: m.perimeter };
    await E.Measurement.update(mid, dopo);
    await aggiorna();
    storia.registra({ kind: "update", id: mid, before: prima, after: dopo });
  };

  const modificaCampi = async (m, patch) => {
    const prima = Object.fromEntries(Object.keys(patch).map((k) => [k, m[k]]));
    await E.Measurement.update(m.id, patch);
    await aggiorna();
    storia.registra({ kind: "update", id: m.id, before: prima, after: patch });
  };

  const elimina = async (m) => {
    await E.Measurement.delete(m.id);
    await aggiorna();
    storia.registra({ kind: "delete", record: m });
    if (selectedId === m.id) setSelectedId(null);
  };

  const calibra = async (valore) => {
    const metri = parseNum(valore);
    if (!metri || metri <= 0) return;
    const scale = metri / dialogo.px;
    await E.SurveyPage.update(page.id, { scale, calibration_px: dialogo.px, calibration_m: metri });
    if (misure.length) {
      await E.Measurement.bulkUpdate(misure.map((m) => ({ id: m.id, ...computeMetrics(m, scale) })));
    }
    qc.invalidateQueries({ queryKey: ["misure-pagine", id] });
    await aggiorna();
    setDialogo(null);
    setTool("select");
  };

  const creaTesto = async (valore) => {
    const punto = dialogo.punto;
    setDialogo(null);
    const r = await E.Measurement.create({ project_id: id, page_id: page.id, type: "text", points: [punto], text: valore, color: "#0f172a", unit: "auto" });
    await aggiorna();
    storia.registra({ kind: "create", record: r });
    setTool("select");
  };

  const eliminaPagina = async () => {
    if (!window.confirm("Eliminare questa pagina e le sue misurazioni?")) return;
    await E.Measurement.deleteMany({ page_id: page.id });
    await E.SurveyPage.delete(page.id);
    setPageId(null);
    qc.invalidateQueries({ queryKey: ["misure-pagine", id] });
    aggiorna();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); storia.annulla(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); storia.ripristina(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selezionata) { e.preventDefault(); elimina(selezionata); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 shrink-0 safe-area-top-pt">
        <div className="px-3 py-2 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/strumenti/misurazioni")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{project?.name}</div>
            <div className="text-[11px] text-slate-500">
              {page?.scale ? `Scala calibrata · 1 px = ${page.scale.toFixed(4).replace(".", ",")} m` : "Scala non calibrata"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {pagine.length > 0 && (
              <Select value={page?.id} onValueChange={(v) => { setPageId(v); setSelectedId(null); }}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pagine.map((p, i) => <SelectItem key={p.id} value={p.id}>{i + 1}. {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <CaricaPagina projectId={id} prossimoIndice={pagine.length + 1}
              onCreata={(p) => { setPageId(p.id); qc.invalidateQueries({ queryKey: ["misure-pagine", id] }); }} />
            {page && (
              <>
                <Button size="sm" variant="outline" disabled={!misure.length} onClick={() => setEsporta(true)}>
                  <Download className="w-4 h-4" /><span className="hidden sm:inline">Esporta</span>
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-destructive" onClick={eliminaPagina}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {!page ? (
        <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm p-6">
          Carica un'immagine della planimetria (PNG o JPG) per iniziare a misurare.
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <MisureToolbar tool={tool} onTool={setTool}
            onUndo={storia.annulla} onRedo={storia.ripristina}
            puoAnnullare={storia.puoAnnullare} puoRipristinare={storia.puoRipristinare}
            onDelete={() => selezionata && elimina(selezionata)} puoEliminare={!!selezionata} />
          <MisureCanvas imageUrl={imageUrl} width={page.width} height={page.height}
            measurements={misure} tool={tool} selectedId={selectedId}
            onSelect={setSelectedId} onCreate={creaMisura} onMovePoints={spostaPunti}
            onCalibrate={(px) => setDialogo({ tipo: "calibra", px })}
            onText={(punto) => setDialogo({ tipo: "testo", punto })} />
          <PannelloMisure misure={misure} selezionata={selezionata}
            onSelect={setSelectedId} onDelete={elimina} onChange={modificaCampi} />
        </div>
      )}

      <ValoreDialog open={dialogo?.tipo === "calibra"} titolo="Calibra la scala" numerico
        etichetta="Lunghezza reale del segmento tracciato (metri)" onConfirm={calibra} onClose={() => setDialogo(null)} />
      <ValoreDialog open={dialogo?.tipo === "testo"} titolo="Aggiungi testo" etichetta="Testo"
        onConfirm={creaTesto} onClose={() => setDialogo(null)} />
      {page && (
        <EsportaMisureDialog open={esporta} onClose={() => setEsporta(false)} project={project || { name: "" }}
          page={page} misure={misure} imageUrl={imageUrl} />
      )}
    </div>
  );
}