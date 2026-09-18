import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

/**
 * Crea una nuova lavorazione nel catalogo (TipoLavorazione) e la restituisce al chiamante.
 */
export default function NuovaLavorazioneDialog({ open, onOpenChange, categorie = [], onCreated }) {
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setNome("");
    setCategoria("");
    setError("");
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!nome.trim()) {
      setError("Inserisci il nome della lavorazione");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const created = await base44.entities.TipoLavorazione.create({
        nome: nome.trim(),
        categoria: categoria.trim() || "Generale",
      });
      onCreated?.(created);
      close();
    } catch (e) {
      setError("Non è stato possibile salvare la lavorazione. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova lavorazione</DialogTitle>
          <DialogDescription>
            La lavorazione viene aggiunta al catalogo e resterà disponibile nei prossimi rapportini.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Nome lavorazione</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1"
              placeholder="Es. Rasatura e tinteggiatura" />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Categoria (opzionale)</Label>
            <Input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="mt-1"
              placeholder="Es. Edilizia"
              list="categorie-lavorazioni" />
            <datalist id="categorie-lavorazioni">
              {categorie.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>Annulla</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "Salvo..." : "Crea lavorazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}