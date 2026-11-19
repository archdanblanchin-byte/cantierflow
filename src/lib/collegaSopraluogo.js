import { base44 } from '@/api/base44Client';

// Nome confrontabile: minuscolo, senza accenti né punteggiatura,
// "cond." = "condominio", "geom." = "geometra", parole in ordine qualsiasi.
export function nomeConfrontabile(nome) {
  return (nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\bcond\b/g, 'condominio')
    .replace(/\bgeom\b/g, 'geometra')
    .split(/\s+/).filter(Boolean).sort().join(' ');
}

// Collega al preventivo i sopralluoghi dello stesso cliente:
// lo stato del sopralluogo diventa "Preventivo impostato".
export async function collegaSopraluoghiAlPreventivo(preventivo) {
  const nome = nomeConfrontabile(`${preventivo?.cliente_nome || ''} ${preventivo?.cliente_cognome || ''}`);
  if (!nome || !preventivo?.id) return 0;
  const sopraluoghi = await base44.entities.Sopraluogo.list('-created_date');
  const daCollegare = sopraluoghi.filter(
    (s) => s.preventivo_id !== preventivo.id && nomeConfrontabile(s.cliente_nome) === nome
  );
  if (daCollegare.length === 0) return 0;
  await base44.entities.Sopraluogo.bulkUpdate(
    daCollegare.map((s) => ({
      id: s.id,
      preventivo_id: preventivo.id,
      preventivo_numero: preventivo.numero || '',
      stato_manuale: 'preventivo_impostato',
    }))
  );
  return daCollegare.length;
}