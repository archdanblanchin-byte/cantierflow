import React, { forwardRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

// Campo numerico del sopralluogo.
// - accetta la virgola come separatore decimale
// - se si digita il punto lo converte in virgola
// - tiene al massimo due decimali e li completa uscendo dal campo (1,5 -> 1,50)
// Verso l'esterno il valore resta con il punto (es. "1,50" -> "1.50") così i
// calcoli esistenti continuano a funzionare, mentre a schermo si vede la virgola.
// Espone lo stesso onChange di un input normale (e.target.value).

function versoTesto(value) {
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace('.', ',');
}

function versoValore(testo) {
  return String(testo).replace(',', '.');
}

const CampoNumero = forwardRef(({ value, onChange, className, onBlur, ...props }, ref) => {
  const [testo, setTesto] = useState(versoTesto(value));

  useEffect(() => {
    setTesto((corrente) => (versoValore(corrente) === String(value ?? '') ? corrente : versoTesto(value)));
  }, [value]);

  const handleChange = (e) => {
    let v = e.target.value.replace(/\./g, ',').replace(/[^0-9,]/g, '');
    const parti = v.split(',');
    if (parti.length > 2) v = `${parti[0]},${parti.slice(1).join('')}`;
    const [interi, decimali] = v.split(',');
    if (decimali !== undefined) v = `${interi},${decimali.slice(0, 2)}`;
    setTesto(v);
    onChange({ target: { value: versoValore(v) } });
  };

  const handleBlur = (e) => {
    const numero = parseFloat(versoValore(testo));
    if (testo === '' || testo === ',' || Number.isNaN(numero)) {
      setTesto('');
      onChange({ target: { value: '' } });
    } else {
      const formattato = numero.toFixed(2);
      setTesto(formattato.replace('.', ','));
      onChange({ target: { value: formattato } });
    }
    onBlur?.(e);
  };

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={className}
      value={testo}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props} />
  );
});

CampoNumero.displayName = 'CampoNumero';

export default CampoNumero;