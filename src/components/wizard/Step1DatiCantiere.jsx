import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MezziSection from "./MezziSection";
import FotoRapportino from "./FotoRapportino";
import { format } from "date-fns";
import { FileText } from "lucide-react";

export default function Step1DatiCantiere({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Dettagli</h2>
          <p className="text-sm text-muted-foreground">Foto, note e mezzi</p>
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

      <FotoRapportino
        foto={data.foto_annotate || []}
        onChange={(v) => onChange({ foto_annotate: v })}
      />

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
    </div>
  );
}