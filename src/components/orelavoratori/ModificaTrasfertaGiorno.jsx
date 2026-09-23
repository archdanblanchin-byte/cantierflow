import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Save, CheckCircle2, Loader2 } from "lucide-react";
import { TRASFERTA_CONFIG, classificaTrasfertaSplit } from "@/lib/timbratureUtils";

/**
 * Correzione manuale della trasferta di una giornata.
 * Salva una trasferta confermata (nuova o aggiornata): timbrature e rapportini
 * restano quelli registrati, cambia solo il dato usato per le buste paga.
 */
export default function ModificaTrasfertaGiorno({
  dataKey,
  collaboratore,
  trasfertaEsistente,
  trasfertaCalcolata,
  config,
  onSalvata,
}) {
  const queryClient = useQueryClient();
  const [aperto, setAperto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [kmAndata, setKmAndata] = useState(
    String(trasfertaEsistente?.km_andata ?? trasfertaCalcolata?.km_andata ?? "")
  );
  const [kmRitorno, setKmRitorno] = useState(
    String(trasfertaEsistente?.km_ritorno ?? trasfertaCalcolata?.km_ritorno ?? "")
  );
  const [tipo, setTipo] = useState(
    trasfertaEsistente?.tipo_trasferta || trasfertaCalcolata?.tipo_trasferta || ""
  );
  const [mezzoProprio, setMezzoProprio] = useState(!!trasfertaEsistente?.mezzo_proprio);
  const [note, setNote] = useState(trasfertaEsistente?.note || "");

  const kmA = kmAndata === "" ? null : parseFloat(kmAndata);
  const kmR = kmRitorno === "" ? null : parseFloat(kmRitorno);
  const split = classificaTrasfertaSplit(kmA, kmR, config);
  const tipoEffettivo = tipo || split?.tipo_trasferta || "";

  const salva = async () => {
    setSalvando(true);
    try {
      const payload = {
        data: dataKey,
        user_email: collaboratore?.user_email || "",
        user_nome: collaboratore?.nome || "",
        primo_cantiere_nome:
          trasfertaCalcolata?.primo_cantiere_nome || trasfertaEsistente?.primo_cantiere_nome || null,
        ultimo_cantiere_nome:
          trasfertaCalcolata?.ultimo_cantiere_nome || trasfertaEsistente?.ultimo_cantiere_nome || null,
        km_andata: kmA,
        km_ritorno: kmR,
        km_totali: split?.km_totali ?? null,
        fascia_andata: split?.fascia_andata ?? null,
        fascia_ritorno: split?.fascia_ritorno ?? null,
        tipo_trasferta: tipoEffettivo || null,
        mezzo_proprio: mezzoProprio,
        note,
        confermata: true,
      };
      if (trasfertaEsistente?.id) {
        await base44.entities.Trasferta.update(trasfertaEsistente.id, payload);
      } else {
        await base44.entities.Trasferta.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["trasferte-mese"] });
      onSalvata?.();
    } finally {
      setSalvando(false);
    }
  };

  if (!aperto) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setAperto(true)}>
        <Pencil className="w-4 h-4 mr-1.5" />
        {trasfertaEsistente ? "Correggi trasferta" : "Aggiungi / correggi trasferta"}
      </Button>
    );
  }

  return (
    <Card className="p-3 space-y-3 border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Correzione trasferta</p>
        {trasfertaEsistente?.confermata && (
          <Badge className="gap-1 bg-emerald-600">
            <CheckCircle2 className="w-3 h-3" /> confermata
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Km andata</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={kmAndata}
            onChange={(e) => setKmAndata(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Km ritorno</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={kmRitorno}
            onChange={(e) => setKmRitorno(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-[10px] text-muted-foreground shrink-0">Fascia</Label>
        <Select value={tipoEffettivo} onValueChange={setTipo}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue placeholder="Seleziona..." />
          </SelectTrigger>
          <SelectContent>
            {["T0", "T1", "T2", "T3", "T4"].map((f) => (
              <SelectItem key={f} value={f}>
                {TRASFERTA_CONFIG[f]?.label || f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id={`mp-${dataKey}`} checked={mezzoProprio} onCheckedChange={setMezzoProprio} />
        <Label htmlFor={`mp-${dataKey}`} className="text-xs">Mezzo proprio</Label>
      </div>

      <Input
        placeholder="Nota sulla correzione..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="h-8 text-xs"
      />

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => setAperto(false)}>
          Annulla
        </Button>
        <Button size="sm" className="flex-1 gap-1.5" onClick={salva} disabled={salvando}>
          {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salva
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Timbrature e rapportini restano invariati: cambia solo il dato della trasferta.
      </p>
    </Card>
  );
}