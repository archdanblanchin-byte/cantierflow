import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SheetSelect from "@/components/ui/sheet-select";
import { NOTE_OPTIONS, isDinamicaLibera } from "@/lib/dinamicheParticolari";

// Tendina "Dinamiche particolari": elenco delle voci ricorrenti + campo libero
// quando si sceglie "Altro". Condivisa da rapportino e note della giornata.
export default function DinamicaSelect({
  value,
  onChange,
  label = "Dinamica particolare",
  placeholder = "Nessuna",
}) {
  const isAltro = isDinamicaLibera(value);
  const selectValue = isAltro ? "Altro" : value || "";

  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <SheetSelect
        value={selectValue}
        onValueChange={(v) => onChange(v)}
        options={NOTE_OPTIONS.map((o) => ({ value: o, label: o }))}
        placeholder={placeholder}
      />
      {(selectValue === "Altro" || isAltro) && (
        <Textarea
          value={isAltro && value !== "Altro" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 min-h-[56px] text-xs"
          placeholder="Descrivi la dinamica..."
        />
      )}
    </div>
  );
}