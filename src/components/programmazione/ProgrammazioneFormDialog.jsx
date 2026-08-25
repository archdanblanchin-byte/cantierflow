import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Sun, CloudRain, AlertTriangle } from "lucide-react";
import CantiereCombobox from "./CantiereCombobox";

const EMPTY = {
  data: "",
  tipo_giornata: "normale",
  cantiere_id: "",
  collaboratori: [],
  furgoni: [],
  ora_arrivo_magazzino: "06:45",
  ora_arrivo_cantiere: "",
  note: "",
};

export default function ProgrammazioneFormDialog({ open, onClose, onSaved, editing, defaultData }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errore, setErrore] = useState(null);
  const qc = useQueryClient();

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-attivi"],
    queryFn: () => base44.entities.Cantiere.filter({ attivo: true }, "nome"),
  });
  const { data: collaboratori = [] } = useQuery({
    queryKey: ["collaboratori-attivi"],
    queryFn: () => base44.entities.Collaboratore.filter({ attivo: true }, "nome"),
  });
  const { data: furgoni = [] } = useQuery({
    queryKey: ["furgoni-attivi"],
    queryFn: () => base44.entities.Furgone.filter({ attivo: true }, "nome"),
  });
  const { data: existingProg = [] } = useQuery({
    queryKey: ["programmazione-giorno", form.data, form.tipo_giornata],
    queryFn: () => base44.entities.Programmazione.filter({ data: form.data, tipo_giornata: form.tipo_giornata }),
    enabled: !!form.data,
  });
  // Permessi/ferie dal calendario Google per la data selezionata
  const { data: permessiData } = useQuery({
    queryKey: ["permessi-ferie", form.data],
    queryFn: () => base44.functions.invoke("get_permessi_ferie", { data: form.data }),
    enabled: !!form.data,
  });
  const permessi = permessiData?.data?.permessi || [];

  // Mappa nome collaboratore -> { tipo, nome } in permesso/ferie per la data
  const permessiByColl = useMemo(() => {
    const map = new Map();
    if (!collaboratori.length || !permessi.length) return map;
    const norm = (s) => (s || "").trim().toLowerCase();
    const firstToken = (s) => norm(s).split(/\s+/)[0];
    for (const p of permessi) {
      const pNorm = norm(p.nome);
      const pFirst = firstToken(p.nome);
      const match = collaboratori.find(
        (c) => norm(c.nome) === pNorm || firstToken(c.nome) === pFirst
      );
      if (match) map.set(match.id, p);
    }
    return map;
  }, [collaboratori, permessi]);

  const cantieriUsati = useMemo(() => {
    const ids = new Set();
    existingProg.forEach((e) => {
      if (e.id !== editing?.id && e.cantiere_id) ids.add(e.cantiere_id);
    });
    return ids;
  }, [existingProg, editing]);

  const collaboratoriUsati = useMemo(() => {
    const ids = new Set();
    existingProg.forEach((e) => {
      if (e.id !== editing?.id) (e.collaboratori || []).forEach((c) => c.collaboratore_id && ids.add(c.collaboratore_id));
    });
    return ids;
  }, [existingProg, editing]);

  const furgoniUsati = useMemo(() => {
    const ids = new Set();
    existingProg.forEach((e) => {
      if (e.id !== editing?.id) (e.furgoni || []).forEach((f) => f.furgone_id && ids.add(f.furgone_id));
    });
    return ids;
  }, [existingProg, editing]);

  useEffect(() => {
    if (!open) return;
    setErrore(null);
    if (editing) {
      setForm({
        data: editing.data || "",
        tipo_giornata: editing.tipo_giornata || "normale",
        cantiere_id: editing.cantiere_id || "",
        collaboratori: editing.collaboratori || [],
        furgoni: editing.furgoni || [],
        ora_arrivo_magazzino: editing.ora_arrivo_magazzino || "",
        ora_arrivo_cantiere: editing.ora_arrivo_cantiere || "",
        note: editing.note || "",
      });
    } else {
      setForm({ ...EMPTY, data: defaultData || "" });
    }
  }, [editing, defaultData, open]);

  const toggleCollaboratore = (c) => {
    setForm((f) => {
      const exists = f.collaboratori.find((x) => x.collaboratore_id === c.id);
      return {
        ...f,
        collaboratori: exists
          ? f.collaboratori.filter((x) => x.collaboratore_id !== c.id)
          : [...f.collaboratori, { collaboratore_id: c.id, nome: c.nome }],
      };
    });
  };

  const toggleFurgone = (v) => {
    setForm((f) => {
      const exists = f.furgoni.find((x) => x.furgone_id === v.id);
      return {
        ...f,
        furgoni: exists
          ? f.furgoni.filter((x) => x.furgone_id !== v.id)
          : [...f.furgoni, { furgone_id: v.id, nome: v.nome }],
      };
    });
  };

  // Conflitti: entro la stessa data + stessa tipo_giornata, cantiere/collaboratori/furgoni univoci.
  // Tra le due tipologie (normale/pioggia) è ammessa la ripetizione (una sola viene eseguita).
  const checkConflicts = async () => {
    const existing = await base44.entities.Programmazione.filter({
      data: form.data,
      tipo_giornata: form.tipo_giornata,
    });
    const others = existing.filter((e) => e.id !== editing?.id);

    if (form.cantiere_id && others.some((e) => e.cantiere_id === form.cantiere_id)) {
      const c = cantieri.find((x) => x.id === form.cantiere_id);
      return `Il cantiere "${c?.nome || ""}" è già assegnato in questa giornata (${form.tipo_giornata}).`;
    }

    const usedColl = new Set();
    others.forEach((e) => (e.collaboratori || []).forEach((c) => usedColl.add(c.collaboratore_id)));
    const collDup = form.collaboratori.filter((c) => usedColl.has(c.collaboratore_id));
    if (collDup.length) {
      return `Collaboratore/i già assegnato/i in questa giornata (${form.tipo_giornata}): ${collDup.map((c) => c.nome).join(", ")}.`;
    }

    const usedFur = new Set();
    others.forEach((e) => (e.furgoni || []).forEach((f) => usedFur.add(f.furgone_id)));
    const furDup = form.furgoni.filter((f) => usedFur.has(f.furgone_id));
    if (furDup.length) {
      return `Furgone/i già assegnato/i in questa giornata (${form.tipo_giornata}): ${furDup.map((f) => f.nome).join(", ")}.`;
    }

    return null;
  };

  const handleSave = async () => {
    if (!form.data) { setErrore("Non puoi salvare: seleziona la data della programmazione."); return; }
    if (!form.cantiere_id) { setErrore("Non puoi salvare: non hai ancora selezionato il cantiere."); return; }

    setSaving(true);
    try {
      const conflict = await checkConflicts();
      if (conflict) { setErrore(conflict); setSaving(false); return; }

      const cantiere = cantieri.find((c) => c.id === form.cantiere_id);
      const payload = {
        data: form.data,
        tipo_giornata: form.tipo_giornata,
        cantiere_id: form.cantiere_id,
        cantiere_nome: cantiere?.nome || "",
        collaboratori: form.collaboratori,
        furgoni: form.furgoni,
        ora_arrivo_magazzino: form.ora_arrivo_magazzino,
        ora_arrivo_cantiere: form.ora_arrivo_cantiere,
        note: form.note,
        stato: editing?.stato || "bozza",
      };
      if (editing) {
        await base44.entities.Programmazione.update(editing.id, payload);
        toast.success("Programmazione aggiornata");
      } else {
        await base44.entities.Programmazione.create(payload);
        toast.success("Programmazione creata");
      }
      qc.invalidateQueries({ queryKey: ["programmazione-giorno"] });
      onSaved?.();
      onClose?.();
    } catch (e) {
      setErrore("Errore nel salvataggio, riprova.");
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const tipoLabel = form.tipo_giornata === "normale" ? "Giornata normale" : "Giornata di pioggia";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifica programmazione" : "Nuova programmazione"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {errore && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="font-medium">{errore}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Scenario meteo</Label>
              <Select
                value={form.tipo_giornata}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo_giornata: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normale">
                    <span className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" /> Giornata normale
                    </span>
                  </SelectItem>
                  <SelectItem value="pioggia">
                    <span className="flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-blue-500" /> Giornata di pioggia
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cantiere</Label>
            <CantiereCombobox
              cantieri={cantieri}
              value={form.cantiere_id}
              onSelect={(v) => setForm((f) => ({ ...f, cantiere_id: v }))}
              excludedIds={cantieriUsati}
            />
            {cantieriUsati.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {cantieriUsati.size} cantiere/i già assegnati in questa giornata ({form.tipo_giornata}) sono nascosti dalla lista.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Collaboratori</Label>
            <div className="rounded-lg border border-border p-2 max-h-40 overflow-y-auto space-y-1">
              {(() => {
                const visibili = collaboratori.filter(
                  (c) => permessiByColl.has(c.id) || !collaboratoriUsati.has(c.id)
                );
                if (visibili.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground p-2">
                      {collaboratori.length === 0
                        ? "Nessun collaboratore attivo"
                        : "Tutti i collaboratori sono già assegnati in questa giornata."}
                    </p>
                  );
                }
                return visibili.map((c) => {
                  const permesso = permessiByColl.get(c.id);
                  const checked = !!form.collaboratori.find((x) => x.collaboratore_id === c.id);
                  if (permesso) {
                    const isFerie = permesso.tipo === "ferie";
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 p-1.5 rounded bg-purple-100 border border-purple-300"
                        title={`${isFerie ? "In ferie" : "In permesso"} per questa data`}
                      >
                        <Checkbox checked={false} disabled />
                        <span className="text-sm text-purple-900 font-medium line-through opacity-80">{c.nome}</span>
                        {c.ruolo && <span className="text-xs text-purple-700">· {c.ruolo}</span>}
                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-purple-600 text-white">
                          {isFerie ? "Ferie" : "Permesso"}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <label key={c.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={() => toggleCollaboratore(c)} />
                      <span className="text-sm">{c.nome}</span>
                      {c.ruolo && <span className="text-xs text-muted-foreground">· {c.ruolo}</span>}
                    </label>
                  );
                });
              })()}
            </div>
            {permessiByColl.size > 0 && (
              <p className="text-xs text-purple-700">
                {permessiByColl.size} collaboratore/i in ferie/permesso per questa data (in viola, non selezionabili).
              </p>
            )}
            {collaboratoriUsati.size > 0 && (
              <p className="text-xs text-muted-foreground">{collaboratoriUsati.size} collaboratore/i già assegnati in questa giornata.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Furgoni / Mezzi</Label>
            <div className="rounded-lg border border-border p-2 max-h-40 overflow-y-auto space-y-1">
              {furgoni.filter((v) => !furgoniUsati.has(v.id)).length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">
                  {furgoni.length === 0 ? "Nessun furgone attivo" : "Tutti i furgoni sono già assegnati in questa giornata."}
                </p>
              ) : (
                furgoni
                  .filter((v) => !furgoniUsati.has(v.id))
                  .map((v) => {
                    const checked = !!form.furgoni.find((x) => x.furgone_id === v.id);
                    return (
                      <label key={v.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer">
                        <Checkbox checked={checked} onCheckedChange={() => toggleFurgone(v)} />
                        <span className="text-sm">{v.nome}</span>
                      </label>
                    );
                  })
              )}
            </div>
            {furgoniUsati.size > 0 && (
              <p className="text-xs text-muted-foreground">{furgoniUsati.size} furgone/i già assegnati in questa giornata.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Arrivo in magazzino</Label>
              <Input
                type="time"
                value={form.ora_arrivo_magazzino}
                onChange={(e) => setForm((f) => ({ ...f, ora_arrivo_magazzino: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Arrivo in cantiere</Label>
              <Input
                type="time"
                value={form.ora_arrivo_cantiere}
                onChange={(e) => setForm((f) => ({ ...f, ora_arrivo_cantiere: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note (materiali, attrezzi, mansioni)</Label>
            <Textarea
              rows={4}
              value={form.note}
              placeholder="Es. caricare assi e puntelli, portare idropulitrice, finire pittura stanza sud..."
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Verifica automatica: in {tipoLabel.toLowerCase()} non si possono ripetere cantiere, collaboratori o furgoni già assegnati. Le due programmazioni (normale/pioggia) sono alternative e indipendenti.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}