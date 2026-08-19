import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { usePermessi } from "@/hooks/usePermessi";
import { Plus, Pencil, Trash2, Check, X, ChevronRight } from "lucide-react";

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
  const { isAdmin } = usePermessi();
  const [adding, setAdding] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editInDetail, setEditInDetail] = useState(false);

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
    setEditInDetail(false);
    setDetailItem(null);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities[sezione.entity].delete(id);
    setDetailItem(null);
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
        <button
          key={item.id}
          onClick={() => { setDetailItem(item); setEditInDetail(false); }}
          className="flex items-center justify-between w-full text-left rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent transition-colors"
        >
          <div>
            <p className="text-sm font-medium">{item[sezione.fields[0].key] || "—"}</p>
            {sezione.fields[1] && item[sezione.fields[1].key] && (
              <p className="text-xs text-muted-foreground mt-0.5">{item[sezione.fields[1].key]}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
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

      <Dialog open={!!detailItem} onOpenChange={(v) => { if (!v) { setDetailItem(null); setEditInDetail(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sezione.label}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            editInDetail ? (
              <ItemForm
                fields={sezione.fields}
                initial={detailItem}
                onSave={(form) => handleUpdate(detailItem.id, form)}
                onCancel={() => setEditInDetail(false)}
              />
            ) : (
              <div className="space-y-3 py-1">
                {sezione.fields.map(f => (
                  <div key={f.key} className="border-b border-border pb-2 last:border-0">
                    <p className="text-xs text-muted-foreground">{f.label}</p>
                    <p className="text-sm font-medium mt-0.5 break-words">{detailItem[f.key] || "—"}</p>
                  </div>
                ))}
              </div>
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