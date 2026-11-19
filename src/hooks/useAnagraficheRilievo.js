import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  LAVORAZIONI_DEFAULT, ELEMENTI_DEFAULT, STANZE_DEFAULT, UNITA_DEFAULT, SOTTRAZIONI_DEFAULT
} from '@/lib/rilievi';

// Anagrafica = voci di default (nel codice) + voci salvate dall'utente nel database.
export function useAnagrafica(entity, defaults) {
  const qc = useQueryClient();
  const chiave = ['anagrafica-rilievi', entity];

  const { data: extra = [] } = useQuery({
    queryKey: chiave,
    queryFn: () => base44.entities[entity].list('nome'),
    staleTime: 60000
  });

  const voci = [...new Set([...defaults, ...extra.map((r) => r.nome).filter(Boolean)])];

  const aggiungi = async (nome) => {
    const pulito = (nome || '').trim();
    if (!pulito) return;
    if (voci.some((v) => v.toLowerCase() === pulito.toLowerCase())) return;
    await base44.entities[entity].create({ nome: pulito });
    qc.invalidateQueries({ queryKey: chiave });
  };

  const rimuovi = async (id) => {
    await base44.entities[entity].delete(id);
    qc.invalidateQueries({ queryKey: chiave });
  };

  return { voci, extra, aggiungi, rimuovi };
}

export function useAnagraficheRilievo() {
  return {
    lavorazioni: useAnagrafica('LavorazioneTipo', LAVORAZIONI_DEFAULT),
    elementi: useAnagrafica('ElementoRilievo', ELEMENTI_DEFAULT),
    stanze: useAnagrafica('StanzaTipo', STANZE_DEFAULT),
    unita: useAnagrafica('UnitaRilievo', UNITA_DEFAULT),
    sottrazioni: useAnagrafica('SottrazioneTipo', SOTTRAZIONI_DEFAULT)
  };
}