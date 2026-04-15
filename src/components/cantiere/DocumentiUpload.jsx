import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const TIPI_DOC = ["Scheda cantiere", "Ponteggio", "PiMUS", "POS", "Altro"];

export default function DocumentiUpload({ value = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [tipoCustom, setTipoCustom] = useState({});

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const nuovi = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      nuovi.push({ nome: file.name, url: file_url, tipo: "" });
    }
    onChange([...value, ...nuovi]);
    setUploading(false);
  };

  const updateDoc = (index, field, val) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const remove = (index) => onChange(value.filter((_, i) => i !== index));

  return (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Documenti Allegati</Label>
      <div className="mt-1.5 space-y-2">
        {value.map((doc, i) => (
          <div key={i} className="rounded-lg border border-border p-3 bg-muted/20 flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={doc.nome || ""}
                onChange={(e) => updateDoc(i, "nome", e.target.value)}
                placeholder="Nome documento"
                className="text-sm h-8"
              />
              <Select
                value={doc.tipo || ""}
                onValueChange={(v) => updateDoc(i, "tipo", v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPI_DOC.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {doc.tipo === "Altro" && (
                <Input
                  value={tipoCustom[i] || ""}
                  onChange={(e) => {
                    setTipoCustom({ ...tipoCustom, [i]: e.target.value });
                    updateDoc(i, "tipo", e.target.value);
                  }}
                  placeholder="Specifica tipo..."
                  className="text-sm h-8 sm:col-span-2"
                />
              )}
            </div>
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-shrink-0">
              Apri
            </a>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => remove(i)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <label className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 px-4 py-3 cursor-pointer transition-colors w-full">
          <Upload className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{uploading ? "Caricamento..." : "Carica documenti"}</span>
          <input type="file" multiple className="hidden" onChange={handleUpload} />
        </label>
      </div>
    </div>
  );
}