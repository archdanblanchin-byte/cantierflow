import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { CATEGORIE_LAVORAZIONE } from "@/lib/lavorazioni";

const CATEGORIE_NOMI = CATEGORIE_LAVORAZIONE.map(c => c.nome);

function ItemForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const tipiCategoria = CATEGORIE_LAVORAZIONE.find(c => c.nome === form.categoria)?.tipi || [];

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground">Categoria *</Label>
        <Select value={form.categoria || ""} onValueChange={v => setForm(f => ({ ...f, categoria: v, nome: "" }))}>
          <SelectTrigger className="mt-1 text-sm">
            <SelectValue placeholder="Seleziona categoria..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIE_NOMI.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {form.categoria && (
        <div>
          <Label className="text-xs text-muted-foreground">Tipo lavorazione *</Label>
          <Select value={form.nome || ""} onValueChange={v => setForm(f => ({ ...f, nome: v }))}>
            <SelectTrigger className="mt-1 text-sm">
              <SelectValue placeholder="Seleziona tipo..." />
            </SelectTrigger>
            <SelectContent>
              {tipiCategoria.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
              <SelectItem value="__custom__">✏️ Personalizzato</SelectItem>
            </SelectContent>
          </Select>
          {form.nome === "__custom__" && (
            <Input
              className="mt-2 text-sm"
              placeholder="Scrivi il tipo personalizzato..."
              value={form.nome_custom || ""}
              onChange={e => setForm(f => ({ ...f, nome_custom: e.target.value }))}
            />
          )}
        </div>
      )}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
        <Button size="sm"
          onClick={() => onSave({ ...form, nome: form.nome === "__custom__" ? (form.nome_custom || "") : form.nome })}
          disabled={!form.categoria || !form.nome || (form.nome === "__custom__" && !form.nome_custom)}
        >
          <Check className="w-3.5 h-3.5 mr-1" /> Salva
        </Button>
      </div>
    </div>
  );
}

export default function LavorazioniPage() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["anagrafe", "TipoLavorazione"],
    queryFn: () => base44.entities.TipoLavorazione.list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["anagrafe", "TipoLavorazione"] });

  const handleCreate = async (form) => {
    await base44.entities.TipoLavorazione.create(form);
    setAdding(false);
    refresh();
  };

  const handleUpdate = async (id, form) => {
    await base44.entities.TipoLavorazione.update(id, form);
    setEditingId(null);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.TipoLavorazione.delete(id);
    refresh();
  };

  // Raggruppa per categoria
  const byCategoria = items.reduce((acc, item) => {
    const cat = item.categoria || "Senza categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (isLoading) return (
    <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
  );

  return (
    <div className="space-y-4">
      {Object.entries(byCategoria).map(([cat, voci]) => (
        <div key={cat}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{cat}</p>
          <div className="space-y-2">
            {voci.map(item => (
              editingId === item.id ? (
                <ItemForm key={item.id} initial={item} onSave={f => handleUpdate(item.id, f)} onCancel={() => setEditingId(null)} />
              ) : (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-sm font-medium">{item.nome}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(item.id)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && !adding && (
        <div className="text-center py-10 text-muted-foreground text-sm">Nessuna lavorazione. Aggiungine una!</div>
      )}

      {adding ? (
        <ItemForm onSave={handleCreate} onCancel={() => setAdding(false)} />
      ) : (
        <Button variant="outline" className="w-full gap-2" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" /> Aggiungi lavorazione
        </Button>
      )}
    </div>
  );
}