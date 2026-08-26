import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Folder, Image as ImageIcon, CheckCircle2, AlertTriangle, Loader2, RefreshCw } from "lucide-react";

export default function ImportaFotoDrive() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);

  const [preview, setPreview] = useState(null);
  const [working, setWorking] = useState(false);
  const [replace, setReplace] = useState(false);
  const [report, setReport] = useState(null);

  const loadFolders = async () => {
    setLoadingFolders(true);
    try {
      const res = await base44.functions.invoke("importa_foto_drive", { mode: "list_folders" });
      setFolders(res.data?.folders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFolders(false);
    }
  };

  useEffect(() => { loadFolders(); }, []);

  const filteredFolders = useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return folders;
    return folders.filter((f) => f.name.toLowerCase().includes(t));
  }, [folders, filter]);

  const runPreview = async () => {
    if (!selectedFolder) return;
    setWorking(true); setPreview(null); setReport(null);
    try {
      const res = await base44.functions.invoke("importa_foto_drive", { mode: "preview", folder_id: selectedFolder.id });
      setPreview(res.data);
    } catch (e) {
      setPreview({ error: String(e?.message || e) });
    } finally { setWorking(false); }
  };

  const runImport = async () => {
    if (!selectedFolder) return;
    if (!confirm(replace
      ? "Confermi l'importazione SOSTITUENDO le foto esistenti dei cantieri abbinate?"
      : "Confermi l'importazione? Le foto verranno aggiunte a quelle esistenti.")) return;
    setWorking(true); setReport(null);
    try {
      const res = await base44.functions.invoke("importa_foto_drive", { mode: "import", folder_id: selectedFolder.id, replace, limit: 50 });
      setReport(res.data);
    } catch (e) {
      setReport({ error: String(e?.message || e) });
    } finally { setWorking(false); }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Importa foto da Drive</h1>
            <p className="text-xs text-muted-foreground">Riconosce il cantiere dal codice nel nome file</p>
          </div>
          <Button variant="ghost" size="icon" onClick={loadFolders} title="Aggiorna cartelle">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {!isAdmin && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 p-3 text-sm">
            Solo gli amministratori possono importare le foto.
          </div>
        )}

        {/* Step 1: cartella */}
        <section>
          <h2 className="font-semibold text-sm mb-2 flex items-center gap-2"><Folder className="w-4 h-4" /> 1. Scegli la cartella Drive</h2>
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtra per nome cartella..." />
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border">
            {loadingFolders && [0,1,2,3].map((i) => <div key={i} className="p-3"><Skeleton className="h-5 w-2/3" /></div>)}
            {!loadingFolders && filteredFolders.length === 0 && <div className="p-3 text-sm text-muted-foreground">Nessuna cartella</div>}
            {!loadingFolders && filteredFolders.map((f) => (
              <button
                key={f.id}
                onClick={() => { setSelectedFolder(f); setPreview(null); setReport(null); }}
                className={`w-full text-left p-3 text-sm hover:bg-accent flex items-center gap-2 ${selectedFolder?.id === f.id ? "bg-primary/10" : ""}`}
              >
                <Folder className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate flex-1">{f.name}</span>
                {selectedFolder?.id === f.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
          {selectedFolder && (
            <p className="text-xs text-muted-foreground mt-2">Selezionata: <span className="font-medium text-foreground">{selectedFolder.name}</span></p>
          )}
        </section>

        {/* Step 2: anteprima */}
        <section>
          <h2 className="font-semibold text-sm mb-2 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> 2. Anteprima abbinamenti</h2>
          <Button onClick={runPreview} disabled={!selectedFolder || working || !isAdmin} className="gap-2">
            {working && !report ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon />} Analizza cartella
          </Button>

          {preview && !preview.error && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="Foto trovate" value={preview.total} />
              <Stat label="Abbinate" value={preview.matched} tone="green" />
              <Stat label="Non abbinate" value={preview.unmatched} tone="amber" />
              {preview.unmatched_files?.length > 0 && (
                <div className="col-span-3 mt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">File non riconosciuti:</p>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-border p-2 text-xs space-y-0.5">
                    {preview.unmatched_files.map((n, i) => <div key={i} className="truncate text-muted-foreground">{n}</div>)}
                  </div>
                </div>
              )}
              {preview.results?.length > 0 && (
                <div className="col-span-3 mt-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Abbinamenti:</p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {preview.results.map((r, i) => (
                      <div key={i} className="p-2 text-xs flex items-center justify-between gap-2">
                        <span className="truncate flex-1">{r.file}</span>
                        <span className="font-medium text-primary truncate max-w-[45%]">{r.cantiere_nome}</span>
                        {r.cantiere_stato === "chiuso" && <Badge variant="secondary" className="text-[9px]">chiuso</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {preview?.error && <p className="text-sm text-destructive mt-2">{preview.error}</p>}
        </section>

        {/* Step 3: importa */}
        {preview && !preview.error && preview.matched > 0 && (
          <section>
            <h2 className="font-semibold text-sm mb-2 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> 3. Importa</h2>
            <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="w-4 h-4" />
              Sostituisci le foto esistenti (le attuali danneggiate verranno rimosse)
            </label>
            <Button onClick={runImport} disabled={working || !isAdmin} className="gap-2">
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Avvia importazione (max 50 per volta)
            </Button>

            {report && !report.error && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Importate" value={report.imported} tone="green" />
                  <Stat label="Errori" value={report.errors} tone={report.errors ? "red" : "muted"} />
                  {report.remaining > 0 && <Stat label="Restanti" value={report.remaining} tone="amber" />}
                </div>
                {report.remaining > 0 && (
                  <p className="text-xs text-muted-foreground">Altre {report.remaining} foto da importare: premi di nuovo "Avvia importazione" per continuare.</p>
                )}
                <div className="rounded-lg border border-border max-h-64 overflow-y-auto divide-y divide-border">
                  {report.report?.map((r, i) => (
                    <div key={i} className="p-2 text-xs flex items-start gap-2">
                      {r.error ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      <span className="truncate flex-1">{r.file}</span>
                      <span className="text-muted-foreground truncate max-w-[40%]">{r.cantiere}</span>
                      {r.error && <span className="text-destructive">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report?.error && <p className="text-sm text-destructive mt-2">{report.error}</p>}
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const toneCls = tone === "green" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : tone === "red" ? "text-destructive" : tone === "muted" ? "text-muted-foreground" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
      <div className={`text-xl font-bold ${toneCls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SearchIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}