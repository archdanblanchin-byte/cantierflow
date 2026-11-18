import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import ListaSopralluoghi from "@/components/sopralluogo/ListaSopralluoghi";
import SopralluogoForm from "@/components/sopralluogo/SopralluogoForm";
import SopralluogoAnteprima from "@/components/sopralluogo/SopralluogoAnteprima";
import SopralluogoImpostazioni from "@/components/sopralluogo/SopralluogoImpostazioni";
import { caricaSopralluoghi } from "@/lib/sopralluogo";

// Stati della pagina: elenco | form | anteprima | impostazioni
export default function Sopralluogo() {
  const queryClient = useQueryClient();
  const [vista, setVista] = useState("elenco");
  const [corrente, setCorrente] = useState(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ["sopralluoghi"], queryFn: caricaSopralluoghi });
  const aggiorna = () => queryClient.invalidateQueries({ queryKey: ["sopralluoghi"] });
  // L'anteprima e la modifica leggono sempre la versione più recente dell'elenco.
  const attuale = corrente ? items.find((x) => x.id === corrente.id) || corrente : null;

  const elimina = async (s) => {
    try {
      await base44.entities.Sopralluogo.delete(s.id);
      await aggiorna();
      toast.success("Sopralluogo eliminato");
      setCorrente(null);
      setVista("elenco");
    } catch {
      toast.error("Eliminazione non riuscita");
    }
  };

  const cambiaStato = async (s, stato) => {
    try {
      await base44.entities.Sopralluogo.update(s.id, { stato_manuale: stato });
      aggiorna();
    } catch {
      toast.error("Cambio di stato non riuscito");
    }
  };

  if (vista === "form") {
    return <SopralluogoForm key={attuale?.id || "nuovo"} record={attuale} onBack={() => { setVista(attuale ? "anteprima" : "elenco"); }} onSaved={(saved) => setCorrente((c) => (c ? c : saved))} />;
  }
  if (vista === "anteprima" && attuale) {
    return <SopralluogoAnteprima s={attuale} onBack={() => setVista("elenco")} onEdit={() => setVista("form")} onDelete={() => elimina(attuale)} />;
  }
  if (vista === "impostazioni") return <SopralluogoImpostazioni onBack={() => setVista("elenco")} />;

  return (
    <div className="min-h-screen bg-background">
      <ListaSopralluoghi
        items={items}
        loading={isLoading}
        onNew={() => { setCorrente(null); setVista("form"); }}
        onOpen={(s) => { setCorrente(s); setVista("anteprima"); }}
        onSettings={() => setVista("impostazioni")}
        onChangeStato={cambiaStato}
        onDelete={elimina}
      />
    </div>
  );
}