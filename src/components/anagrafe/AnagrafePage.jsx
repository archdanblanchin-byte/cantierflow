import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

function ItemForm({ fields, initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState(initial);

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      {fields.map(f => (
        <div key={f.key}>
          <Label className="text-xs text-muted-foreground">{f.label}{f.required ? " *" : ""}</Label>
          <Input
            value={form[f.key] || ""}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            className="mt-1 h-8 text-sm"
          />
        </div>
      ))}
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={fields.filter(f => f.required).some(f => !form[f.key])}>
          <Check className="w-3.5 h-3.5 mr-1" /> Salva
        </Button>
      </div>
    </div>
  );
}

export default function AnagrafePage({ sezione }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["anagrafe", sezione.entity],
    queryFn: () => base44.entities[sezione.entity].list(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["anagrafe", sezione.entity] });

  const handleCreate = async (form) => {
    await base44.entities[sezione.entity].create({ ...form, attivo: true });
    setAdding(false);
    refresh();
  };

  const handleUpdate = async (id, form) => {
    await base44.entities[sezione.entity].update(id, form);
    setEditingId(null);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities[sezione.entity].delete(id);
    refresh();
  };

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map(item => (
        editingId === item.id ? (
          <ItemForm
            key={item.id}
            fields={sezione.fields}
            initial={item}
            onSave={(form) => handleUpdate(item.id, form)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <p className="text-sm font-medium">{item[sezione.fields[0].key] || "—"}</p>
              {sezione.fields[1] && item[sezione.fields[1].key] && (
                <p className="text-xs text-muted-foreground mt-0.5">{item[sezione.fields[1].key]}</p>
              )}
            </div>
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

      {items.length === 0 && !adding && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Nessun elemento. Aggiungi il primo!
        </div>
      )}

      {adding ? (
        <ItemForm
          fields={sezione.fields}
          onSave={handleCreate}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button variant="outline" className="w-full gap-2" onClick={() => setAdding(true)}>
          <Plus className="w-4 h-4" /> Aggiungi
        </Button>
      )}
    </div>
  );
}