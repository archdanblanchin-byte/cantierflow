import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Palette, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { TIPI_CAMPIONE, coloreValido, testoSuColore } from "@/lib/campioni";
import CodiceColoreFormDialog from "@/components/foto/CodiceColoreFormDialog";
import CodiceColoreDetailDialog from "@/components/foto/CodiceColoreDetailDialog";

export default function CodiciColorePanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [inModifica, setInModifica] = useState(null);
  const [dettaglio, setDettaglio] = useState(null);

  const { data: schede = [], isLoading } = useQuery({
    queryKey: ["codici-colore"],
    queryFn: async () => {
      const page = await base44.entities.CodiceColore.list({ sort: "-data", limit: 200 });
      return page?.items || [];
    },
  });

  const filtrate = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schede.filter((s) => {
      if (tipo && s.tipo !== tipo) return false;
      if (!q) return true;
      return [s.nome, s.marca, s.codice, s.colore_nome, s.fornitore, s.cantiere_nome]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [schede, query, tipo]);

  const ricarica = () => queryClient.invalidateQueries({ queryKey: ["codici-colore"] });

  const elimina = async (scheda) => {
    if (!window.confirm(`Eliminare "${scheda.nome}"?`)) return;
    await base44.entities.CodiceColore.delete(scheda.id);
    setDettaglio(null);
    ricarica();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Codici colore</h2>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "..." : `${filtrate.length} schede`}
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
          placeholder="Cerca per nome, marca o codice..."
          className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTipo("")}
          className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors ${
            tipo === "" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
          }`}
        >
          Tutti
        </button>
        {TIPI_CAMPIONE.map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors ${
              tipo === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : filtrate.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border">
          <Palette className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Nessun codice colore</p>
          <p className="text-xs text-muted-foreground mt-1">Fotografa le etichette e il colore: i campi si compilano da soli</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrate.map((s) => {
            const hex = coloreValido(s.colore_hex) ? s.colore_hex : "";
            return (
              <button
                key={s.id}
                onClick={() => setDettaglio(s)}
                className="w-full text-left rounded-2xl border border-border bg-card p-3 flex items-center gap-3 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <span
                  className="w-12 h-12 rounded-xl border border-border shrink-0 flex items-center justify-center text-[9px] font-semibold"
                  style={hex ? { background: hex, color: testoSuColore(hex) } : undefined}
                >
                  {hex ? "" : "n.d."}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{s.nome}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[s.tipo, s.marca, s.codice].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[s.colore_nome, s.cantiere_nome].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <CodiceColoreFormDialog open={formOpen} scheda={inModifica} onClose={() => setFormOpen(false)} onSaved={ricarica} />
      <CodiceColoreDetailDialog
        open={Boolean(dettaglio)}
        scheda={dettaglio}
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