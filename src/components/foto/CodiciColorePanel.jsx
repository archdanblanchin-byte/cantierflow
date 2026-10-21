import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Palette, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { TIPI_CAMPIONE, coloreValido, testoSuColore } from "@/lib/campioni";
import { gruppiCantiere, inCantiere } from "@/lib/fotoCantiere";
import CartelleCantiere from "@/components/foto/CartelleCantiere";
import CodiceColoreFormDialog from "@/components/foto/CodiceColoreFormDialog";
import CodiceColoreDetailDialog from "@/components/foto/CodiceColoreDetailDialog";

export default function CodiciColorePanel() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const [cartella, setCartella] = useState(null);
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

  const gruppi = useMemo(() => gruppiCantiere(schede), [schede]);

  const visibili = useMemo(() => {
    const dentro = cartella ? schede.filter((s) => inCantiere(s, cartella.id)) : [];
    const q = query.trim().toLowerCase();
    return dentro.filter((s) => {
      if (tipo && s.tipo !== tipo) return false;
      if (!q) return true;
      return [s.nome, s.marca, s.codice, s.colore_nome, s.fornitore]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [schede, cartella, query, tipo]);

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
        <div className="flex items-center gap-2 min-w-0">
          {cartella && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCartella(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{cartella ? cartella.nome : "Codici colore"}</h2>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "..." : cartella ? `${visibili.length} schede` : `${gruppi.length} cantieri`}
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
            <Palette className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">Nessun codice colore</p>
            <p className="text-xs text-muted-foreground mt-1">
              Fotografa le etichette e il colore: i campi si compilano da soli
            </p>
          </div>
        ) : (
          <CartelleCantiere gruppi={gruppi} onApri={(g) => { setCartella(g); setQuery(""); setTipo(""); }} unita="schede" />
        )
      ) : (
        <>
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

          {visibili.length === 0 ? (
            <div className="text-center py-14 rounded-2xl border border-dashed border-border">
              <Palette className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Nessun codice colore in questo cantiere</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibili.map((s) => {
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
                      <p className="text-[11px] text-muted-foreground truncate">{s.colore_nome}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <CodiceColoreFormDialog
        open={formOpen}
        scheda={inModifica}
        cantierePredefinito={cartella}
        onClose={() => setFormOpen(false)}
        onSaved={ricarica}
      />
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