import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Camera, MessageSquare, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";
import { gruppiCantiere, inCantiere } from "@/lib/fotoCantiere";
import FotoPrivata from "@/components/foto/FotoPrivata";
import CartelleCantiere from "@/components/foto/CartelleCantiere";
import AndamentoFormDialog from "@/components/foto/AndamentoFormDialog";
import AndamentoDetailDialog from "@/components/foto/AndamentoDetailDialog";
import FotoPrecedentiSection from "@/components/foto/FotoPrecedentiSection";

export default function AndamentoPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [cartella, setCartella] = useState(null);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [inModifica, setInModifica] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);

  const { data: sessioni = [], isLoading } = useQuery({
    queryKey: ["foto-andamento"],
    queryFn: async () => {
      const page = await base44.entities.FotoAndamento.list({ sort: "-data", limit: 200 });
      return page?.items || [];
    },
  });

  // Anche le foto caricate in precedenza fanno parte delle cartelle di cantiere.
  const { data: precedenti = [] } = useQuery({
    queryKey: ["foto-precedenti"],
    queryFn: async () => {
      const page = await base44.entities.Foto.list({ sort: "-created_date", limit: 100 });
      return page?.items || [];
    },
  });

  const gruppi = useMemo(() => gruppiCantiere([...sessioni, ...precedenti]), [sessioni, precedenti]);

  const visibili = useMemo(() => {
    const dentro = cartella ? sessioni.filter((s) => inCantiere(s, cartella.id)) : [];
    const q = query.trim().toLowerCase();
    if (!q) return dentro;
    return dentro.filter((s) =>
      [s.titolo, s.nota_generale].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [sessioni, cartella, query]);

  const ricarica = () => queryClient.invalidateQueries({ queryKey: ["foto-andamento"] });

  const elimina = async (sessione) => {
    if (!window.confirm("Eliminare questa sessione di foto?")) return;
    await base44.entities.FotoAndamento.delete(sessione.id);
    setDettaglio(null);
    ricarica();
  };

  const nuovaSessione = () => {
    setInModifica(null);
    setFormOpen(true);
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
            <h2 className="font-semibold truncate">{cartella ? cartella.nome : "Andamento cantiere"}</h2>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "..." : cartella ? `${visibili.length} sessioni` : `${gruppi.length} cantieri`}
            </p>
          </div>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20 shrink-0" onClick={nuovaSessione}>
          <Plus className="w-4 h-4" /> Nuove foto
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
            <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Nessuna foto di andamento</p>
            <p className="text-xs text-muted-foreground mt-1">Scegli il cantiere, carica le foto e aggiungi le note</p>
          </div>
        ) : (
          <CartelleCantiere gruppi={gruppi} onApri={(g) => { setCartella(g); setQuery(""); }} />
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
              <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Nessuna foto in questo cantiere</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibili.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setDettaglio(s)}
                  className="w-full text-left rounded-2xl border border-border bg-card p-3 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{s.titolo || "Sessione foto"}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {s.data ? format(new Date(s.data), "d MMM yyyy", { locale: it }) : ""} · {(s.foto || []).length} foto
                      </p>
                      {s.nota_generale && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 flex gap-1">
                          <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                          {s.nota_generale}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(s.foto || []).slice(0, 3).map((f, i) => (
                        <FotoPrivata
                          key={i}
                          file_uri={f.url_annotata || f.file_uri}
                          className="w-14 h-14 rounded-lg border border-border"
                        />
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <FotoPrecedentiSection filtroCantiere={cartella.id} />
        </>
      )}

      <AndamentoFormDialog
        open={formOpen}
        sessione={inModifica}
        cantierePredefinito={cartella}
        onClose={() => setFormOpen(false)}
        onSaved={ricarica}
      />
      <AndamentoDetailDialog
        open={Boolean(dettaglio)}
        sessione={dettaglio}
        isAdmin={isAdmin}
        onClose={() => setDettaglio(null)}
        onDelete={elimina}
        onEdit={(s) => {
          setDettaglio(null);
          setInModifica(s);
          setFormOpen(true);
        }}
      />
    </div>
  );
}