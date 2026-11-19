import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COLORI } from "@/lib/misure";

export default function MisureProprieta({ misura, onChange }) {
  const [f, setF] = useState({});
  useEffect(() => {
    setF({
      label: misura?.label || "", room_name: misura?.room_name || "", text: misura?.text || "",
      lavorazione: misura?.lavorazione || "", notes: misura?.notes || "",
    });
  }, [misura?.id]);

  if (!misura) return <p className="text-xs text-slate-500 p-4 text-center">Seleziona una misura per modificarne le proprietà.</p>;

  const campo = (chiave, etichetta, Comp = Input, extra = {}) => (
    <div className="space-y-1">
      <Label className="text-xs">{etichetta}</Label>
      <Comp value={f[chiave] || ""} onChange={(e) => setF({ ...f, [chiave]: e.target.value })}
        onBlur={() => f[chiave] !== (misura[chiave] || "") && onChange(misura, { [chiave]: f[chiave] })} {...extra} />
    </div>
  );
  const ambiente = misura.type === "area" || misura.type === "room";

  return (
    <div className="p-3 space-y-3">
      {misura.type === "text" ? campo("text", "Testo") : campo("label", "Etichetta")}
      {ambiente && campo("room_name", "Nome ambiente")}
      {misura.type !== "text" && campo("lavorazione", "Lavorazione (voce di computo)")}
      <div className="space-y-1">
        <Label className="text-xs">Colore</Label>
        <div className="flex gap-1.5 flex-wrap">
          {COLORI.map((c) => (
            <button key={c} type="button" onClick={() => onChange(misura, { color: c })}
              className={`w-6 h-6 rounded-full border-2 ${misura.color === c ? "border-slate-900" : "border-white shadow"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      {(misura.type === "line" || misura.type === "quota" || misura.type === "perimeter") && (
        <div className="space-y-1">
          <Label className="text-xs">Unità</Label>
          <Select value={misura.unit || "auto"} onValueChange={(v) => onChange(misura, { unit: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatica (m)</SelectItem>
              <SelectItem value="m">Metri</SelectItem>
              <SelectItem value="cm">Centimetri</SelectItem>
              <SelectItem value="mm">Millimetri</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {campo("notes", "Note", Textarea, { rows: 3 })}
    </div>
  );
}