import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
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

// Converte una data in valore per datetime-local (senza timezone drift)
function toLocalInput(date) {
  const d = new Date(date);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

// L'amministratore inserisce una timbratura a nome di un collaboratore
// (es. timbro dimenticato o cellulare scarico). La posizione viene indicata
// a mano: al cantiere (trasferta calcolata) oppure in sede (nessuna trasferta).
export default function TimbraturaAddDialog({ open, cantieri = [], onOpenChange, onSave }) {
  const [persone, setPersone] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [tipo, setTipo] = useState("ingresso");
  const [dataOra, setDataOra] = useState("");
  const [cantiereId, setCantiereId] = useState("");
  const [posizione, setPosizione] = useState("cantiere");
  const [luogoLavoro, setLuogoLavoro] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUserEmail("");
    setTipo("ingresso");
    setDataOra(toLocalInput(new Date()));
    setCantiereId("");
    setPosizione("cantiere");
    setLuogoLavoro("");
    setNota("");

    let attivo = true;
    Promise.all([base44.entities.User.list(), base44.entities.Collaboratore.list()])
      .then(([users, collaboratori]) => {
        if (!attivo) return;
        const nomePerEmail = new Map(
          (collaboratori || [])
            .filter((c) => c.user_email)
            .map((c) => [c.user_email.toLowerCase(), c.nome])
        );
        setPersone(
          (users || [])
            .map((u) => ({
              email: u.email,
              nome: nomePerEmail.get((u.email || "").toLowerCase()) || u.full_name || u.email,
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "it"))
        );
      })
      .catch(() => {});
    return () => { attivo = false; };
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const persona = persone.find((p) => p.email === userEmail);
      const cantiere = cantieri.find((c) => c.id === cantiereId);
      const inSede = posizione === "sede";
      const luogo = inSede ? "" : luogoLavoro.trim();

      await onSave({
        user_email: persona?.email || "",
        user_nome: persona?.nome || "",
        tipo_evento: tipo,
        data_ora: new Date(dataOra).toISOString(),
        cantiere_id: cantiereId || null,
        cantiere_nome: cantiere?.nome || null,
        confermato_capannone: inSede,
        lavoro_altro_luogo: !!luogo,
        luogo_lavoro: luogo || null,
        in_cantiere: !inSede,
        nota: nota.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const cantieriScelta = (cantieri || [])
    .filter((c) => (c.stato ? c.stato === "aperto" : c.attivo !== false))
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "it"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi timbratura</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Collaboratore</Label>
            <select
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className={selectClass}
            >
              <option value="">Seleziona collaboratore...</option>
              {persone.map((p) => (
                <option key={p.email} value={p.email}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectClass}>
              {TIPI.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Data e ora</Label>
            <Input
              type="datetime-local"
              value={dataOra}
              onChange={(e) => setDataOra(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Cantiere</Label>
            <select
              value={cantiereId}
              onChange={(e) => setCantiereId(e.target.value)}
              className={selectClass}
            >
              <option value="">Nessuno</option>
              {cantieriScelta.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

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
                list="luoghi-lavoro-add"
              />
              <datalist id="luoghi-lavoro-add">
                {LUOGHI_COMUNI.map((l) => <option key={l} value={l} />)}
              </datalist>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nota</Label>
            <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || !userEmail || !dataOra}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}