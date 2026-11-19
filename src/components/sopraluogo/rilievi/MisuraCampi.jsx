import React from 'react';
import CampoNumero from '../CampoNumero';
import PorzioneStanza from './PorzioneStanza';
import { SVILUPPO_DEFAULT } from '@/lib/rilievi';

const etichetta = 'text-[10px] uppercase tracking-wider text-muted-foreground font-medium';

// Campi di una singola misura, in base alla modalità della porzione
export default function MisuraCampi({ misura, modalita, onChange, anagrafiche, altezzaPrecedente = '' }) {
  const m = misura;

  if (modalita === 'semplice') {
    return (
      <div className="space-y-1">
        <p className={etichetta}>Quantità</p>
        <CampoNumero value={m.quantita} onChange={(e) => onChange({ quantita: e.target.value })} placeholder="0,00" className="text-right" />
      </div>
    );
  }

  if (modalita === 'bxa') {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className={etichetta}>Base (m)</p>
          <CampoNumero value={m.base} onChange={(e) => onChange({ base: e.target.value })} placeholder="0,00" className="text-right" />
        </div>
        <div className="space-y-1">
          <p className={etichetta}>Altezza (m)</p>
          <CampoNumero value={m.altezza} onChange={(e) => onChange({ altezza: e.target.value })} placeholder="0,00" className="text-right" />
        </div>
      </div>
    );
  }

  if (modalita === 'stanza') {
    return <PorzioneStanza misura={m} onChange={onChange} anagrafiche={anagrafiche} altezzaPrecedente={altezzaPrecedente} />;
  }

  if (modalita === 'lxa_sviluppo') {
    return (
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <p className={etichetta}>Lunghezza (m)</p>
          <CampoNumero value={m.lunghezza} onChange={(e) => onChange({ lunghezza: e.target.value })} placeholder="0,00" className="text-right" />
        </div>
        <div className="space-y-1">
          <p className={etichetta}>Larghezza (m)</p>
          <CampoNumero value={m.larghezza} onChange={(e) => onChange({ larghezza: e.target.value })} placeholder="0,00" className="text-right" />
        </div>
        <div className="space-y-1">
          <p className={etichetta}>Sviluppo</p>
          <CampoNumero value={m.sviluppo ?? String(SVILUPPO_DEFAULT)} onChange={(e) => onChange({ sviluppo: e.target.value })} placeholder={String(SVILUPPO_DEFAULT)} className="text-right" />
        </div>
      </div>
    );
  }

  // mq_sviluppo
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <p className={etichetta}>m²</p>
        <CampoNumero value={m.mq} onChange={(e) => onChange({ mq: e.target.value })} placeholder="0,00" className="text-right" />
      </div>
      <div className="space-y-1">
        <p className={etichetta}>Sviluppo</p>
        <CampoNumero value={m.sviluppo ?? String(SVILUPPO_DEFAULT)} onChange={(e) => onChange({ sviluppo: e.target.value })} placeholder={String(SVILUPPO_DEFAULT)} className="text-right" />
      </div>
    </div>
  );
}