import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Scelta del cantiere fra quelli in anagrafe.
export default function CantiereSelect({ cantieri, value, onChange, placeholder = "Scegli il cantiere" }) {
  const ordinati = [...cantieri].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "it"));

  return (
    <Select
      value={value || ""}
      onValueChange={(id) => onChange(ordinati.find((c) => c.id === id) || null)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {ordinati.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome}
            {c.citta ? ` · ${c.citta}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}