import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, Search, FolderOpen, FileText } from "lucide-react";
import DocumentoCard from "@/components/documenti/DocumentoCard";
import DocumentoUploadDialog from "@/components/documenti/DocumentoUploadDialog";
import DocumentoViewer from "@/components/documenti/DocumentoViewer";
import SegnalazioneDialog from "@/components/documenti/SegnalazioneDialog";
import SegnalazioniListDialog from "@/components/documenti/SegnalazioniListDialog";

export default function Documenti() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const ruolo = user?.role;
  const canManage = ruolo === "admin" || ruolo === "responsabile_tecnico";

  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [segnalazioneDoc, setSegnalazioneDoc] = useState(null);
  const [segnalazioniListDoc, setSegnalazioniListDoc] = useState(null);

  const { data: documenti = [], isLoading } = useQuery({
    queryKey: ["documenti"],
    queryFn: () => base44.entities.Documento.list("-created_date", 200),
  });

  // Conta segnalazioni per ciascun documento (solo gestori)
  const { data: segnalazioniAll = [] } = useQuery({
    queryKey: ["segnalazioni-all"],
    queryFn: () => base44.entities.SegnalazioneDocumento.filter({ risolta: false }, "-created_date", 200),
    enabled: canManage,
  });
  const segCountById = useMemo(() => {
    const m = {};
    for (const s of segnalazioniAll) m[s.documento_id] = (m[s.documento_id] || 0) + 1;
    return m;
  }, [segnalazioniAll]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return documenti;
    return documenti.filter((d) =>
      (d.nome || "").toLowerCase().includes(term) ||
      (d.descrizione || "").toLowerCase().includes(term) ||
      (d.categoria || "").toLowerCase().includes(term) ||
      (d.contenuto_testo || "").toLowerCase().includes(term)
    );
  }, [documenti, search]);

  const handleDelete = async (doc) => {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return;
    try {
      await base44.entities.Documento.delete(doc.id);
      qc.invalidateQueries(["documenti"]);
      setSelected(null);
      toast({ title: "Documento eliminato" });
    } catch (e) {
      toast({ title: "Errore", description: String(e?.message || e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border safe-area-top-pt sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg leading-tight">Documenti</h1>
            <p className="text-xs text-muted-foreground">Archivio · ricerca full-text</p>
          </div>
          {canManage && (
            <Button size="sm" className="gap-2" onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4" /> Carica
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca (es. cacciavite, inventario, materiale...)"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{filtered.length} documenti{search.trim() ? " trovati" : ""}</p>
      </div>

      {/* Lista */}
      <div className="max-w-3xl mx-auto px-4 pt-3 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{search.trim() ? "Nessun risultato" : "Nessun documento"}</p>
            <p className="text-xs mt-1">{search.trim() ? "Prova con un altro termine" : canManage ? "Carica il primo documento" : "I documenti appariranno qui"}</p>
          </div>
        )}
        {filtered.map((d) => (
          <DocumentoCard
            key={d.id}
            documento={d}
            searchTerm={search.trim()}
            onClick={() => setSelected(d)}
          />
        ))}
      </div>

      {/* Dialogs */}
      <DocumentoUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onCreated={() => qc.invalidateQueries(["documenti"])} />

      <DocumentoViewer
        documento={selected}
        searchTerm={search.trim()}
        canManage={canManage}
        onSegnalazione={(d) => setSegnalazioneDoc(d)}
        onSegnalazioni={(d) => setSegnalazioniListDoc(d)}
        onDelete={handleDelete}
        onClose={() => setSelected(null)}
        segnalazioniCount={selected ? segCountById[selected.id] : undefined}
      />

      <SegnalazioneDialog
        documento={segnalazioneDoc}
        onOpenChange={(v) => { if (!v) setSegnalazioneDoc(null); }}
        onCreated={() => { qc.invalidateQueries(["segnalazioni-all"]); if (segnalazioneDoc) qc.invalidateQueries(["segnalazioni", segnalazioneDoc.id]); toast({ title: "Segnalazione inviata", description: "Riceverai una notifica dai responsabili" }); }}
      />

      <SegnalazioniListDialog documento={segnalazioniListDoc} onOpenChange={(v) => { if (!v) setSegnalazioniListDoc(null); }} />
    </div>
  );
}