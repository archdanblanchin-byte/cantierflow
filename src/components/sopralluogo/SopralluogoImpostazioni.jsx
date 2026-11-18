import { useState } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useSopralluogoAnagrafiche from "@/hooks/useSopralluogoAnagrafiche";
import { ANAGRAFICHE_DEFAULT, TIPI_ANAGRAFICA } from "@/lib/sopralluogo";

function Elenco({ tipo, label, anag }) {
  const [nome, setNome] = useState("");
  const custom = anag.custom.filter((c) => c.tipo === tipo);
  const aggiungi = async () => {
    try {
      const ok = await anag.aggiungi(tipo, nome);
      if (!ok) toast.error("Voce vuota o già presente");
      else setNome("");
    } catch {
      toast.error("Non è stato possibile salvare la voce");
    }
  };
  return (
    <Card className="p-4 space-y-3">
      <h2 className="font-semibold">{label}</h2>
      <div className="flex flex-wrap gap-1.5">
        {ANAGRAFICHE_DEFAULT[tipo].map((v) => <span key={v} className="text-xs bg-muted rounded-full px-2.5 py-1">{v}</span>)}
        {custom.map((c) => (
          <span key={c.id} className="text-xs bg-primary/10 text-primary rounded-full pl-2.5 pr-1 py-1 flex items-center gap-1">
            {c.nome}
            <button type="button" aria-label="Rimuovi" onClick={() => anag.rimuovi(c.id)}><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Nuova voce" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && aggiungi()} />
        <Button onClick={aggiungi} disabled={!nome.trim()} className="gap-1"><Plus className="w-4 h-4" />Aggiungi</Button>
      </div>
    </Card>
  );
}

export default function SopralluogoImpostazioni({ onBack }) {
  const anag = useSopralluogoAnagrafiche();
  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}><ArrowLeft className="w-4 h-4" />Elenco</Button>
        <h1 className="text-xl font-bold">Impostazioni sopralluogo</h1>
      </div>
      <p className="text-xs text-muted-foreground">Le voci di base sono fisse; quelle in blu sono personalizzate e si possono rimuovere.</p>
      {TIPI_ANAGRAFICA.map((t) => <Elenco key={t.key} tipo={t.key} label={t.label} anag={anag} />)}
    </div>
  );
}