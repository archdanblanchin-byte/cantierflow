import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { History } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { labelTipo } from "@/lib/inventario";

export default function MovimentiStorico({ materialeId }) {
  const { data: movimenti = [], isLoading } = useQuery({
    queryKey: ["movimenti-materiale", materialeId],
    queryFn: async () => {
      const page = await base44.entities.MovimentoMateriale.filter(
        { materiale_id: materialeId },
        { sort: "-data", limit: 40 }
      );
      return page?.items || [];
    },
    enabled: !!materialeId,
  });

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" /> Movimenti
      </p>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Caricamento...</p>
      ) : movimenti.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nessun movimento registrato</p>
      ) : (
        <div className="space-y-1.5">
          {movimenti.map((m) => {
            const entrata = m.tipo === "carico";
            return (
              <div key={m.id} className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">{labelTipo(m.tipo)}</span>
                  <span className={entrata ? "text-xs font-semibold text-emerald-600" : "text-xs font-semibold text-rose-600"}>
                    {entrata ? "+" : "−"}
                    {m.quantita} {m.unita_misura || ""}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {m.data ? format(new Date(m.data), "d MMM yyyy HH:mm", { locale: it }) : ""}
                  {m.user_nome ? ` · ${m.user_nome}` : ""}
                  {m.cantiere_nome ? ` · ${m.cantiere_nome}` : ""}
                  {m.giacenza_dopo != null ? ` · giacenza ${m.giacenza_dopo}` : ""}
                </p>
                {m.nota && <p className="text-[11px] italic text-muted-foreground mt-0.5">{m.nota}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}