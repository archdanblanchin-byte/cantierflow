import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Campo con etichetta; numeric=true apre la tastiera decimale su mobile.
export default function Campo({ label, value, onChange, numeric = false, type = "text", className = "", ...rest }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <Label className="text-xs">{label}</Label>}
      <Input
        type={type}
        inputMode={numeric ? "decimal" : undefined}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
}