import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NewCantiereModal from "./NewCantiereModal";
import MezziSection from "./MezziSection";
import FotoRapportino from "./FotoRapportino";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Step1DatiCantiere({ data, onChange, cantieri, onCantieriRefresh }) {
  const [showNewCantiere, setShowNewCantiere] = useState(false);

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