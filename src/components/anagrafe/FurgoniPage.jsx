import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePermessi } from "@/hooks/usePermessi";
import { useAuth } from "@/lib/AuthContext";
import moment from "moment";
import { Plus, Pencil, Trash2, Check, X, ChevronRight, AlertTriangle, Info, Bell } from "lucide-react";
import FurgoneRegistroVocale from "./FurgoneRegistroVocale";

const FURGONE_FIELDS = [
  { key: "nome", label: "Nome", required: true, type: "text" },
  { key: "targa", label: "Targa", type: "text" },
  { key: "marca_modello", label: "Marca / Modello", type: "text" },
  { key: "assicurazione_scadenza", label: "Scadenza assicurazione", type: "date" },
  { key: "revisione_scadenza", label: "Scadenza revisione / collaudo", type: "date" },
  { key: "ultima_manutenzione", label: "Ultima manutenzione", type: "date" },
  { key: "km", label: "Chilometri", type: "number" },
  { key: "note", label: "Note generali", type: "text" },
];

const TIPI_NOTA = {
  nota: { icon: Info, classes: "bg-blue-50 text-blue-700 border-blue-200", label: "Nota" },
  problema: { icon: AlertTriangle, classes: "bg-red-50 text-red-700 border-red-200", label: "Problema" },
  avviso: { icon: Bell, classes: "bg-amber-50 text-amber-700 border-amber-200", label: "Avviso" },
};

function renderValore(field, value) {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "date") return moment(value).format("DD/MM/YYYY");
  if (field.type === "number") return Number(value).toLocaleString("it-IT");
  return value;
}

function FurgoneForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const editing = !!initial?.id;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      {editing && (
        <div className="space-y-1">
          <FurgoneRegistroVocale furgone={initial} onFields={(campi) => setForm((prev) => ({ ...prev, ...campi }))} />
          <p className="text-[11px] text-muted-foreground">Parla: l'IA compila i campi e registra problemi/segnalazioni nel registro.</p>
        </div>
      )}
      {FURGONE_FIELDS.map(f => (
        <div key={f.key}>
          <Label className="text-xs text-muted-foreground">{f.label}{f.required ? " *" : ""}</Label>
          <Input
            type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
            inputMode={f.type === "number" ? "decimal" : undefined}
            value={form[f.key] ?? ""}
            onChange={e => setForm(prev => ({
              ...prev,
              [f.key]: f.type === "number"
                ? (e.target.value === "" ? "" : Number(e.target.value))
                : e.target.value
            }))}
            className="mt-1 h-9 text-sm"
          />
        </div>
      ))}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={!form.nome}>
          <Check className="w-3.5 h-3.5 mr-1" /> Salva
        </Button>
      </div>
    </div>
  );
}

function FurgoneNotes({ furgone }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [testo, setTesto] = useState("");
  const [tipo, setTipo] = useState("nota");
  const [invio, setInvio] = useState(false);

  const { data: note = [] } = useQuery({
    queryKey: ["note-furgone", furgone.id],
    queryFn: () => base44.entities.NotaFurgone.filter({ furgone_id: furgone.id }, "-created_date", 200),
  });

  useEffect(() => {
    const unsubscribe = base44.entities.NotaFurgone.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["note-furgone", furgone.id] });
    });
    return unsubscribe;
  }, [furgone.id, queryClient]);

  const handleAdd = async () => {
    if (!testo.trim()) return;
    setInvio(true);
    try {
      await base44.entities.NotaFurgone.create({
        furgone_id: furgone.id,
        furgone_nome: furgone.nome,
        testo: testo.trim(),
        tipo,
        autore_nome: user?.full_name || "Anonimo",
        autore_email: user?.email || "",
      });
      setTesto("");
      setTipo("nota");
    } finally {
      setInvio(false);
    }
  };

  const sorted = [...note].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Bell className="w-4 h-4" /> Note e segnalazioni
      </h4>
      <div className="space-y-2 mb-3 max-h-56 overflow-y-auto pr-1">
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground">Nessuna nota. Aggiungi la prima segnalazione.</p>
        )}
        {sorted.map(n => {
          const T = TIPI_NOTA[n.tipo] || TIPI_NOTA.nota;
          const Icon = T.icon;
          return (
            <div key={n.id} className={`rounded-lg border px-3 py-2 ${T.classes}`}>
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{n.testo}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {n.autore_nome || "Anonimo"} · {moment(n.created_date).format("DD/MM/YYYY HH:mm")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        <Textarea
          value={testo}
          onChange={e => setTesto(e.target.value)}
          placeholder="Aggiungi una nota o segnala un problema..."
          className="text-sm"
          rows={2}
        />
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(TIPI_NOTA).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTipo(k)}
              className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${tipo === k ? `${v.classes} font-semibold` : "bg-muted text-muted-foreground border-border"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!testo.trim() || invio}>
          <Plus className="w-4 h-4 mr-1" /> Aggiungi
        </Button>
      </div>
    </div>
  );
}

export default function FurgoniPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = usePermessi();
  const [adding, setAdding] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editInDetail, setEditInDetail] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["anagrafe", "Furgone"],
    queryFn: () => base44.entities.Furgone.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["anagrafe", "Furgone"] });

  const handleCreate = async (form) => {
    await base44.entities.Furgone.create({ ...form, attivo: true });
    setAdding(false);
    refresh();
  };

  const handleUpdate = async (id, form) => {
    await base44.entities.Furgone.update(id, form);
    setEditInDetail(false);
    setDetailItem(null);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.Furgone.delete(id);
    setDetailItem(null);
    refresh();
  };

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => { setDetailItem(item); setEditInDetail(false); }}
          className="flex items-center justify-between w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent transition-colors"
        >
          <div>
            <p className="text-sm font-medium">{item.nome || "—"}</p>
            {item.targa && (
              <p className="text-xs text-muted-foreground mt-0.5">{item.targa}{item.marca_modello ? ` · ${item.marca_modello}` : ""}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}

      {items.length === 0 && !adding && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nessun furgone. Aggiungi il primo!
        </div>
      )}

      {adding ? (
        <FurgoneForm
          onSave={handleCreate}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button variant="outline" className="w-full gap-2" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" /> Aggiungi furgone
        </Button>
      )}

      <Dialog open={!!detailItem} onOpenChange={(v) => { if (!v) { setDetailItem(null); setEditInDetail(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailItem ? detailItem.nome : "Furgone"}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            editInDetail ? (
              <FurgoneForm
                initial={detailItem}
                onSave={(form) => handleUpdate(detailItem.id, form)}
                onCancel={() => setEditInDetail(false)}
              />
            ) : (
              <>
                <div className="space-y-2 py-1">
                  {FURGONE_FIELDS.map(f => (
                    <div key={f.key} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
                      <span className="text-xs text-muted-foreground shrink-0">{f.label}</span>
                      <span className="text-sm font-medium text-right break-words">{renderValore(f, detailItem[f.key])}</span>
                    </div>
                  ))}
                </div>
                <FurgoneNotes furgone={detailItem} />
              </>
            )
          )}
          {!editInDetail && detailItem && (
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => setEditInDetail(true)}>
                <Pencil className="w-4 h-4 mr-1" /> Modifica
              </Button>
              {isAdmin && (
                <Button variant="destructive" onClick={() => handleDelete(detailItem.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Elimina
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}