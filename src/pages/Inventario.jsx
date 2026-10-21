import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, ArrowLeft, BellRing, FileUp, Flag, Package, PackagePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usePermessi } from "@/hooks/usePermessi";
import { caricaTuttiMateriali, sottoSoglia } from "@/lib/inventario";
import MaterialeRow from "@/components/inventario/MaterialeRow";
import MaterialeDialog from "@/components/inventario/MaterialeDialog";
import AggiungiMaterialeDialog from "@/components/inventario/AggiungiMaterialeDialog";
import DestinatariCard from "@/components/inventario/DestinatariCard";
import ImportaChecklistDialog from "@/components/inventario/ImportaChecklistDialog";
import SegnalaMancanteDialog from "@/components/inventario/SegnalaMancanteDialog";
import SegnalazioniDialog from "@/components/inventario/SegnalazioniDialog";

export default function Inventario() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isGestore, isAdmin } = usePermessi();
  const [query, setQuery] = useState("");
  const [soloSottoSoglia, setSoloSottoSoglia] = useState(false);
  const [aperto, setAperto] = useState(null);
  const [segnalazione, setSegnalazione] = useState(null);
  const [showAggiungi, setShowAggiungi] = useState(false);
  const [showDestinatari, setShowDestinatari] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSegnalazioni, setShowSegnalazioni] = useState(false);

  const { data: materiali = [], isLoading } = useQuery({
    queryKey: ["materiali-inventario"],
    queryFn: () => caricaTuttiMateriali({ gestito_magazzino: true }),
  });

  const { data: nonInMagazzino = [] } = useQuery({
    queryKey: ["materiali-anagrafe"],
    queryFn: () => caricaTuttiMateriali({ gestito_magazzino: { $ne: true } }),
  });

  const { data: segnalazioniAperte = [] } = useQuery({
    queryKey: ["segnalazioni-materiale-aperte"],
    queryFn: async () => {
      const page = await base44.entities.SegnalazioneMateriale.filter(
        { stato: "aperta" },
        { sort: "-created_date", limit: 100 }
      );
      return page?.items || [];
    },
    enabled: isGestore,
    refetchInterval: 60000,
  });

  const aggiorna = () => {
    queryClient.invalidateQueries({ queryKey: ["materiali-inventario"] });
    queryClient.invalidateQueries({ queryKey: ["materiali-anagrafe"] });
    queryClient.invalidateQueries({ queryKey: ["materialiBase"] });
    queryClient.invalidateQueries({ queryKey: ["movimenti-materiale"] });
  };

  const basse = useMemo(() => materiali.filter(sottoSoglia), [materiali]);
  const filtrati = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return soloSottoSoglia ? basse : materiali;
    return materiali
      .filter((m) => (soloSottoSoglia ? sottoSoglia(m) : true))
      .filter((m) =>
        [m.nome, m.posizione_scaffale, m.fornitore].some((v) => String(v || "").toLowerCase().includes(q))
      );
  }, [materiali, basse, soloSottoSoglia, query]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-bold text-lg">Inventario magazzino</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "..." : `${materiali.length} materiali · ${basse.length} sotto soglia`}
              </p>
            </div>
            {isGestore && (
              <>
                <Button variant="outline" size="icon" className="relative" onClick={() => setShowSegnalazioni(true)} title="Materiale segnalato mancante">
                  <Flag className="w-4 h-4" />
                  {segnalazioniAperte.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {segnalazioniAperte.length > 9 ? "9+" : segnalazioniAperte.length}
                    </span>
                  )}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowDestinatari(true)} title="Chi riceve gli avvisi">
                  <BellRing className="w-4 h-4" />
                </Button>
                {isAdmin && (
                  <Button variant="outline" size="icon" onClick={() => setShowImport(true)} title="Importa check list">
                    <FileUp className="w-4 h-4" />
                  </Button>
                )}
                <Button size="icon" onClick={() => setShowAggiungi(true)} title="Aggiungi materiale">
                  <PackagePlus className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca materiale, scaffale o fornitore..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSoloSottoSoglia(false)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                !soloSottoSoglia ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
              )}
            >
              Tutti
            </button>
            <button
              onClick={() => setSoloSottoSoglia(true)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5",
                soloSottoSoglia ? "bg-amber-500 text-white border-amber-500" : "bg-card border-border text-muted-foreground"
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              Sotto soglia {basse.length > 0 && `(${basse.length})`}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : filtrati.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {materiali.length === 0 ? "Inventario vuoto" : "Nessun materiale trovato"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {materiali.length === 0
                ? "Importa la check list del magazzino oppure aggiungi i materiali a mano"
                : "Prova a cambiare ricerca o filtro"}
            </p>
            {materiali.length === 0 && isGestore && (
              <div className="mt-4 flex flex-col items-center gap-2">
                {isAdmin && (
                  <Button className="gap-2" onClick={() => setShowImport(true)}>
                    <FileUp className="w-4 h-4" /> Importa check list
                  </Button>
                )}
                <Button variant="outline" className="gap-2" onClick={() => setShowAggiungi(true)}>
                  <PackagePlus className="w-4 h-4" /> Aggiungi materiale
                </Button>
              </div>
            )}
          </div>
        ) : (
          filtrati.map((m) => (
            <MaterialeRow key={m.id} materiale={m} onOpen={setAperto} onSegnala={setSegnalazione} />
          ))
        )}
      </div>

      <MaterialeDialog
        materiale={aperto}
        open={!!aperto}
        onClose={() => setAperto(null)}
        isGestore={isGestore}
        onChanged={aggiorna}
        onSegnala={(m) => {
          setAperto(null);
          setSegnalazione(m);
        }}
      />

      <SegnalaMancanteDialog
        materiale={segnalazione}
        open={!!segnalazione}
        onClose={() => setSegnalazione(null)}
        onInviata={() => queryClient.invalidateQueries({ queryKey: ["segnalazioni-materiale-aperte"] })}
      />

      <SegnalazioniDialog
        open={showSegnalazioni}
        onClose={() => setShowSegnalazioni(false)}
        onGestita={() => queryClient.invalidateQueries({ queryKey: ["segnalazioni-materiale-aperte"] })}
      />

      <AggiungiMaterialeDialog
        open={showAggiungi}
        onClose={() => setShowAggiungi(false)}
        materialiBase={nonInMagazzino}
        onAdded={aggiorna}
      />

      <ImportaChecklistDialog open={showImport} onClose={() => setShowImport(false)} onImported={aggiorna} />

      <Dialog open={showDestinatari} onOpenChange={(v) => !v && setShowDestinatari(false)}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto top-4 translate-y-0">
          <DialogHeader>
            <DialogTitle className="pr-6">Avvisi di scorta</DialogTitle>
          </DialogHeader>
          <DestinatariCard />
        </DialogContent>
      </Dialog>
    </div>
  );
}