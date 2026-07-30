import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Save, Crosshair, Loader2 } from "lucide-react";
import { getPosizione } from "@/lib/timbratureUtils";
import FotoUpload from "@/components/cantiere/FotoUpload";
import DocumentiUpload from "@/components/cantiere/DocumentiUpload";

function generateCodice() {
  return "C-" + Date.now().toString(36).toUpperCase().slice(-6);
}

const EMPTY = {
  codice: "",
  nome: "",
  citta: "",
  indirizzo: "",
  cliente: "",
  attivo: true,
  ore_stimate: "",
  foto_cantiere: [],
  foto_estintore: [],
  foto_pronto_soccorso: [],
  documenti: [],
};

export default function CantiereForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({ ...EMPTY, codice: generateCodice() });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    base44.entities.Cantiere.filter({ id }).then((res) => {
      if (res[0]) setForm(res[0]);
    });
  }, [id]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.nome) { toast.error("Inserisci il nome del cantiere"); return; }
    setSaving(true);
    if (isEdit) {
      await base44.entities.Cantiere.update(id, form);
      toast.success("Cantiere aggiornato");
    } else {
      await base44.entities.Cantiere.create(form);
      toast.success("Cantiere creato");
    }
    queryClient.invalidateQueries({ queryKey: ["cantieri"] });
    setSaving(false);
    navigate("/cantieri");
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((form.indirizzo || "") + " " + (form.citta || ""))}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cantieri")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-bold">{isEdit ? "Modifica Cantiere" : "Nuovo Cantiere"}</h1>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-md shadow-primary/20">
            <Save className="w-4 h-4" />
            {saving ? "Salvataggio..." : "Salva"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Dati base */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Dati Cantiere</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">ID Cantiere</Label>
              <Input value={form.codice} disabled className="mt-1 bg-muted font-mono text-sm" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch checked={form.attivo} onCheckedChange={(v) => set("attivo", v)} />
              <span className="text-sm font-medium">{form.attivo ? "Attivo" : "Chiuso"}</span>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Nome cantiere *</Label>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} className="mt-1" placeholder="Es. Palazzo Rossi" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Città</Label>
              <Input value={form.citta} onChange={(e) => set("citta", e.target.value)} className="mt-1" placeholder="Es. Milano" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Input value={form.cliente} onChange={(e) => set("cliente", e.target.value)} className="mt-1" placeholder="Es. Mario Rossi" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Indirizzo</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={form.indirizzo}
                onChange={(e) => set("indirizzo", e.target.value)}
                className="flex-1"
                placeholder="Es. Via Roma 15"
              />
              {(form.indirizzo || form.citta) && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="outline" size="icon">
                    <MapPin className="w-4 h-4 text-primary" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Coordinate GPS */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Coordinate GPS (incolla da Google Maps)</Label>
            <Input
              value={form.latitudine != null && form.longitudine != null ? `${form.latitudine}, ${form.longitudine}` : ""}
              onChange={(e) => {
                const val = e.target.value;
                const parts = val.split(",").map((s) => parseFloat(s.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  set("latitudine", parts[0]);
                  set("longitudine", parts[1]);
                } else if (val.trim() === "") {
                  set("latitudine", null);
                  set("longitudine", null);
                }
              }}
              className="font-mono text-sm"
              placeholder="Es. 45.8533, 12.9997"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  try {
                    const pos = await getPosizione();
                    set("latitudine", pos.lat);
                    set("longitudine", pos.lon);
                    toast.success("Posizione rilevata");
                  } catch (e) {
                    toast.error("Impossibile ottenere la posizione: " + e.message);
                  }
                }}
              >
                <Crosshair className="w-4 h-4 text-primary" />
                Rileva posizione attuale
              </Button>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Raggio (m)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.raggio_metri ?? 150}
                  onChange={(e) => set("raggio_metri", parseInt(e.target.value) || 150)}
                  className="w-24"
                  placeholder="150"
                />
              </div>
            </div>
            {(form.latitudine != null && form.longitudine != null) && (
              <a href={`https://www.google.com/maps?q=${form.latitudine},${form.longitudine}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <MapPin className="w-3 h-3" /> Verifica su Maps →
              </a>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Ore stimate</Label>
            <Input
              type="number"
              min="0"
              value={form.ore_stimate ?? ""}
              onChange={(e) => set("ore_stimate", parseFloat(e.target.value) || 0)}
              className="mt-1 w-40"
              placeholder="0"
            />
          </div>
        </div>

        {/* Foto cantiere */}
        <div className="rounded-xl border border-border bg-card p-5">
          <FotoUpload
            label="Foto Cantiere"
            value={form.foto_cantiere || []}
            onChange={(v) => set("foto_cantiere", v)}
          />
        </div>

        {/* Sicurezza */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Sicurezza e Dotazioni</h2>
          <FotoUpload
            label="Foto Estintore"
            value={form.foto_estintore || []}
            onChange={(v) => set("foto_estintore", v)}
          />
          <FotoUpload
            label="Foto Cassetta Pronto Soccorso"
            value={form.foto_pronto_soccorso || []}
            onChange={(v) => set("foto_pronto_soccorso", v)}
          />
        </div>

        {/* Documenti */}
        <div className="rounded-xl border border-border bg-card p-5">
          <DocumentiUpload
            value={form.documenti || []}
            onChange={(v) => set("documenti", v)}
          />
        </div>
      </div>
    </div>
  );
}