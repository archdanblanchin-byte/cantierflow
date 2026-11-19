import { useEffect } from 'react';

// Campi numerici di tutta l'app:
// - si scrivono SOLO da tastiera: la rotellina del mouse non cambia più valori né date
// - il punto digitato sulla tastiera numerica diventa virgola
// - uscendo dal campo i decimali sono sempre due (es. 12,5 → 12,50)
const TIPI_CAMPO = 'input[type="number"], input[type="text"][inputmode="decimal"], input[type="text"][inputmode="numeric"], input[type="date"], input[type="time"], input[type="datetime-local"], input[type="month"], input[type="week"]';

const TIPI_DATA = ['date', 'time', 'datetime-local', 'month', 'week'];

// Numero → testo mostrato nel campo, con la virgola e due decimali.
const formatta = (numero) => {
  if (!Number.isFinite(numero)) return '';
  const testo = Number.isInteger(numero) ? String(numero) : numero.toFixed(2);
  return testo.replace('.', ',');
};

// Testo digitato → solo cifre, un separatore decimale (virgola) ed eventuale segno.
const soloNumeri = (testo) => {
  const grezzo = String(testo);
  let t = grezzo.replace(/\./g, ',').replace(/[^\d,-]/g, '');
  const negativo = t.trimStart().startsWith('-');
  t = t.replace(/-/g, '');
  const [interi = '', ...resto] = t.split(',');
  const decimali = resto.join('');
  // La virgola appena digitata resta visibile mentre si scrivono i decimali.
  const inCorso = /[.,]$/.test(grezzo.trim());
  let risultato = decimali ? `${interi},${decimali}` : interi;
  if (inCorso && !decimali) risultato = `${interi},`;
  return negativo ? `-${risultato}` : risultato;
};

// La rotellina non deve toccare il valore: se il campo è attivo viene rilasciato.
const bloccaRotellina = (el) => (e) => {
  if (document.activeElement !== el) return;
  e.preventDefault();
  el.blur();
};

function potenzia(el) {
  if (!(el instanceof HTMLInputElement)) return;
  if (el.dataset.campoNumerico === '1') return;
  const tipo = el.type;
  const decimale = tipo === 'text' && (el.inputMode === 'decimal' || el.inputMode === 'numeric');
  if (tipo === 'number' || decimale) {
    el.dataset.campoNumerico = '1';
    if (tipo === 'number') el.type = 'text';
    el.inputMode = 'decimal';
    el.autocomplete = 'off';
    el.setAttribute('autocomplete', 'off');
    const numero = parseFloat(el.value.replace(',', '.'));
    if (el.value !== '' && Number.isFinite(numero)) el.value = formatta(numero);
    el.addEventListener('input', () => {
      const digitato = el.value;
      const mostrato = soloNumeri(digitato);
      const perApp = mostrato.replace(',', '.');
      if (perApp === digitato) return;
      // Il resto dell'app legge il numero con il punto; a schermo resta la virgola.
      const caret = el.selectionStart;
      el.value = perApp;
      // Il frame successivo arriva dopo il render di React, che altrimenti
      // riscriverebbe il numero con il punto: a schermo resta la virgola.
      requestAnimationFrame(() => {
        if (!el.isConnected) return;
        if (el.value === mostrato) return;
        const stessaLunghezza = el.value.replace(',', '.').length === mostrato.replace(',', '.').length;
        el.value = mostrato;
        if (!stessaLunghezza) return;
        const pos = digitato.length === mostrato.length && caret != null ? caret : mostrato.length;
        try { el.setSelectionRange(pos, pos); } catch { /* campo non selezionabile */ }
      });
    });
    const formattaCampo = () => {
      const testo = el.value.trim();
      if (testo === '' || testo === '-') return;
      const numero = parseFloat(testo.replace(',', '.'));
      if (Number.isFinite(numero)) el.value = formatta(numero);
    };
    el.addEventListener('focus', () => requestAnimationFrame(() => el.isConnected && formattaCampo()));
    // Uscendo dal campo: il resto dell'app riceve il numero con il punto,
    // poi a schermo compaiono la virgola e i due decimali.
    el.addEventListener('focusout', () => {
      const mostrato = el.value;
      const numerico = mostrato.includes(',') ? mostrato.replace(',', '.') : mostrato;
      if (numerico !== mostrato) el.value = numerico;
      requestAnimationFrame(() => el.isConnected && formattaCampo());
    });
  } else if (TIPI_DATA.includes(tipo)) {
    el.dataset.campoNumerico = '1';
  } else {
    return;
  }
  el.addEventListener('wheel', bloccaRotellina(el), { passive: false });
}

// Campo numerico di tutta l'app: si compila solo da tastiera.
export default function useBloccaScrollNumeri() {
  useEffect(() => {
    const cerca = (radice) => {
      if (!(radice instanceof Element)) return;
      if (radice.matches(TIPI_CAMPO)) potenzia(radice);
      radice.querySelectorAll(TIPI_CAMPO).forEach(potenzia);
    };
    cerca(document.body);
    const osservatore = new MutationObserver((voci) => {
      for (const voce of voci) {
        for (const nodo of voce.addedNodes) cerca(nodo);
      }
    });
    osservatore.observe(document.body, { childList: true, subtree: true });
    return () => osservatore.disconnect();
  }, []);
}