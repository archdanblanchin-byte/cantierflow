import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getPosizione } from "@/lib/timbratureUtils";
import { Crosshair, Loader2, AlertTriangle } from "lucide-react";

const VUOTO = { nome: "", indirizzo: "", cliente: "", latitudine: null, longitudine: null };

export default function NewCantiereModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const ruolo = user?.role === "user" ? "collaboratore" : user?.role;
  // Amministrazione e responsabili tecnici possono creare un cantiere anche
  // senza coordinate e completarle dopo; per gli altri è obbligatoria.
  const canManage = ruolo === "admin" || ruolo === "responsabile_tecnico";

  const [form, setForm] = useState(VUOTO);
  const [loading, setLoading] = useState(false);
  const [rilevando, setRilevando] = useState(false);
  const [errore, setErrore] = useState("");

  const haGps = form.latitudine != null && form.longitudine != null;

  const rilevaPosizione = async () => {
    setRilevando(true);
    setErrore("");
    try {
      const pos = await getPosizione();
      setForm((f) => ({ ...f, latitudine: pos.lat, longitudine: pos.lon }));
    } catch (e) {
      setErrore("Impossibile rilevare la posizione: " + (e?.message || e));
    } finally {
      setRilevando(false);
    }
  };

  const impostaCoordinate = (val) => {
    const parts = val.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setForm((f) => ({ ...f, latitudine: parts[0], longitudine: parts[1] }));
    } else if (val.trim() === "") {
      setForm((f) => ({ ...f, latitudine: null, longitudine: null }));
    }
  };

  const handleSubmit = async () => {
    if (!form.nome) return;
    if (!canManage && !haGps) {
      setErrore("Rileva la geolocalizzazione del cantiere: è obbligatoria per poter timbrare.");
      return;
    }
    setErrore("");
    setLoading(true);
    const created = await base44.entities.Cantiere.create({
      nome: form.nome,
      indirizzo: form.indirizzo,
      cliente: form.cliente,
      latitudine: form.latitudine,
      longitudine: form.longitudine,
      attivo: true,
      stato: "aperto",
      anno: new Date().getFullYear(),
    });
    setLoading(false);
    setForm(VUOTO);
    onCreated(created);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo Cantiere</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome cantiere *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es. Cantiere Via Roma" />
          </div>
          <div>
            <Label>Indirizzo</Label>
            <Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} placeholder="Es. Via Roma 15, Milano" />
          </div>
          <div>
            <Label>Cliente</Label>
            <Input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} placeholder="Es. Rossi Costruzioni" />
          </div>
          <div>
            <Label>Geolocalizzazione {canManage ? "" : "*"}</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={haGps ? `${form.latitudine}, ${form.longitudine}` : ""}
                onChange={(e) => impostaCoordinate(e.target.value)}
                className="font-mono text-sm"
                placeholder="Es. 45.8533, 12.9997"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={rilevando}
                onClick={rilevaPosizione}
                title="Rileva posizione attuale"
              >
                {rilevando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4 text-primary" />}
              </Button>
            </div>
            {!haGps && (
              <p className={`mt-1 flex items-start gap-1 text-[11px] ${canManage ? "text-amber-700" : "text-red-600"}`}>
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {canManage
                  ? "Senza coordinate le timbrature non vengono verificate nell'area del cantiere."
                  : "Obbligatoria: rileva la posizione mentre sei sul cantiere."}
              </p>
            )}
          </div>
          {errore && <p className="text-xs text-red-600">{errore}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!form.nome || loading || (!canManage && !haGps)}>
            {loading ? "Creazione..." : "Crea Cantiere"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}