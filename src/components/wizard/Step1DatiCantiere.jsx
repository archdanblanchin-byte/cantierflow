import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import SheetSelect from "@/components/ui/sheet-select";
import { Plus, MapPin, FileText } from "lucide-react";
import MezziSection from "./MezziSection";
import FotoRapportino from "./FotoRapportino";
import NewCantiereModal from "./NewCantiereModal";
import { format } from "date-fns";

export default function Step1DatiCantiere({ data, onChange, cantieri, onCantieriRefresh }) {
  const [showNewCantiere, setShowNewCantiere] = useState(false);
  const cantiereSelezionato = cantieri?.find((c) => c.id === data.cantiere_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Cantiere e Dettagli</h2>
          <p className="text-sm text-muted-foreground">Seleziona il cantiere, aggiungi foto, note e mezzi</p>
        </div>
      </div>

      {/* Selezione cantiere */}
      <div>
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere *</Label>
        {data.cantiere_id ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mt-1.5">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{cantiereSelezionato?.nome || data.cantiere_nome}</p>
              {cantiereSelezionato?.indirizzo && <p className="text-xs text-muted-foreground truncate">{cantiereSelezionato.indirizzo}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onChange({ cantiere_id: "", cantiere_nome: "" })}>Cambia</Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-1.5">
            <div className="flex-1">
              <SheetSelect
                value={data.cantiere_id || ""}
                onValueChange={(val) => {
                  const c = (cantieri || []).find((c) => c.id === val);
                  onChange({ cantiere_id: val, cantiere_nome: c?.nome || "" });
                }}
                options={(cantieri || []).filter((c) => c.attivo !== false).map((c) => ({ value: c.id, label: c.nome }))}
                placeholder="Seleziona cantiere..."
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowNewCantiere(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
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

      <NewCantiereModal
        open={showNewCantiere}
        onClose={() => setShowNewCantiere(false)}
        onCreated={(c) => {
          onCantieriRefresh?.();
          onChange({ cantiere_id: c.id, cantiere_nome: c.nome });
        }}
      />
    </div>
  );
}