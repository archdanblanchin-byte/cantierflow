import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

const TIPI = [
  { value: "ingresso", label: "Ingresso" },
  { value: "pausa_inizio", label: "Inizio pausa" },
  { value: "pausa_fine", label: "Riprendi lavoro" },
  { value: "uscita", label: "Uscita" },
  { value: "spostamento", label: "Spostamento" },
];

const LUOGHI_COMUNI = ["Capannone", "Officina", "Casa del cliente", "Magazzino"];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

// Converte un ISO in valore per datetime-local (senza timezone drift)
function toLocalInput(iso) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function TimbraturaEditDialog({
  open, timbratura, cantieri = [], onOpenChange, onSave, canEditTime = true,
}) {
  const [tipo, setTipo] = useState("ingresso");
  const [dataOra, setDataOra] = useState("");
  const [cantiereId, setCantiereId] = useState("");
  const [cantiereNome, setCantiereNome] = useState("");
  const [posizione, setPosizione] = useState("cantiere");
  const [luogoLavoro, setLuogoLavoro] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (timbratura) {
      setTipo(timbratura.tipo_evento || "ingresso");
      setDataOra(toLocalInput(timbratura.data_ora));
      setCantiereId(timbratura.cantiere_id || "");
      setCantiereNome(timbratura.cantiere_nome || "");
      setPosizione(timbratura.confermato_capannone ? "sede" : "cantiere");
      setLuogoLavoro(timbratura.lavoro_altro_luogo ? timbratura.luogo_lavoro || "" : "");
      setNote(timbratura.note || "");
    }
  }, [timbratura]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Se canEditTime è false (utente non admin), si modifica solo il tipo evento
      const payload = { tipo_evento: tipo, note };
      if (canEditTime) {
        payload.data_ora = new Date(dataOra).toISOString();
        const cantiere = cantieri.find((c) => c.id === cantiereId);
        payload.cantiere_id = cantiereId || null;
        payload.cantiere_nome = cantiere?.nome || cantiereNome || null;

        // Correzione della posizione: un timbro "in sede" non genera trasferta,
        // uno "al cantiere" sì. Il luogo di lavoro spiega i casi fuori cantiere
        // (capannone, officina, casa del cliente) e sposta il calcolo sul GPS.
        const inSede = posizione === "sede";
        const luogo = inSede ? "" : luogoLavoro.trim();
        payload.confermato_capannone = inSede;
        payload.lavoro_altro_luogo = !!luogo;
        payload.luogo_lavoro = luogo || null;
        if (!inSede) payload.in_cantiere = true;
      }
      await onSave(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  // Cantieri selezionabili: quelli aperti, più quello già collegato al timbro
  const cantieriScelta = (cantieri || [])
    .filter((c) => (c.stato ? c.stato === "aperto" : c.attivo !== false) || c.id === cantiereId)
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "it"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica timbratura</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={selectClass}
            >
              {TIPI.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Data e ora {!canEditTime && <span className="text-[10px] text-muted-foreground">(non modificabile)</span>}</Label>
            <Input
              type="datetime-local"
              value={dataOra}
              onChange={(e) => setDataOra(e.target.value)}
              disabled={!canEditTime}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cantiere {!canEditTime && <span className="text-[10px] text-muted-foreground">(non modificabile)</span>}</Label>
            {cantieriScelta.length > 0 ? (
              <select
                value={cantiereId}
                onChange={(e) => setCantiereId(e.target.value)}
                disabled={!canEditTime}
                className={selectClass}
              >
                <option value="">Nessuno</option>
                {cantieriScelta.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            ) : (
              <Input value={cantiereNome} onChange={(e) => setCantiereNome(e.target.value)} disabled={!canEditTime} />
            )}
          </div>

          {canEditTime && (
            <>
              <div className="space-y-1.5">
                <Label>Posizione del timbro</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPosizione("cantiere")}
                    className={`h-9 rounded-md border text-sm font-medium transition-colors ${
                      posizione === "cantiere"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent hover:bg-accent"
                    }`}
                  >
                    Al cantiere
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosizione("sede")}
                    className={`h-9 rounded-md border text-sm font-medium transition-colors ${
                      posizione === "sede"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent hover:bg-accent"
                    }`}
                  >
                    In sede
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {posizione === "sede"
                    ? "Timbratura in sede (capannone): non genera trasferta."
                    : "Timbratura al cantiere: la trasferta si calcola sulla posizione."}
                </p>
              </div>

              {posizione === "cantiere" && (
                <div className="space-y-1.5">
                  <Label>
                    Luogo di lavoro <span className="text-[10px] text-muted-foreground">(solo se diverso dal cantiere)</span>
                  </Label>
                  <Input
                    value={luogoLavoro}
                    onChange={(e) => setLuogoLavoro(e.target.value)}
                    placeholder="Es. Capannone, officina, casa del cliente"
                    list="luoghi-lavoro"
                  />
                  <datalist id="luoghi-lavoro">
                    {LUOGHI_COMUNI.map((l) => <option key={l} value={l} />)}
                  </datalist>
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || !dataOra}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}