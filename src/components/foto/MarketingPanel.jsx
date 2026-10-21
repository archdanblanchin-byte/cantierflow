import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Megaphone, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";
import { gruppiCantiere, inCantiere } from "@/lib/fotoCantiere";
import FotoPrivata from "@/components/foto/FotoPrivata";
import CartelleCantiere from "@/components/foto/CartelleCantiere";
import MarketingFormDialog from "@/components/foto/MarketingFormDialog";
import MarketingDetailDialog from "@/components/foto/MarketingDetailDialog";

export default function MarketingPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [cartella, setCartella] = useState(null);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [inModifica, setInModifica] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);

  const { data: confronti = [], isLoading } = useQuery({
    queryKey: ["foto-marketing"],
    queryFn: async () => {
      const page = await base44.entities.FotoMarketing.list({ sort: "-created_date", limit: 200 });
      return page?.items || [];
    },
  });

  const gruppi = useMemo(() => gruppiCantiere(confronti), [confronti]);

  const visibili = useMemo(() => {
    const dentro = cartella ? confronti.filter((c) => inCantiere(c, cartella.id)) : [];
    const q = query.trim().toLowerCase();
    if (!q) return dentro;
    return dentro.filter((c) =>
      [c.titolo, c.nota_prima, c.nota_dopo].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [confronti, cartella, query]);

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
        <div className="flex items-center gap-2 min-w-0">
          {cartella && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCartella(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{cartella ? cartella.nome : "Marketing prima/dopo"}</h2>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "..." : cartella ? `${visibili.length} confronti` : `${gruppi.length} cantieri`}
            </p>
          </div>
        </div>
        <Button
          className="gap-2 shadow-lg shadow-primary/20 shrink-0"
          onClick={() => {
            setInModifica(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Nuovo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : !cartella ? (
        gruppi.length === 0 ? (
          <div className="text-center py-14 rounded-2xl border border-dashed border-border">
            <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Nessun confronto prima/dopo</p>
            <p className="text-xs text-muted-foreground mt-1">Scatta il prima, poi il dopo con la stessa inquadratura</p>
          </div>
        ) : (
          <CartelleCantiere gruppi={gruppi} onApri={(g) => { setCartella(g); setQuery(""); }} unita="confronti" />
        )
      ) : (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per titolo o nota..."
              className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm"
            />
          </div>

          {visibili.length === 0 ? (
            <div className="text-center py-14 rounded-2xl border border-dashed border-border">
              <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Nessun confronto in questo cantiere</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibili.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setDettaglio(c)}
                  className="w-full text-left rounded-2xl border border-border bg-card p-3 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{c.titolo || "Confronto prima/dopo"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {c.data_prima ? format(new Date(c.data_prima), "d MMM yyyy", { locale: it }) : ""}
                        {c.data_dopo
                          ? ` → ${format(new Date(c.data_dopo), "d MMM yyyy", { locale: it })}`
                          : " → dopo da scattare"}
                      </p>
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
        </>
      )}

      <MarketingFormDialog
        open={formOpen}
        confronto={inModifica}
        cantierePredefinito={cartella}
        onClose={() => setFormOpen(false)}
        onSaved={ricarica}
      />
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