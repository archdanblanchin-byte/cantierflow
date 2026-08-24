import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, FileText } from "lucide-react";

function tipoFromNome(nome) {
  return (nome.split(".").pop() || "file").toLowerCase();
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

async function estraiTesto(file_url, nome) {
  const ext = (nome.split(".").pop() || "").toLowerCase();
  try {
    if (ext === "pdf") {
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: { type: "object", properties: { contenuto: { type: "string" } }, required: ["contenuto"] },
      });
      const out = res?.output;
      if (out && typeof out === "object" && !Array.isArray(out)) return out.contenuto || "";
      if (Array.isArray(out)) return out.map((o) => o.contenuto || "").join("\n");
      return "";
    }
    // Word / altri: prova con InvokeLLM sul file allegato
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: "Estrai integralmente tutto il testo del documento allegato, in testo puro, preservando l'ordine e le sezioni. Restituisci solo il testo, senza introduzioni.",
      file_urls: [file_url],
      response_json_schema: { type: "object", properties: { contenuto: { type: "string" } }, required: ["contenuto"] },
    });
    return res?.contenuto || "";
  } catch (e) {
    console.warn("Estrazione testo fallita per", nome, e);
    return "";
  }
}

export default function DocumentoUploadDialog({ open, onOpenChange, onCreated }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [categoria, setCategoria] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fase, setFase] = useState("");

  const reset = () => {
    setNome("");
    setDescrizione("");
    setCategoria("");
    setFile(null);
    setFase("");
  };

  const submit = async () => {
    if (!file) {
      toast({ title: "Seleziona un file", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      setFase("Caricamento file...");
      const up = await base44.integrations.Core.UploadFile({ file });
      const file_url = up.file_url;
      setFase("Estrazione testo per ricerca...");
      const contenuto = await estraiTesto(file_url, file.name);
      setFase("Salvataggio documento...");
      const rec = await base44.entities.Documento.create({
        nome: nome || file.name,
        descrizione,
        categoria,
        file_url,
        file_nome: file.name,
        tipo_file: tipoFromNome(file.name),
        dimensione_bytes: file.size,
        contenuto_testo: contenuto,
        caricato_da_email: user?.email,
        caricato_da_nome: user?.full_name,
      });
      onCreated?.(rec);
      toast({ title: "Documento caricato", description: contenuto ? "Testo indicizzato per la ricerca" : "Testo non estratto (ricerca solo su nome)" });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Errore caricamento", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
      setFase("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Carica documento</DialogTitle>
          <DialogDescription>PDF o Word. Il testo viene estratto automaticamente per la ricerca.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>File *</Label>
            <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={loading} />
            {file && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" /> {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="d-nome">Nome</Label>
            <Input id="d-nome" placeholder={file?.name || "Nome documento"} value={nome} onChange={(e) => setNome(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="d-cat">Categoria</Label>
            <Input id="d-cat" placeholder="es. Magazzino, Sicurezza, Manuali" value={categoria} onChange={(e) => setCategoria(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="d-desc">Descrizione</Label>
            <Textarea id="d-desc" placeholder="Breve descrizione del contenuto" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} disabled={loading} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Annulla</Button>
          <Button onClick={submit} disabled={loading} className="gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {fase || "Caricamento..."}</> : "Carica"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}