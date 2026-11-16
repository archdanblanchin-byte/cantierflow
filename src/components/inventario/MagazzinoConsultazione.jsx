import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { caricaTuttiMateriali } from "@/lib/inventario";
import { categoriePresenti, scaffaliPresenti, etichettaCategoria } from "@/lib/categorieMateriale";
import MaterialeRow from "@/components/inventario/MaterialeRow";
import FiltriInventario from "@/components/inventario/FiltriInventario";
import MaterialeDialog from "@/components/inventario/MaterialeDialog";

// Consultazione semplice del magazzino: tutti i collaboratori cercano i prodotti,
// vedono scaffale e categoria e registrano carichi e scarichi.
export default function MagazzinoConsultazione({ puoGestire, onApriGestione }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [filtri, setFiltri] = useState({ categoria: "", scaffale: "", ordinamento: "nome", soloSottoSoglia: false });
  const [aperto, setAperto] = useState(null);

  const { data: materiali = [], isLoading } = useQuery({
    queryKey: ["materiali-inventario"],
    queryFn: () => caricaTuttiMateriali({ gestito_magazzino: true }),
  });

  const aggiorna = () => {
    queryClient.invalidateQueries({ queryKey: ["materiali-inventario"] });
    queryClient.invalidateQueries({ queryKey: ["movimenti-materiale"] });
  };

  const aggiornaFiltri = (patch) => setFiltri((f) => ({ ...f, ...patch }));

  const filtrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    const lista = materiali
      .filter((m) => (filtri.categoria ? etichettaCategoria(m.categoria) === filtri.categoria : true))
      .filter((m) => (filtri.scaffale ? String(m.posizione_scaffale || "").trim() === filtri.scaffale : true))
      .filter(
        (m) =>
          !q ||
          [m.nome, m.categoria, m.sottocategoria, m.posizione_scaffale, m.fornitore].some((v) =>
            String(v || "").toLowerCase().includes(q)
          )
      );
    return [...lista].sort((a, b) => String(a.nome).localeCompare(String(b.nome), "it"));
  }, [materiali, filtri, query]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-lg">Magazzino</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "..." : `${materiali.length} materiali`}
              </p>
            </div>
            {puoGestire && (
              <Button variant="outline" size="sm" onClick={onApriGestione} className="gap-1.5">
                Inventario magazzino
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca prodotto, scaffale o categoria..."
              className="pl-9"
            />
          </div>

          <FiltriInventario
            materiali={materiali}
            numeroSottoSoglia={0}
            filtri={filtri}
            onChange={aggiornaFiltri}
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : filtrati.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {materiali.length === 0 ? "Magazzino vuoto" : "Nessun prodotto trovato"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {materiali.length === 0
                ? "Il magazziniere non ha ancora caricato i prodotti"
                : "Prova a cambiare ricerca o filtro"}
            </p>
          </div>
        ) : (
          filtrati.map((m) => (
            <MaterialeRow key={m.id} materiale={m} onOpen={setAperto} />
          ))
        )}
      </div>

      <MaterialeDialog
        materiale={aperto}
        open={!!aperto}
        onClose={() => setAperto(null)}
        isGestore={puoGestire}
        onChanged={aggiorna}
      />
    </div>
  );
}