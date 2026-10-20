import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X } from "lucide-react";
import usePersoneTimbratura from "@/hooks/usePersoneTimbratura";

const TIPI = [
  { value: "ingresso", label: "Ingresso" },
  { value: "pausa_inizio", label: "Inizio pausa" },
  { value: "pausa_fine", label: "Riprendi lavoro" },
  { value: "uscita", label: "Uscita" },
  { value: "spostamento", label: "Spostamento" },
];

// Sequenza tipica di una giornata: l'admin corregge o completa la giornata di un
// collaboratore inserendo tutti i timbri in una volta sola.
const SEQUENZA_INIZIALE = [
  { tipo_evento: "ingresso", ora: "07:30" },
  { tipo_evento: "pausa_inizio", ora: "12:00" },
  { tipo_evento: "pausa_fine", ora: "13:00" },
  { tipo_evento: "uscita", ora: "17:00" },
];

const LUOGHI_COMUNI = ["Capannone", "Officina", "Casa del cliente", "Magazzino"];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function oggiIso() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Più timbri in sequenza per lo stesso collaboratore e lo stesso giorno.
export default function TimbraturaSequenzaDialog({
  open, cantieri = [], onOpenChange, onSave, prefillEmail = "", prefillData = null,
}) {
  const persone = usePersoneTimbratura(open);
  const [userEmail, setUserEmail] = useState("");
  const [data, setData] = useState("");
  const [cantiereId, setCantiereId] = useState("");
  const [posizione, setPosizione] = useState("cantiere");
  const [luogoLavoro, setLuogoLavoro] = useState("");
  const [nota, setNota] = useState("");
  const [righe, setRighe] = useState(SEQUENZA_INIZIALE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUserEmail(prefillEmail || "");
    setData(prefillData || oggiIso());
    setCantiereId("");
    setPosizione("cantiere");
    setLuogoLavoro("");
    setNota("");
    setRighe(SEQUENZA_INIZIALE.map((r) => ({ ...r })));
  }, [open, prefillEmail, prefillData]);

  const aggiornaRiga = (i, campo, valore) =>
    setRighe((rs) => rs.map((r, idx) => (idx === i ? { ...r, [campo]: valore } : r)));

  const rimuoviRiga = (i) => setRighe((rs) => rs.filter((_, idx) => idx !== i));

  const aggiungiRiga = () =>
    setRighe((rs) => [...rs, { tipo_evento: "ingresso", ora: "08:00" }]);

  const valida = userEmail && data && righe.length > 0 && righe.every((r) => r.ora);

  const handleSave = async () => {
    setSaving(true);
    try {
      const persona = persone.find((p) => p.email === userEmail);
      const cantiere = cantieri.find((c) => c.id === cantiereId);
      const inSede = posizione === "sede";
      const luogo = inSede ? "" : luogoLavoro.trim();

      const payloads = righe
        .slice()
        .sort((a, b) => a.ora.localeCompare(b.ora))
        .map((r) => {
          const [h, m] = r.ora.split(":").map(Number);
          const d = new Date(`${data}T00:00:00`);
          d.setHours(h || 0, m || 0, 0, 0);
          return {
            user_email: persona?.email || "",
            user_nome: persona?.nome || "",
            tipo_evento: r.tipo_evento,
            data_ora: d.toISOString(),
            cantiere_id: cantiereId || null,
            cantiere_nome: cantiere?.nome || null,
            confermato_capannone: inSede,
            lavoro_altro_luogo: !!luogo,
            luogo_lavoro: luogo || null,
            in_cantiere: !inSede,
            nota: nota.trim() || null,
          };
        });

      await onSave(payloads);
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
          <DialogTitle>Aggiungi sequenza timbrature</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Collaboratore</Label>
            <select value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className={selectClass}>
              <option value="">Seleziona collaboratore...</option>
              {persone.map((p) => (
                <option key={p.email} value={p.email}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Giorno</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Cantiere</Label>
            <select value={cantiereId} onChange={(e) => setCantiereId(e.target.value)} className={selectClass}>
              <option value="">Nessuno</option>
              {cantieriScelta.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Posizione dei timbri</Label>
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
                ? "Timbrature in sede (capannone): non generano trasferta."
                : "Timbrature al cantiere: la trasferta si calcola sulla posizione."}
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
                list="luoghi-lavoro-seq"
              />
              <datalist id="luoghi-lavoro-seq">
                {LUOGHI_COMUNI.map((l) => <option key={l} value={l} />)}
              </datalist>
            </div>
          )}

          <div className="space-y-2">
            <Label>Eventi della giornata</Label>
            {righe.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={r.tipo_evento}
                  onChange={(e) => aggiornaRiga(i, "tipo_evento", e.target.value)}
                  className={selectClass}
                >
                  {TIPI.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <Input
                  type="time"
                  value={r.ora}
                  onChange={(e) => aggiornaRiga(i, "ora", e.target.value)}
                  className="w-28 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => rimuoviRiga(i)}
                  className="w-8 h-8 rounded-md border border-border flex items-center justify-center shrink-0 hover:bg-destructive/10"
                  aria-label="Rimuovi evento"
                >
                  <X className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={aggiungiRiga}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-accent transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Aggiungi evento
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Nota (vale per tutte le timbrature)</Label>
            <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving || !valida}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Aggiungi {righe.length > 1 ? `${righe.length} timbrature` : "timbratura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}