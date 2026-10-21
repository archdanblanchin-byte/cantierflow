import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PaintBucket, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import CampioneCard from "@/components/campioni/CampioneCard";
import CampioneFormDialog from "@/components/campioni/CampioneFormDialog";
import CampioneDetailDialog from "@/components/campioni/CampioneDetailDialog";
import UsaCampioneDialog from "@/components/campioni/UsaCampioneDialog";
import { TIPI_CAMPIONE, caricaCampioni } from "@/lib/campioni";

export default function Campioni() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [vista, setVista] = useState("disponibili");
  const [query, setQuery] = useState("");
  const [tipo, setTipo] = useState("");
  const [aperto, setAperto] = useState(null);
  const [modifica, setModifica] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [usa, setUsa] = useState(null);

  const { data: campioni = [], isLoading } = useQuery({
    queryKey: ["campioni"],
    queryFn: caricaCampioni,
  });

  const aggiorna = () => queryClient.invalidateQueries({ queryKey: ["campioni"] });

  const disponibili = useMemo(() => campioni.filter((c) => c.stato !== "utilizzato"), [campioni]);
  const utilizzati = useMemo(() => campioni.filter((c) => c.stato === "utilizzato"), [campioni]);

  const filtrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = vista === "disponibili" ? disponibili : utilizzati;
    return base
      .filter((c) => (tipo ? c.tipo === tipo : true))
      .filter(
        (c) =>
          !q ||
          [c.nome, c.marca, c.codice, c.colore_nome, c.cantiere_nome, c.fornitore].some((v) =>
            String(v || "").toLowerCase().includes(q)
          )
      )
      .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "it"));
  }, [vista, disponibili, utilizzati, tipo, query]);

  const apriNuovo = () => {
    setModifica(null);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg">Campioni e avanzi</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "..." : `${disponibili.length} disponibili · ${utilizzati.length} utilizzati`}
              </p>
            </div>
            <Button size="icon" onClick={apriNuovo} title="Nuovo campione">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setVista("disponibili")}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                vista === "disponibili" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Disponibili ({disponibili.length})
            </button>
            <button
              onClick={() => setVista("utilizzati")}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                vista === "utilizzati" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              Utilizzati ({utilizzati.length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca prodotto, marca, colore o cantiere..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
            <button
              onClick={() => setTipo("")}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors ${
                !tipo ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
              }`}
            >
              Tutti
            </button>
            {TIPI_CAMPIONE.map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors ${
                  tipo === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-[86px] rounded-xl" />)
        ) : filtrati.length === 0 ? (
          <div className="text-center py-16">
            <PaintBucket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {campioni.length === 0
                ? "Nessun campione in archivio"
                : vista === "disponibili"
                ? "Nessun campione disponibile"
                : "Nessun campione utilizzato"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {campioni.length === 0
                ? "Fotografa etichetta e colore del materiale avanzato e salvalo qui"
                : "Prova a cambiare ricerca o filtro"}
            </p>
            {campioni.length === 0 && (
              <Button className="mt-4 gap-2" onClick={apriNuovo}>
                <Plus className="w-4 h-4" />
                Nuovo campione
              </Button>
            )}
          </div>
        ) : (
          filtrati.map((c) => <CampioneCard key={c.id} campione={c} onOpen={setAperto} />)
        )}
      </div>

      <CampioneDetailDialog
        campione={aperto}
        open={!!aperto}
        onClose={() => setAperto(null)}
        onModifica={(c) => {
          setAperto(null);
          setModifica(c);
          setShowForm(true);
        }}
        onUsa={(c) => {
          setAperto(null);
          setUsa(c);
        }}
        onChanged={aggiorna}
      />

      <CampioneFormDialog
        open={showForm}
        campione={modifica}
        onClose={() => setShowForm(false)}
        onSaved={aggiorna}
      />

      <UsaCampioneDialog
        campione={usa}
        open={!!usa}
        onClose={() => setUsa(null)}
        onDone={aggiorna}
      />
    </div>
  );
}