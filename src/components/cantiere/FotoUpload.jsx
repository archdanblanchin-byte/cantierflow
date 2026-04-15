import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, X } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function FotoUpload({ label, value = [], onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    onChange([...value, ...urls]);
    setUploading(false);
  };

  const remove = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
          <Upload className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground mt-1">{uploading ? "..." : "Carica"}</span>
          <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>
    </div>
  );
}