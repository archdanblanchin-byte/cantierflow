import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import SheetSelect from "@/components/ui/sheet-select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TIPI = [
  { value: "personale", label: "Personale" },
  { value: "promemoria", label: "Promemoria / Sveglia" },
  { value: "lista", label: "Lista (materiale/attrezzi)" },
  { value: "messaggio", label: "Messaggio a collega" },
];
const PRIORITA = [
  { value: "bassa", label: "Bassa" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function NotaFormDialog({ open, onOpenChange, initial, onSaved }) {
  const { data: cantieri = [] } = useQuery({ queryKey: ["cantieri"], queryFn: () => base44.entities.Cantiere.list() });
  const { data: furgoni = [] } = useQuery({ queryKey: ["furgoni"], queryFn: () => base44.entities.Furgone.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: collaboratori = [] } = useQuery({ queryKey: ["collaboratori"], queryFn: () => base44.entities.Collaboratore.list() });

  const [testo, setTesto] = useState("");
  const [tipo, setTipo] = useState("personale");
  const [items, setItems] = useState([]);
  const [cantiereId, setCantiereId] = useState("");
  const [furgoneId, setFurgoneId] = useState("");
  const [destinatari, setDestinatari] = useState([]);
  const [dataPromemoria, setDataPromemoria] = useState("");
  const [priorita, setPriorita] = useState("media");
  const [saving, setSaving] = useState(false);

  // Opzioni destinatari: utenti app + collaboratori con email
  const destOptions = (() => {
    const opts = [];
    const seen = new Set();
    users.forEach((u) => {
      if (u.email && !seen.has(u.email)) { seen.add(u.email); opts.push({ email: u.email, nome: u.full_name || u.email }); }
    });
    collaboratori.forEach((c) => {
      if (c.user_email && !seen.has(c.user_email)) { seen.add(c.user_email); opts.push({ email: c.user_email, nome: c.nome }); }
    });
    return opts;
  })();

  useEffect(() => {
    if (!open) return;
    const init = initial || {};
    setTesto(init.testo || "");
    setTipo(init.tipo || "personale");
    setItems((init.items || []).map((i) => ({ text: i.text || (typeof i === "string" ? i : ""), done: !!i.done })));
    let cId = "";
    if (init.cantiere_id) cId = init.cantiere_id;
    else if (init.cantiere_nome) {
      const low = init.cantiere_nome.toLowerCase();
      const m = cantieri.find((c) => c.nome?.toLowerCase() === low || c.nome?.toLowerCase().includes(low));
      if (m) cId = m.id;
    }
    setCantiereId(cId);
    let fId = "";
    if (init.furgone_id) fId = init.furgone_id;
    else if (init.furgone_nome) {
      const low = init.furgone_nome.toLowerCase();
      const m = furgoni.find((f) => f.nome?.toLowerCase() === low || f.nome?.toLowerCase().includes(low));
      if (m) fId = m.id;
    }
    setFurgoneId(fId);
    let destEmails = [];
    if (Array.isArray(init.destinatari_email)) destEmails = init.destinatari_email;
    else if (Array.isArray(init.destinatari_nomi)) {
      init.destinatari_nomi.forEach((n) => {
        const low = n.toLowerCase();
        const match = destOptions.find((o) => o.nome?.toLowerCase().includes(low) || low.includes(o.nome?.toLowerCase()));
        if (match) destEmails.push(match.email);
      });
    }
    setDestinatari(destEmails);
    setDataPromemoria(toLocalInput(init.data_promemoria));
    setPriorita(init.priorita || "media");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, cantieri, furgoni, users, collaboratori]);

  const toggleDest = (email) => setDestinatari((d) => (d.includes(email) ? d.filter((x) => x !== email) : [...d, email]));
  const addItem = () => setItems((it) => [...it, { text: "", done: false }]);
  const updateItem = (i, text) => setItems((it) => it.map((x, idx) => (idx === i ? { ...x, text } : x)));
  const removeItem = (i) => setItems((it) => it.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!testo.trim()) { toast.error("Scrivi il contenuto della nota"); return; }
    setSaving(true);
    try {
      const payload = {
        testo: testo.trim(),
        tipo,
        items: tipo === "lista" ? items.filter((i) => i.text.trim()).map((i) => ({ text: i.text.trim(), done: !!i.done })) : [],
        cantiere_id: cantiereId || null,
        cantiere_nome: cantiereId ? cantieri.find((c) => c.id === cantiereId)?.nome || null : null,
        furgone_id: furgoneId || null,
        furgone_nome: furgoneId ? furgoni.find((f) => f.id === furgoneId)?.nome || null : null,
        destinatari_email: destinatari,
        destinatari_nomi: destinatari.map((e) => destOptions.find((o) => o.email === e)?.nome || e),
        data_promemoria: dataPromemoria ? new Date(dataPromemoria).toISOString() : null,
        priorita,
        origine: initial?._vocale ? "vocale" : "manuale",
      };
      await base44.entities.Nota.create(payload);
      toast.success("Nota creata");
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Errore: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?._vocale ? "Revisiona nota vocale" : "Nuova nota"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Contenuto</Label>
            <Textarea rows={3} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Es. Ricordami di caricare gli attrezzi nel furgone..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <SheetSelect value={tipo} onValueChange={setTipo} options={TIPI} placeholder="Tipo" />
            </div>
            <div className="space-y-1">
              <Label>Priorità</Label>
              <SheetSelect value={priorita} onValueChange={setPriorita} options={PRIORITA} placeholder="Priorità" />
            </div>
          </div>

          {tipo === "lista" && (
            <div className="space-y-2">
              <Label>Voci lista</Label>
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={it.text} onChange={(e) => updateItem(i, e.target.value)} placeholder="es. Trapano" />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1" onClick={addItem}><Plus className="w-4 h-4" />Aggiungi voce</Button>
            </div>
          )}

          {tipo === "promemoria" && (
            <div className="space-y-1">
              <Label>Quando ricordare</Label>
              <Input type="datetime-local" value={dataPromemoria} onChange={(e) => setDataPromemoria(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Cantiere</Label>
              <SheetSelect value={cantiereId} onValueChange={setCantiereId} options={cantieri.filter((c) => c.attivo !== false).map((c) => ({ value: c.id, label: c.nome }))} placeholder="Nessuno" />
            </div>
            <div className="space-y-1">
              <Label>Furgone</Label>
              <SheetSelect value={furgoneId} onValueChange={setFurgoneId} options={furgoni.filter((f) => f.attivo !== false).map((f) => ({ value: f.id, label: f.nome }))} placeholder="Nessuno" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Destinatari (chi deve riceverla)</Label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2 space-y-1">
              {destOptions.length === 0 && <p className="text-xs text-muted-foreground p-2">Nessun utente/collega con email disponibile.</p>}
              {destOptions.map((o) => (
                <label key={o.email} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer">
                  <Checkbox checked={destinatari.includes(o.email)} onCheckedChange={() => toggleDest(o.email)} />
                  <span className="text-sm">{o.nome} <span className="text-xs text-muted-foreground">({o.email})</span></span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Senza destinatari la nota è personale (visibile solo a te).</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Salva nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}