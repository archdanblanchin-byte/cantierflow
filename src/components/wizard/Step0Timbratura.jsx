import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Clock } from "lucide-react";
import NewCantiereModal from "./NewCantiereModal";
import TimbraturaRapportino from "./TimbraturaRapportino";

export default function Step0Timbratura({ data, onChange, cantieri, onCantieriRefresh, rapportinoId, onEnsureDraft, showErrors }) {
  const [showNewCantiere, setShowNewCantiere] = useState(false);
  const cantiereSelezionato = cantieri?.find((c) => c.id === data.cantiere_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Timbratura</h2>
          <p className="text-sm text-muted-foreground">Registra ingresso, pause e uscita</p>
        </div>
      </div>

      {!data.cantiere_id ? (
        <div>
          <Label className={`text-xs font-medium uppercase tracking-wider ${showErrors ? "text-destructive" : "text-muted-foreground"}`}>
            Seleziona Cantiere *
          </Label>
          <div className="flex gap-2 mt-1.5">
            <Select
              value={data.cantiere_id || ""}
              onValueChange={(val) => {
                const c = cantieri.find((c) => c.id === val);
                onChange({ cantiere_id: val, cantiere_nome: c?.nome || "" });
              }}
            >
              <SelectTrigger className={`flex-1 ${showErrors ? "border-destructive ring-1 ring-destructive" : ""}`}>
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
          {showErrors && (
            <p className="text-xs text-destructive mt-1">⚠️ Seleziona un cantiere per timbrare</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{cantiereSelezionato?.nome || data.cantiere_nome}</p>
            {cantiereSelezionato?.indirizzo && (
              <p className="text-xs text-muted-foreground">{cantiereSelezionato.indirizzo}</p>
            )}
          </div>
        </div>
      )}

      {data.cantiere_id && (
        <TimbraturaRapportino
          cantiere={cantiereSelezionato || { id: data.cantiere_id, nome: data.cantiere_nome }}
          rapportinoId={rapportinoId}
          onEnsureDraft={onEnsureDraft}
          onChange={onChange}
        />
      )}

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