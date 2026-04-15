import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Upload, X, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NewCantiereModal from "./NewCantiereModal";
import MezziSection from "./MezziSection";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Step1DatiCantiere({ data, onChange, cantieri, onCantieriRefresh }) {
  const [showNewCantiere, setShowNewCantiere] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    onChange({ foto: [...(data.foto || []), ...urls] });
    setUploading(false);
  };

  const removePhoto = (index) => {
    const newFoto = [...(data.foto || [])];
    newFoto.splice(index, 1);
    onChange({ foto: newFoto });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Dati Cantiere</h2>
          <p className="text-sm text-muted-foreground">Informazioni generali del rapportino</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</Label>
          <Input
            type="datetime-local"
            value={data.data ? format(new Date(data.data), "yyyy-MM-dd'T'HH:mm") : ""}
            disabled
            className="mt-1.5 bg-muted"
          />
        </div>
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email Utente</Label>
          <Input value={data.user_email || ""} disabled className="mt-1.5 bg-muted" />
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere *</Label>
        <div className="flex gap-2 mt-1.5">
          <Select
            value={data.cantiere_id || ""}
            onValueChange={(val) => {
              const c = cantieri.find((c) => c.id === val);
              onChange({ cantiere_id: val, cantiere_nome: c?.nome || "" });
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Seleziona cantiere..." />
            </SelectTrigger>
            <SelectContent>
              {cantieri.filter(c => c.attivo !== false).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setShowNewCantiere(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Foto</Label>
        <div className="mt-1.5 flex flex-wrap gap-3">
          {(data.foto || []).map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-1">{uploading ? "..." : "Carica"}</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Note Generali</Label>
        <Textarea
          value={data.note_generali || ""}
          onChange={(e) => onChange({ note_generali: e.target.value })}
          placeholder="Note, osservazioni, comunicazioni..."
          className="mt-1.5 min-h-[80px]"
        />
      </div>

      <MezziSection data={data} onChange={onChange} />

      <NewCantiereModal
        open={showNewCantiere}
        onClose={() => setShowNewCantiere(false)}
        onCreated={(c) => {
          onCantieriRefresh();
          onChange({ cantiere_id: c.id, cantiere_nome: c.nome });
        }}
      />
    </div>
  );
}