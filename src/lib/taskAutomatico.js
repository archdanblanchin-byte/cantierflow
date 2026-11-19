// Proposte di task generate dal cambio di stato di un sopralluogo.
const cliente = (s) => s?.cliente_nome || 'cliente';
const luogo = (s) => [s?.nome_cantiere, s?.cliente_citta].filter(Boolean).join(' · ');

// Compilato → preparare il preventivo
export function propostaTaskSopraluogo(sopraluogo) {
  return {
    titolo: `Preparare il preventivo: ${cliente(sopraluogo)}`,
    testo: `Il sopralluogo di ${cliente(sopraluogo)}${luogo(sopraluogo) ? ` (${luogo(sopraluogo)})` : ''} è compilato. Preparare il preventivo.`,
    priorita: 'media',
  };
}

// Da sviluppare → sviluppare il rilievo
export function propostaTaskSviluppoSopraluogo(sopraluogo) {
  return {
    titolo: `Sviluppare il sopralluogo: ${cliente(sopraluogo)}`,
    testo: `Il sopralluogo di ${cliente(sopraluogo)}${luogo(sopraluogo) ? ` (${luogo(sopraluogo)})` : ''} è da sviluppare.`,
    priorita: 'media',
  };
}