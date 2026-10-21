import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, MessageSquare, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/lib/AuthContext";
import FotoPrivata from "@/components/foto/FotoPrivata";
import AndamentoFormDialog from "@/components/foto/AndamentoFormDialog";
import AndamentoDetailDialog from "@/components/foto/AndamentoDetailDialog";
import FotoPrecedentiSection from "@/components/foto/FotoPrecedentiSection";

export default function AndamentoPanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [inModifica, setInModifica] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);

  const { data: sessioni = [], isLoading } = useQuery({
    queryKey: ["foto-andamento"],
    queryFn: async () => {
      const page = await base44.entities.FotoAndamento.list({ sort: "-data", limit: 100 });
      return page?.items || [];
    },
  });

  const filtrate = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessioni;
    return sessioni.filter((s) =>
      [s.cantiere_nome, s.titolo, s.nota_generale].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [sessioni, query]);

  const ricarica = () => queryClient.invalidateQueries({ queryKey: ["foto-andamento"] });

  const elimina = async (sessione) => {
    if (!window.confirm("Eliminare questa sessione di foto?")) return;
    await base44.entities.FotoAndamento.delete(sessione.id);
    setDettaglio(null);
    ricarica();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Andamento cantiere</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "..." : `${filtrate.length} sessioni di foto`}
          </p>
        </div>
        <Button
          className="gap-2 shadow-lg shadow-primary/20"
          onClick={() => {
            setInModifica(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" /> Nuove foto
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
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtrate.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border">
          <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Nessuna foto di andamento</p>
          <p className="text-xs text-muted-foreground mt-1">Scegli il cantiere, carica le foto e aggiungi le note</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrate.map((s) => (
            <button
              key={s.id}
              onClick={() => setDettaglio(s)}
              className="w-full text-left rounded-2xl border border-border bg-card p-3 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{s.titolo || s.cantiere_nome}</p>
                  <p className="text-[11px] text-primary font-medium truncate">{s.cantiere_nome}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {s.data ? format(new Date(s.data), "d MMM yyyy", { locale: it }) : ""} · {(s.foto || []).length} foto ·{" "}
                    {s.user_nome || s.user_email}
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

      <FotoPrecedentiSection />

      <AndamentoFormDialog
        open={formOpen}
        sessione={inModifica}
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