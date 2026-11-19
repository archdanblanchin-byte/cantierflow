import React from 'react';
import { calcolaTotaliByAmbito, facciataMqTotale, getAmbito } from './calcoliStanza';

const VOCI_LABELS = {
  muffa: { label: 'Muffa', icon: '🔴', unita: '%' },
  intonaco_deumidificante: { label: 'Intonaco Deumidificante', icon: '🟡', unita: 'mq' },
  scrostare: { label: 'Scrostare', icon: '🟠', unita: 'mq' },
  stuccare: { label: 'Stuccare', icon: '🔷', unita: 'mq' },
  rasare: { label: 'Rasare', icon: '🟢', unita: 'mq' },
  altro: { label: 'Altro', icon: '⚪', unita: 'mq' },
};

function RigaVoce({ label, value, unit = 'mq', colorClass = 'text-foreground', bold = false }) {
  if (!value || value <= 0) return null;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={`text-muted-foreground ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`font-bold ${colorClass}`}>{value.toFixed(1)} <span className="font-normal text-muted-foreground">{unit}</span></span>
    </div>
  );
}

function CardAmbito({ ambito, totale, count, dettagli, children }) {
  const isInterno = ambito === 'interno';
  const theme = isInterno
    ? { border: 'border-blue-200', bg: 'bg-blue-50/60', header: 'bg-blue-100/70', text: 'text-blue-700', accent: 'text-blue-600' }
    : { border: 'border-green-200', bg: 'bg-green-50/60', header: 'bg-green-100/70', text: 'text-green-700', accent: 'text-green-600' };
  const icon = isInterno ? '🏠' : '🌳';

  if (totale <= 0 && count === 0) return null;

  return (
    <div className={`border ${theme.border} rounded-xl overflow-hidden`}>
      <div className={`${theme.header} px-3 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <div>
            <p className={`text-xs font-bold ${theme.text} uppercase tracking-wider`}>
              {isInterno ? 'Sopralluogo Interno' : 'Sopralluogo Esterno'}
            </p>
            {count > 0 && <p className="text-[10px] text-muted-foreground">{count} elementi</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-muted-foreground">Totale</p>
          <p className={`text-lg font-black ${theme.text}`}>{totale.toFixed(1)}<span className="text-xs font-normal ml-0.5">mq</span></p>
        </div>
      </div>
      {dettagli && totale > 0 && (
        <div className={`${theme.bg} px-3 py-2 space-y-0.5`}>
          {dettagli}
        </div>
      )}
      {children}
    </div>
  );
}

export default function TotaliSopraluogo({ stanze }) {
  if (!stanze || stanze.length === 0) return null;

  const totaliByAmbito = calcolaTotaliByAmbito(stanze);
  const facciate = stanze.filter(s => s.tipo === 'facciata');
  const totFacciate = facciate.reduce((acc, f) => acc + facciataMqTotale(f), 0);

  const tInt = totaliByAmbito.interno;
  const tExt = totaliByAmbito.esterno;

  const totaleInterno = tInt.totale_mq;
  const totaleEsterno = tExt.totale_mq + totFacciate;
  const totaleGenerale = totaleInterno + totaleEsterno;

  const countInt = tInt.count;
  const countExt = tExt.count + facciate.length;

  // Dettagli interno
  const dettagliInterno = (
    <>
      <RigaVoce label="Pareti nette" value={tInt.mq_pareti} />
      <RigaVoce label="Soffitti" value={tInt.mq_soffitto} />
      {tInt.mq_travi > 0 && <RigaVoce label="Travi" value={tInt.mq_travi} colorClass="text-amber-600" />}
      {tInt.mq_sigillatura_travi > 0 && <RigaVoce label="Sigillatura travi" value={tInt.mq_sigillatura_travi} unit="ml" colorClass="text-amber-600" />}
      {Object.entries(tInt.extra).map(([tipo, info]) => (
        <RigaVoce key={tipo} label={info.descrizione || (VOCI_LABELS[tipo]?.label) || tipo} value={info.valore} unit={info.unita || 'mq'} />
      ))}
    </>
  );

  // Dettagli esterno
  const dettagliEsterno = (
    <>
      <RigaVoce label="Pareti nette" value={tExt.mq_pareti} />
      <RigaVoce label="Soffitti" value={tExt.mq_soffitto} />
      {tExt.mq_travi > 0 && <RigaVoce label="Travi" value={tExt.mq_travi} colorClass="text-amber-600" />}
      {tExt.mq_sigillatura_travi > 0 && <RigaVoce label="Sigillatura travi" value={tExt.mq_sigillatura_travi} unit="ml" colorClass="text-amber-600" />}
      {totFacciate > 0 && <RigaVoce label="Facciate" value={totFacciate} colorClass="text-green-600" />}
      {Object.entries(tExt.extra).map(([tipo, info]) => (
        <RigaVoce key={tipo} label={info.descrizione || (VOCI_LABELS[tipo]?.label) || tipo} value={info.valore} unit={info.unita || 'mq'} />
      ))}
    </>
  );

  return (
    <div className="space-y-3">
      <CardAmbito ambito="interno" totale={totaleInterno} count={countInt} dettagli={dettagliInterno} />
      <CardAmbito ambito="esterno" totale={totaleEsterno} count={countExt} dettagli={dettagliEsterno} />

      {/* Totale Generale */}
      {totaleGenerale > 0 && (
        <div className="bg-primary text-primary-foreground rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">✅ TOTALE GENERALE</span>
            <span className="text-2xl font-black">{totaleGenerale.toFixed(1)}<span className="text-sm font-normal opacity-80 ml-1">mq</span></span>
          </div>
          {totaleInterno > 0 && totaleEsterno > 0 && (
            <div className="mt-2 pt-2 border-t border-primary-foreground/20 grid grid-cols-2 gap-2 text-xs text-center">
              <div>
                <div className="font-bold opacity-90">{totaleInterno.toFixed(1)}</div>
                <div className="opacity-70">Interno</div>
              </div>
              <div>
                <div className="font-bold opacity-90">{totaleEsterno.toFixed(1)}</div>
                <div className="opacity-70">Esterno</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}