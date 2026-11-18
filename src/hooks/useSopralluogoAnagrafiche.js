import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ANAGRAFICHE_DEFAULT } from "@/lib/sopralluogo";

// Anagrafiche del modulo: valori iniziali + voci personalizzate salvate nell'app.
export default function useSopralluogoAnagrafiche() {
  const queryClient = useQueryClient();
  const { data: custom = [] } = useQuery({
    queryKey: ["sopralluogo-anagrafiche"],
    queryFn: async () => (await base44.entities.SopralluogoAnagrafica.list({ sort: "nome", limit: 500 }))?.items || [],
  });

  const voci = (tipo) => {
    const extra = custom.filter((c) => c.tipo === tipo).map((c) => c.nome);
    return [...ANAGRAFICHE_DEFAULT[tipo], ...extra.filter((n) => !ANAGRAFICHE_DEFAULT[tipo].includes(n))];
  };

  const aggiorna = () => queryClient.invalidateQueries({ queryKey: ["sopralluogo-anagrafiche"] });

  const aggiungi = async (tipo, nome) => {
    const n = String(nome || "").trim();
    if (!n || voci(tipo).some((v) => v.toLowerCase() === n.toLowerCase())) return false;
    await base44.entities.SopralluogoAnagrafica.create({ tipo, nome: n });
    aggiorna();
    return true;
  };

  const rimuovi = async (id) => {
    await base44.entities.SopralluogoAnagrafica.delete(id);
    aggiorna();
  };

  return { custom, voci, aggiungi, rimuovi };
}