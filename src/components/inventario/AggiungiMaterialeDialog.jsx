import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, PackagePlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SheetSelect from "@/components/ui/sheet-select";
import CategoriaPicker from "@/components/inventario/CategoriaPicker";
import SottocategoriaPicker from "@/components/inventario/SottocategoriaPicker";
import { registraMovimento } from "@/lib/inventario";

const num = (v) => Number(String(v ?? "").replace(",", ".")) || 0;

// Aggiunge all'inventario un materiale dell'anagrafe oppure uno nuovo da zero,
// con tutti i dati gestionali (scaffale, fornitore, categoria, sottocategoria,
// soglia, note). Disponibile per amministratore e magazziniere.
export default function AggiungiMaterialeDialog({ open, onClose, materialiBase = [], onAdded }) {
  const [materialeId, setMaterialeId] = useState("");
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovaUnita, setNuovaUnita] = useState("");
  const [giacenza, setGiacenza] = useState("");
  const [soglia, setSoglia] = useState("");
  const [posizione, setPosizione] = useState("");
  const [fornitore, setFornitore] = useState("");
  const [categoria, setCategoria] = useState("");
  const [sottocategoria, setSottocategoria] = useState("");
  const [noteChecklist, setNoteChecklist] = useState("");
  const [salvando, setSalvando] = useState(false);

  const disponibili = materialiBase.filter((m) => !m.gestito_magazzino);
  const nuovo = !materialeId;

  useEffect(() => {
    if (open && !nuovo) {
      const m = materialiBase.find((x) => x.id === materialeId);
      if (m) {
        setPosizione(m.posizione_scaffale || "");
        setFornitore(m.fornitore || "");
        setCategoria(m.categoria || "");
        setSottocategoria(m.sottocategoria || "");
        setNoteChecklist(m.note_checklist || "");
        setSoglia(String(m.soglia_minima ?? 0));
      }
    }
  }, [materialeId, open]); // eslint-disable-line

  const reset = () => {
    setMaterialeId(""); setNuovoNome(""); setNuovaUnita(""); setGiacenza(""); setSoglia("");
    setPosizione(""); setFornitore(""); setCategoria(""); setSottocategoria(""); setNoteChecklist("");
  };

  const salva = async () => {
    const nome = nuovo ? nuovoNome.trim() : materialiBase.find((m) => m.id === materialeId)?.nome;
    if (!nome) {
      toast.error("Scegli un materiale o scrivine il nome");
      return;
    }
    setSalvando(true);
    try {
      const iniziale = num(giacenza);
      const sogliaNum = num(soglia);
      const campiGestione = {
        soglia_minima: sogliaNum,
        posizione_scaffale: posizione.trim(),
        fornitore: fornitore.trim(),
        categoria: categoria.trim(),
        sottocategoria: sottocategoria.trim(),
        note_checklist: noteChecklist.trim(),
      };

      let record;
      if (nuovo) {
        record = await base44.entities.MaterialeBase.create({
          nome,
          unita_misura: nuovaUnita.trim(),
          gestito_magazzino: true,
          giacenza: 0,
          ...campiGestione,
        });
      } else {
        record = await base44.entities.MaterialeBase.update(materialeId, {
          gestito_magazzino: true,
          giacenza: 0,
          ...campiGestione,
        });
      }

      if (iniziale > 0) {
        await registraMovimento({ materialeId: record.id, tipo: "carico", quantita: iniziale, nota: "Giacenza iniziale" });
      }
      toast.success(`${nome} aggiunto all'inventario`);
      reset();
      onAdded?.();
      onClose();
    } catch (err) {
      toast.error("Materiale non aggiunto: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle className="pr-6 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" /> Aggiungi materiale
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {disponibili.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Materiale dall'anagrafe</Label>
              <div className="mt-1">
                <SheetSelect
                  value={materialeId}
                  onValueChange={setMaterialeId}
                  placeholder="Scegli dall'elenco..."
                  options={disponibili.map((m) => ({ value: m.id, label: m.unita_misura ? `${m.nome} (${m.unita_misura})` : m.nome }))}
                />
              </div>
            </div>
          )}

          {nuovo && (
            <div className="rounded-xl border border-dashed border-border p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
              {disponibili.length > 0 ? "Oppure crea un materiale nuovo da zero:" : "Crea un materiale nuovo da zero:"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome / descrizione</Label>
                  <Input value={nuovoNome} onChange={(e) => setNuovoNome(e.target.value)} className="mt-1" placeholder="Es. Malta cementizia" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unità di misura</Label>
                  <Input value={nuovaUnita} onChange={(e) => setNuovaUnita(e.target.value)} className="mt-1" placeholder="sacco, kg, pz, lt" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Giacenza iniziale</Label>
              <Input type="number" inputMode="decimal" value={giacenza} onChange={(e) => setGiacenza(e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Soglia minima</Label>
              <Input type="number" inputMode="decimal" value={soglia} onChange={(e) => setSoglia(e.target.value)} className="mt-1" placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Scaffale</Label>
              <Input value={posizione} onChange={(e) => setPosizione(e.target.value)} className="mt-1" placeholder="Es. 12" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fornitore</Label>
              <Input value={fornitore} onChange={(e) => setFornitore(e.target.value)} className="mt-1" placeholder="A chi si ordina" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <div className="mt-1">
              <CategoriaPicker valore={categoria} onChange={setCategoria} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Sottocategoria</Label>
            <p className="text-[10px] text-muted-foreground mb-1">
              Usala per dividere i materiali da controllare ogni giorno
            </p>
            <div className="mt-1">
              <SottocategoriaPicker valore={sottocategoria} onChange={setSottocategoria} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Note checklist</Label>
            <Textarea value={noteChecklist} onChange={(e) => setNoteChecklist(e.target.value)} className="mt-1" rows={2} placeholder="Annotazioni dalla check list (minimi, casi da verificare)" />
          </div>

          <Button className="w-full gap-2" onClick={salva} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Aggiungi all'inventario
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}