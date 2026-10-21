import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";
import FotoPrivata from "@/components/foto/FotoPrivata";
import MarketingFormDialog from "@/components/foto/MarketingFormDialog";
import MarketingDetailDialog from "@/components/foto/MarketingDetailDialog";

export default function MarketingPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [inModifica, setInModifica] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);

  const { data: confronti = [], isLoading } = useQuery({
    queryKey: ["foto-marketing"],
    queryFn: async () => {
      const page = await base44.entities.FotoMarketing.list({ sort: "-created_date", limit: 100 });
      return page?.items || [];
    },
  });

  const filtrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return confronti;
    return confronti.filter((c) =>
      [c.titolo, c.cantiere_nome, c.nota_prima, c.nota_dopo].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [confronti, query]);

  const ricarica = () => queryClient.invalidateQueries({ queryKey: ["foto-marketing"] });

  const elimina = async (confronto) => {
    if (!window.confirm("Eliminare questo confronto?")) return;
    await base44.entities.FotoMarketing.delete(confronto.id);
    setDettaglio(null);
    ricarica();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Marketing prima/dopo</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "..." : `${filtrati.length} confronti`}
          </p>
        </div>
        <Button
          className="gap-2 shadow-lg shadow-primary/20"
          onClick={() => {
            setInModifica(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Nuovo
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per cantiere o titolo..."
          className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : filtrati.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border">
          <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Nessun confronto prima/dopo</p>
          <p className="text-xs text-muted-foreground mt-1">Scatta il prima, poi il dopo con la stessa inquadratura</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrati.map((c) => (
            <button
              key={c.id}
              onClick={() => setDettaglio(c)}
              className="w-full text-left rounded-2xl border border-border bg-card p-3 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{c.titolo || c.cantiere_nome}</p>
                  <p className="text-[11px] text-primary font-medium truncate">{c.cantiere_nome}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {c.data_prima ? format(new Date(c.data_prima), "d MMM yyyy", { locale: it }) : ""}
                    {c.data_dopo ? ` → ${format(new Date(c.data_dopo), "d MMM yyyy", { locale: it })}` : " → dopo da scattare"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.user_nome || c.user_email}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <FotoPrivata file_uri={c.foto_prima} className="w-16 h-16 rounded-lg border border-border" />
                  <FotoPrivata file_uri={c.foto_dopo} className="w-16 h-16 rounded-lg border border-border" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <MarketingFormDialog open={formOpen} confronto={inModifica} onClose={() => setFormOpen(false)} onSaved={ricarica} />
      <MarketingDetailDialog
        open={Boolean(dettaglio)}
        confronto={dettaglio}
        isAdmin={isAdmin}
        onClose={() => setDettaglio(null)}
        onDelete={elimina}
        onEdit={(c) => {
          setDettaglio(null);
          setInModifica(c);
          setFormOpen(true);
        }}
      />
    </div>
  );
}