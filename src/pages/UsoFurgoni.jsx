import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Car, Clock } from "lucide-react";
import moment from "moment";
import UsoFurgoneFormDialog from "@/components/usofurgone/UsoFurgoneFormDialog";

export default function UsoFurgoni() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["uso-furgoni"],
    queryFn: () => base44.entities.UsoFurgone.list("-data", 200),
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Uso Furgoni</h1>
            <p className="text-xs text-muted-foreground">Registra chi ha guidato un furgone</p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Nuovo
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Car className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessun uso registrato. Premi "Nuovo" per registrare.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map(r => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-medium text-sm truncate">{r.furgone_nome || "—"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{moment(r.data).format("DD/MM/YYYY")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Conducente: {r.collaboratore_nome || "—"}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {r.tipo_orario === "fascia" ? `${r.ora_inizio || "—"} - ${r.ora_fine || "—"}` : "Tutta la giornata"}
                </p>
                {r.nota && (
                  <p className="text-xs mt-2 p-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 break-words">
                    {r.nota}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <UsoFurgoneFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}