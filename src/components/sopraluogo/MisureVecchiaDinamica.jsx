import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BloccoAmbito from './BloccoAmbito';
import StanzaCard from './StanzaCard';
import FacciataCard from './FacciataCard';
import MisureRiferimento from './MisureRiferimento';
import { getAmbito, calcolaTotaliByAmbito, facciataMqTotale } from './calcoliStanza';

const Titolo = ({ colore, testo, count, label }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-1 h-3.5 ${colore} rounded-full`} />
    <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider">{testo}</p>
    {count > 0 && <span className="ml-auto text-xs text-muted-foreground font-normal">{count} {label}</span>}
  </div>
);

// Editor dei sopralluoghi creati con la vecchia dinamica: la struttura originale
// (stanze, travi, facciate e misure di riferimento) resta invariata.
export default function MisureVecchiaDinamica({
  form, updateStanza, deleteStanza, addStanza, addTravi, addFacciata, updateMisureAmbito,
}) {
  const tutteStanze = form.stanze || [];
  const stanzeInterne = tutteStanze.filter((s) => getAmbito(s) === 'interno' && s.tipo !== 'travi_esterne' && s.tipo !== 'facciata');
  const traviInterne = tutteStanze.filter((s) => getAmbito(s) === 'interno' && s.tipo === 'travi_esterne');
  const stanzeEsterne = tutteStanze.filter((s) => getAmbito(s) === 'esterno' && s.tipo !== 'travi_esterne' && s.tipo !== 'facciata');
  const facciateList = tutteStanze.filter((s) => s.tipo === 'facciata');
  const traviEsterneList = tutteStanze.filter((s) => getAmbito(s) === 'esterno' && s.tipo === 'travi_esterne');
  const misureInterne = (form.misure_extra || []).filter((m) => (m.ambito || 'interno') === 'interno');
  const misureEsterne = (form.misure_extra || []).filter((m) => m.ambito === 'esterno');
  const totaliByAmbito = calcolaTotaliByAmbito(tutteStanze);
  const totFacciate = facciateList.reduce((acc, f) => acc + facciataMqTotale(f), 0);
  const totaleInterno = totaliByAmbito.interno.totale_mq;
  const totaleEsterno = totaliByAmbito.esterno.totale_mq + totFacciate;
  const countInterno = stanzeInterne.length + traviInterne.length;
  const countEsterno = facciateList.length + traviEsterneList.length;

  const indiceDi = (stanza) => tutteStanze.findIndex((s) => s.id === stanza.id);

  return (
    <div className="space-y-3">
      {/* ── BLOCCO INTERNO ── */}
      <BloccoAmbito
        ambito="interno"
        titolo="Sopralluogo Interno"
        sottotitolo="Metrature interne"
        totale={totaleInterno}
        count={countInterno}
      >
        <div className="space-y-3">
          <Titolo colore="bg-blue-500" testo="Stanze" count={stanzeInterne.length} label="stanze" />
          {stanzeInterne.map((stanza) => {
            const i = indiceDi(stanza);
            return (
              <StanzaCard key={stanza.id || i} stanza={stanza} index={i}
                onChange={(updated) => updateStanza(i, updated)} onDelete={() => deleteStanza(i)} />
            );
          })}
          <Button type="button" variant="outline" onClick={() => addStanza('interno')}
            className="w-full gap-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-500">
            <Plus className="w-4 h-4" /> Aggiungi stanza
          </Button>
        </div>

        <div className="space-y-3">
          <Titolo colore="bg-amber-500" testo="Travi" count={traviInterne.length} label="elementi" />
          {traviInterne.map((stanza) => {
            const i = indiceDi(stanza);
            return (
              <StanzaCard key={stanza.id || i} stanza={stanza} index={i}
                onChange={(updated) => updateStanza(i, updated)} onDelete={() => deleteStanza(i)} />
            );
          })}
          <Button type="button" variant="outline" onClick={() => addTravi('interno')}
            className="w-full gap-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-500">
            <Plus className="w-4 h-4" /> Aggiungi travi
          </Button>
        </div>

        <div className="space-y-2">
          <Titolo colore="bg-amber-400" testo="Misure di riferimento" count={misureInterne.length} label="voci" />
          <MisureRiferimento misure={misureInterne} onChange={(v) => updateMisureAmbito('interno', v)} ambito="interno" />
        </div>
      </BloccoAmbito>

      {/* ── BLOCCO ESTERNO ── */}
      <BloccoAmbito
        ambito="esterno"
        titolo="Sopralluogo Esterno"
        sottotitolo="Facciate, travi e misure esterne"
        totale={totaleEsterno}
        count={countEsterno}
        defaultOpen={countEsterno > 0 || countInterno === 0}
      >
        <div className="space-y-3">
          <Titolo colore="bg-green-500" testo="Facciate" count={facciateList.length} label="facciate" />
          {facciateList.map((facciata) => {
            const i = indiceDi(facciata);
            return (
              <FacciataCard key={facciata.id || i} facciata={facciata} index={i}
                onChange={(updated) => updateStanza(i, updated)} onDelete={() => deleteStanza(i)} />
            );
          })}
          <Button type="button" variant="outline" onClick={addFacciata}
            className="w-full gap-2 border-dashed border-green-300 text-green-700 hover:bg-green-50 hover:border-green-500">
            <Plus className="w-4 h-4" /> Aggiungi facciata
          </Button>
        </div>

        <div className="space-y-3">
          <Titolo colore="bg-amber-500" testo="Travi" count={traviEsterneList.length} label="elementi" />
          {traviEsterneList.map((stanza) => {
            const i = indiceDi(stanza);
            return (
              <StanzaCard key={stanza.id || i} stanza={stanza} index={i}
                onChange={(updated) => updateStanza(i, updated)} onDelete={() => deleteStanza(i)} />
            );
          })}
          <Button type="button" variant="outline" onClick={() => addTravi('esterno')}
            className="w-full gap-2 border-dashed border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-500">
            <Plus className="w-4 h-4" /> Aggiungi travi
          </Button>
        </div>

        <div className="space-y-2">
          <Titolo colore="bg-amber-400" testo="Misure di riferimento" count={misureEsterne.length} label="voci" />
          <MisureRiferimento misure={misureEsterne} onChange={(v) => updateMisureAmbito('esterno', v)} ambito="esterno" />
        </div>
      </BloccoAmbito>

      {stanzeEsterne.length > 0 && (
        <div className="space-y-3">
          <Titolo colore="bg-blue-500" testo="Stanze esterne" count={stanzeEsterne.length} label="stanze" />
          {stanzeEsterne.map((stanza) => {
            const i = indiceDi(stanza);
            return (
              <StanzaCard key={stanza.id || i} stanza={stanza} index={i}
                onChange={(updated) => updateStanza(i, updated)} onDelete={() => deleteStanza(i)} />
            );
          })}
        </div>
      )}
    </div>
  );
}