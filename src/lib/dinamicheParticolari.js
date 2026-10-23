// Opzioni condivise per la tendina "Dinamiche particolari".
// Usate sia dal rapportino (squadra) sia dalle note della giornata in timbratura.
export const NOTE_OPTIONS = [
  "Uscita anticipata dal cantiere concordata",
  "Arrivo in cantiere posticipato concordato",
  "Andato direttamente in cantiere senza passare dal magazzino",
  "Andato in cantiere con il proprio veicolo dopo essere passato dal magazzino",
  "Altro",
];

// true se il valore salvato è una descrizione libera (non una voce dell'elenco)
export const isDinamicaLibera = (value) =>
  !!value && !NOTE_OPTIONS.slice(0, -1).includes(value);