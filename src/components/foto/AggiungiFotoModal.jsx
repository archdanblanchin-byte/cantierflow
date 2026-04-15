import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Upload, Camera, Palette, Loader2, ArrowRight, Edit3 } from "lucide-react";
import FotoEditor from "./FotoEditor";

export default function AggiungiFotoModal({ open, onClose, cantieri = [], onSaved }) {
  const [step, setStep] = useState("upload"); // upload | annotate | done
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("foto");
  const [imageUrl, setImageUrl] = useState("");
  const [colore, setColore] = useState("#ef4444");
  const [nota, setNota] = useState("");
  const [cantiereId, setCantiereId] = useState("");
  const [annotazioni, setAnnotazioni] = useState([]);
  const [urlAnnotata, setUrlAnnotata] = useState("");

  const reset = () => {
    setStep("upload");
    setImageUrl("");
    setNota("");
    setColore("#ef4444");
    setAnnotazioni([]);
    setUrlAnnotata("");
    setTipo("foto");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const handleSaveAnnotations = ({ annotazioni: ann, url_annotata }) => {
    setAnnotazioni(ann);
    setUrlAnnotata(url_annotata);
    setStep("upload");
  };

  const handleSave = async () => {
    if (!cantiereId) return;
    setSaving(true);
    let finalUrl = imageUrl;
    if (urlAnnotata && tipo === "foto") {
      // Upload annotated version
      const blob = await (await fetch(urlAnnotata)).blob();
      const file = new File([blob], "annotata.jpg", { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      finalUrl = file_url;
    }
    const cantiere = cantieri.find((c) => c.id === cantiereId);
    const payload = {
      url: imageUrl || colore,
      url_annotata: finalUrl !== imageUrl ? finalUrl : undefined,
      nota,
      cantiere_id: cantiereId,
      cantiere_nome: cantiere?.nome || "",
      annotazioni,
      tipo,
      colore: tipo === "codice_colore" ? colore : undefined,
    };
    await base44.entities.Foto.create(payload);
    setSaving(false);
    onSaved?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "annotate" ? (
          <FotoEditor
            imageUrl={imageUrl}
            annotazioni={annotazioni}
            onSave={handleSaveAnnotations}
            onCancel={() => setStep("upload")}
          />
        ) : (
          <div className="space-y-5 p-1">
            <h2 className="text-lg font-bold">Aggiungi Foto</h2>

            {/* Cantiere */}
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere *</Label>
              <Select value={cantiereId} onValueChange={setCantiereId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Seleziona cantiere..." />
                </SelectTrigger>
                <SelectContent>
                  {cantieri.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTipo("foto")}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${tipo === "foto" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <Camera className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-semibold">Foto / Immagine</p>
                <p className="text-xs text-muted-foreground mt-0.5">Scatta o carica dalla galleria</p>
              </button>
              <button
                onClick={() => setTipo("codice_colore")}
                className={`rounded-xl border-2 p-4 text-left transition-colors ${tipo === "codice_colore" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <Palette className="w-5 h-5 text-primary mb-2" />
                <p className="text-sm font-semibold">Codice Colore</p>
                <p className="text-xs text-muted-foreground mt-0.5">Registra un colore campione</p>
              </button>
            </div>

            {/* Foto upload */}
            {tipo === "foto" && (
              <div className="space-y-3">
                {imageUrl ? (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img src={urlAnnotata || imageUrl} alt="" className="w-full max-h-56 object-contain bg-black" />
                      {annotazioni.length > 0 && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          {annotazioni.length} annotazioni
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep("annotate")}>
                        <Edit3 className="w-3.5 h-3.5" />
                        {annotazioni.length > 0 ? "Modifica annotazioni" : "Aggiungi annotazioni"}
                      </Button>
                      <label className="cursor-pointer">
                        <Button variant="ghost" size="sm" asChild>
                          <span className="gap-1.5"><Upload className="w-3.5 h-3.5" />Cambia foto</span>
                        </Button>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-6 flex flex-col items-center gap-2 transition-colors">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground text-center">Scatta foto</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-6 flex flex-col items-center gap-2 transition-colors">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground text-center">Carica da galleria</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                )}
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Caricamento...
                  </div>
                )}
              </div>
            )}

            {/* Codice colore */}
            {tipo === "codice_colore" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Seleziona colore</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={colore}
                      onChange={(e) => setColore(e.target.value)}
                      className="w-16 h-16 rounded-xl border border-border cursor-pointer"
                    />
                    <div>
                      <p className="font-mono text-sm font-bold">{colore.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">Codice HEX</p>
                    </div>
                    <div className="w-16 h-16 rounded-xl border border-border" style={{ background: colore }} />
                  </div>
                </div>

                {/* Foto opzionale per codice colore */}
                <div>
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Foto di riferimento (opzionale)</Label>
                  {imageUrl ? (
                    <div className="space-y-2 mt-2">
                      <div className="relative rounded-xl overflow-hidden border border-border">
                        <img src={urlAnnotata || imageUrl} alt="" className="w-full max-h-48 object-contain bg-black" />
                        {annotazioni.length > 0 && (
                          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                            {annotazioni.length} annotazioni
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setStep("annotate")}>
                          <Edit3 className="w-3.5 h-3.5" />
                          {annotazioni.length > 0 ? "Modifica annotazioni" : "Aggiungi annotazioni"}
                        </Button>
                        <label className="cursor-pointer">
                          <Button variant="ghost" size="sm" asChild>
                            <span className="gap-1.5"><Upload className="w-3.5 h-3.5" />Cambia foto</span>
                          </Button>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-4 flex flex-col items-center gap-2 transition-colors">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">Scatta foto</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                      </label>
                      <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-4 flex flex-col items-center gap-2 transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center">Carica da galleria</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  )}
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Caricamento...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Nota */}
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nota / Descrizione</Label>
              <Textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Aggiungi una nota a questa foto..."
                className="mt-1.5 min-h-[70px]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleClose}>Annulla</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !cantiereId || (tipo === "foto" && !imageUrl)}
                className="gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Salva
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}