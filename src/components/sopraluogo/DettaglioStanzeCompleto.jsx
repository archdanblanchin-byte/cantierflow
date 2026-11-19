import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { calcolaStanza, calcolaTotaliGlobali, calcolaTotaliByAmbito, getAmbito, facciataMqTotale } from '@/components/sopraluogo/calcoliStanza';
import FotoLightbox from '@/components/sopraluogo/FotoLightbox';

function Riga({ label, val, unit = 'mq', bold = false }) {
  if (!val || val <= 0) return null;
  return (
    <div className={`flex justify-between items-center py-0.5 ${bold ? 'font-bold' : ''}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs tabular-nums ${bold ? 'text-primary' : ''}`}>{val.toFixed(2)} {unit}</span>
    </div>
  );
}

// ── Calcolo facciata ──
function calcolaFacciata(f) {
  const mqMisure = (f.misure || []).reduce((acc, m) => acc + (parseFloat(m.mq) || 0), 0);
  const mqSottrai = (f.sottrazioni || []).reduce((acc, s) => {
    const molt = s.tipo === 'porta_2_lati' ? 2 : 1;
    return acc + (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * molt;
  }, 0);
  const mqAggiungi = (f.porzioni || []).reduce((acc, p) => {
    return acc + (p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0);
  }, 0);
  const extra = {};
  (f.voci_extra || []).forEach((v) => {
    const desc = v.tipo === 'altro' ? (v.descrizione || '') : '';
    const key = desc ? `altro::${desc}` : v.tipo;
    if (!extra[key]) extra[key] = { valore: 0, unita: v.unita || 'mq', descrizione: desc };
    let valore = parseFloat(v.valore) || 0;
    if (v.modalita === 'lxa') {
      const lunghezze = v.lunghezze || [];
      const totL = lunghezze.reduce((s, l) => s + (parseFloat(l) || 0), 0);
      valore = totL * (parseFloat(v.altezza_m) || 0);
    } else if (v.modalita === 'perc') {
      valore = (mqMisure - mqSottrai + mqAggiungi) * ((parseFloat(v.valore) || 0) / 100);
    }
    extra[key].valore += valore;
  });
  return { mqMisure, mqSottrai, mqAggiungi, totale: mqMisure - mqSottrai + mqAggiungi, extra };
}

// ── Calcolo travi esterne ──
function calcolaTraviEsterne(t) {
  return (t.travi_esterne || []).reduce((acc, tr) => {
    const l = parseFloat(tr.lunghezza_m) || 0;
    const la = parseFloat(tr.larghezza_m) || 0;
    const sv = parseFloat(tr.sviluppo) || 1;
    return acc + (tr.modalita === 'lxa_sviluppo' ? l * la * sv : tr.modalita === 'lxl' ? l * la : parseFloat(tr.mq) || 0);
  }, 0);
}

// ── Stanza normale ──
function StanzaDettaglio({ stanza, indice, onApriFoto }) {
  const [aperta, setAperta] = useState(true);
  const c = calcolaStanza(stanza);
  const nome = stanza.nome_custom || stanza.tipo || `Stanza ${indice + 1}`;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button type="button" onClick={() => setAperta(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors">
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
          {indice + 1}
        </div>
        <span className="text-sm font-semibold flex-1 text-left">{nome}</span>
        {(stanza.lunghezza && stanza.larghezza) && (
          <span className="text-xs text-muted-foreground">
            {stanza.lunghezza}×{stanza.larghezza}{stanza.altezza ? `×h${stanza.altezza}` : ''}
          </span>
        )}
        {c.totale_mq > 0 && <span className="text-xs font-bold text-primary ml-1">{c.totale_mq.toFixed(1)} mq</span>}
        {aperta ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>
      {aperta && (
        <div className="px-3 pb-3 space-y-1 border-t border-border bg-muted/20">
          {(stanza.lunghezza || stanza.larghezza || stanza.altezza) && (
            <div className="flex flex-wrap gap-x-3 pt-2 pb-1">
              {stanza.lunghezza && <span className="text-xs text-muted-foreground">L: <b>{stanza.lunghezza} m</b></span>}
              {stanza.larghezza && <span className="text-xs text-muted-foreground">La: <b>{stanza.larghezza} m</b></span>}
              {stanza.altezza && <span className="text-xs text-muted-foreground">H: <b>{stanza.altezza} m</b></span>}
            </div>
          )}
          {c.mq_aperture > 0 && <Riga label="— Aperture" val={-c.mq_aperture} />}
          <Riga label="Pareti nette" val={c.mq_pareti} />
          {stanza.soffitto && <Riga label="Soffitto" val={c.mq_soffitto} />}
          {stanza.travi && <Riga label="Travi (pittura)" val={c.mq_travi} />}
          {c.mq_sigillatura_travi > 0 && <Riga label="Sigillatura travi" val={c.mq_sigillatura_travi} />}
          {c.mq_pareti_extra > 0 && <Riga label="Pareti extra" val={c.mq_pareti_extra} />}
          {c.mq_travi_esterne > 0 && <Riga label="Travi esterne" val={c.mq_travi_esterne} />}
          {stanza.travi && (stanza.travi_ml || stanza.travi_sviluppo) && (
            <p className="text-xs text-muted-foreground ml-2">
              Travi: {stanza.travi_ml || 0} ml{stanza.travi_sviluppo ? ` × sviluppo ${stanza.travi_sviluppo}` : ''}{stanza.travi_sigillatura_ml ? ` · sigillatura ${stanza.travi_sigillatura_ml} ml` : ''}
            </p>
          )}
          {(stanza.pareti_extra || []).length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground font-semibold mb-0.5">Porzioni aggiunte:</p>
              {stanza.pareti_extra.map((p, i) => {
                const mq = p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0;
                const misura = p.modalita === 'lxa' ? `${p.lunghezza_m || 0}×${p.altezza_m || 0} m` : '';
                return (
                  <p key={i} className="text-xs text-muted-foreground ml-2">
                    • {p.descrizione || (p.tipo || 'Porzione').replace('_', ' ')}{misura ? ` (${misura})` : ''}: <b className="text-blue-600">+{mq.toFixed(2)} mq</b>
                  </p>
                );
              })}
            </div>
          )}
          {Object.entries(c.extra || {}).map(([tipo, info]) => (
            info.valore > 0 && <Riga key={tipo} label={info.descrizione || tipo} val={info.valore} unit={info.unita || 'mq'} />
          ))}
          {(stanza.aperture || []).length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground font-semibold mb-0.5">Aperture:</p>
              {stanza.aperture.map((ap, i) => (
                <p key={i} className="text-xs text-muted-foreground ml-2">
                  • {ap.tipo === 'arco' ? 'Arco' : 'Porta'} {ap.lunghezza}×{ap.altezza} m
                </p>
              ))}
            </div>
          )}
          <div className="border-t border-border mt-1 pt-1">
            <Riga label="Totale stanza" val={c.totale_mq} bold />
          </div>
          {(stanza.foto || []).length > 0 && (
            <div className="grid grid-cols-3 gap-1 pt-1">
              {stanza.foto.map((url, i) => (
                <img key={i} src={url} alt="" onClick={() => onApriFoto?.(stanza.foto, i)}
                  className="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-80 active:scale-95 transition-transform" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Facciata card ──
function FacciataDettaglio({ facciata, indice, onApriFoto }) {
  const [aperta, setAperta] = useState(true);
  const c = calcolaFacciata(facciata);
  const nome = facciata.nome_custom || (facciata.orientamento ? `Facciata ${facciata.orientamento}` : `Facciata ${indice + 1}`);

  return (
    <div className="border border-green-200 rounded-xl overflow-hidden bg-card">
      <button type="button" onClick={() => setAperta(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50/40 transition-colors">
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-[10px] font-bold flex-shrink-0">
          {indice + 1}
        </div>
        <span className="text-sm font-semibold flex-1 text-left">🏠 {nome}</span>
        {facciata.orientamento && <span className="text-xs text-muted-foreground">{facciata.orientamento}</span>}
        {c.totale > 0 && <span className="text-xs font-bold text-green-700 ml-1">{c.totale.toFixed(1)} mq</span>}
        {aperta ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>
      {aperta && (
        <div className="px-3 pb-3 space-y-1 border-t border-green-100 bg-green-50/20">
          {/* Campate */}
          {(facciata.misure || []).length > 0 && (
            <div className="pt-2 space-y-0.5">
              {(facciata.misure || []).map((m, mi) => {
                const basi = (m.basi || []).map(b => parseFloat(b) || 0);
                const totBase = basi.reduce((s, b) => s + b, 0);
                return (
                  <p key={mi} className="text-xs text-muted-foreground ml-2">
                    • {m.nome || `Campata ${mi + 1}`}: base {totBase.toFixed(2)} m × alt {parseFloat(m.altezza) || 0} m = <b>{(parseFloat(m.mq) || 0).toFixed(2)} mq</b>
                  </p>
                );
              })}
            </div>
          )}
          {c.mqSottrai > 0 && <Riga label="— Sottrazioni" val={-c.mqSottrai} />}
          {c.mqAggiungi > 0 && <Riga label="+ Porzioni aggiunte" val={c.mqAggiungi} />}
          {/* Sottrazioni elenco */}
          {(facciata.sottrazioni || []).filter(s => s.tipo).length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground font-semibold mb-0.5">Sottrazioni:</p>
              {facciata.sottrazioni.filter(s => s.tipo).map((s, i) => {
                const molt = s.tipo === 'porta_2_lati' ? 2 : 1;
                const mq = (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * molt;
                const tipoLabel = s.tipo === 'altro' ? (s.descrizione || 'Altro') : s.tipo;
                return (
                  <p key={i} className="text-xs text-muted-foreground ml-2">
                    • {tipoLabel}: {s.lunghezza}×{s.altezza}{molt === 2 ? ' ×2' : ''} m = <b className="text-destructive">−{mq.toFixed(2)} mq</b>
                  </p>
                );
              })}
            </div>
          )}
          {/* Porzioni elenco */}
          {(facciata.porzioni || []).length > 0 && (
            <div className="pt-1">
              <p className="text-xs text-muted-foreground font-semibold mb-0.5">Porzioni aggiunte:</p>
              {facciata.porzioni.map((p, i) => {
                const mq = p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0;
                const label = p.descrizione || p.tipo;
                return (
                  <p key={i} className="text-xs text-muted-foreground ml-2">
                    • {label}: <b className="text-blue-600">+{mq.toFixed(2)} mq</b>
                  </p>
                );
              })}
            </div>
          )}
          {/* Voci extra */}
          {Object.entries(c.extra || {}).map(([tipo, info]) => (
            info.valore > 0 && <Riga key={tipo} label={info.descrizione || tipo} val={info.valore} unit={info.unita || 'mq'} />
          ))}
          <div className="border-t border-green-100 mt-1 pt-1">
            <Riga label="Totale da tinteggiare" val={c.totale} bold />
          </div>
          {(facciata.foto || []).length > 0 && (
            <div className="grid grid-cols-3 gap-1 pt-1">
              {facciata.foto.map((url, i) => (
                <img key={i} src={url} alt="" onClick={() => onApriFoto?.(facciata.foto, i)}
                  className="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-80 active:scale-95 transition-transform" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Travi esterne card ──
function TraviDettaglio({ trave, indice }) {
  const [aperta, setAperta] = useState(true);
  const mqTot = calcolaTraviEsterne(trave);
  const nome = trave.nome_custom || `Travi ${indice + 1}`;

  return (
    <div className="border border-amber-200 rounded-xl overflow-hidden bg-card">
      <button type="button" onClick={() => setAperta(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-50/40 transition-colors">
        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold flex-shrink-0">
          {indice + 1}
        </div>
        <span className="text-sm font-semibold flex-1 text-left">🪵 {nome}</span>
        {mqTot > 0 && <span className="text-xs font-bold text-amber-700 ml-1">{mqTot.toFixed(1)} mq</span>}
        {aperta ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>
      {aperta && (
        <div className="px-3 pb-3 space-y-1 border-t border-amber-100 bg-amber-50/20">
          {(trave.travi_esterne || []).map((tr, i) => {
            const l = parseFloat(tr.lunghezza_m) || 0;
            const la = parseFloat(tr.larghezza_m) || 0;
            const sv = parseFloat(tr.sviluppo) || 1;
            const mq = tr.modalita === 'lxa_sviluppo' ? l * la * sv : tr.modalita === 'lxl' ? l * la : parseFloat(tr.mq) || 0;
            const formula = tr.modalita === 'lxa_sviluppo' ? `${l}×${la}×${sv} sv` : tr.modalita === 'lxl' ? `${l}×${la}` : `${mq} mq`;
            return (
              <p key={i} className="text-xs text-muted-foreground ml-2">
                • {tr.descrizione ? `${tr.descrizione} ` : ''}({formula}) = <b>{mq.toFixed(2)} mq</b>
              </p>
            );
          })}
          <div className="border-t border-amber-100 mt-1 pt-1">
            <Riga label="Totale travi" val={mqTot} bold />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DettaglioStanzeCompleto({ stanze = [] }) {
  const [lightbox, setLightbox] = useState(null);
  if (!stanze.length) return null;

  const apriLightbox = (urls, indice) => setLightbox({ urls, indice });

  const stanzeNormali = stanze.filter(s => s.tipo !== 'facciata' && s.tipo !== 'travi_esterne');
  const facciate = stanze.filter(s => s.tipo === 'facciata');
  const traviEsterne = stanze.filter(s => s.tipo === 'travi_esterne');

  // Split per ambito
  const stanzeInterne = stanzeNormali.filter(s => getAmbito(s) === 'interno');
  const stanzeEsterne = stanzeNormali.filter(s => getAmbito(s) === 'esterno');
  const traviInterne = traviEsterne.filter(s => getAmbito(s) === 'interno');
  const traviEsternePure = traviEsterne.filter(s => getAmbito(s) === 'esterno');

  const totaliByAmbito = calcolaTotaliByAmbito(stanzeNormali);
  const totFacciate = facciate.reduce((acc, f) => acc + facciataMqTotale(f), 0);
  const totaleInterno = totaliByAmbito.interno.totale_mq;
  const totaleEsterno = totaliByAmbito.esterno.totale_mq + totFacciate;
  const totaleGenerale = totaleInterno + totaleEsterno;

  return (
    <div className="space-y-3">
      {/* Riepilogo totali — Interno / Esterno */}
      {totaleGenerale > 0 && (
        <div className="space-y-2">
          {/* TOTALE INTERNO */}
          {totaleInterno > 0 && (
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-blue-700">🏠 Sopralluogo Interno</p>
                <span className="text-lg font-black text-blue-700">{totaleInterno.toFixed(1)} mq</span>
              </div>
              <div className="space-y-0.5">
                {totaliByAmbito.interno.mq_pareti > 0 && <Riga label="Pareti nette" val={totaliByAmbito.interno.mq_pareti} />}
                {totaliByAmbito.interno.mq_soffitto > 0 && <Riga label="Soffitti" val={totaliByAmbito.interno.mq_soffitto} />}
                {totaliByAmbito.interno.mq_travi > 0 && <Riga label="Travi (pittura)" val={totaliByAmbito.interno.mq_travi} />}
                {totaliByAmbito.interno.mq_sigillatura_travi > 0 && <Riga label="Sigillatura travi" val={totaliByAmbito.interno.mq_sigillatura_travi} />}
                {Object.entries(totaliByAmbito.interno.extra || {}).map(([tipo, info]) => (
                  info.valore > 0 && <Riga key={tipo} label={tipo} val={info.valore} unit={info.unita || 'mq'} />
                ))}
              </div>
            </div>
          )}
          {/* TOTALE ESTERNO */}
          {totaleEsterno > 0 && (
            <div className="bg-green-50/80 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-green-700">🌳 Sopralluogo Esterno</p>
                <span className="text-lg font-black text-green-700">{totaleEsterno.toFixed(1)} mq</span>
              </div>
              <div className="space-y-0.5">
                {totaliByAmbito.esterno.mq_pareti > 0 && <Riga label="Pareti nette" val={totaliByAmbito.esterno.mq_pareti} />}
                {totaliByAmbito.esterno.mq_soffitto > 0 && <Riga label="Soffitti" val={totaliByAmbito.esterno.mq_soffitto} />}
                {totaliByAmbito.esterno.mq_travi > 0 && <Riga label="Travi (pittura)" val={totaliByAmbito.esterno.mq_travi} />}
                {totFacciate > 0 && <Riga label="Facciate" val={totFacciate} />}
                {Object.entries(totaliByAmbito.esterno.extra || {}).map(([tipo, info]) => (
                  info.valore > 0 && <Riga key={tipo} label={tipo} val={info.valore} unit={info.unita || 'mq'} />
                ))}
              </div>
            </div>
          )}
          {/* Totale Generale */}
          <div className="bg-primary rounded-xl p-4 flex justify-between items-center">
            <span className="font-bold text-sm text-primary-foreground">✅ TOTALE GENERALE</span>
            <span className="text-lg font-black text-primary-foreground">{totaleGenerale.toFixed(1)} mq</span>
          </div>
        </div>
      )}

      {/* ── SEZIONE INTERNA ── */}
      {(stanzeInterne.length > 0 || traviInterne.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-blue-700 uppercase flex items-center gap-1">🏠 Interno</p>
          {stanzeInterne.map((st, i) => (
            <StanzaDettaglio key={st.id || i} stanza={st} indice={i} onApriFoto={apriLightbox} />
          ))}
          {traviInterne.map((t, i) => (
            <TraviDettaglio key={t.id || i} trave={t} indice={i} />
          ))}
        </div>
      )}

      {/* ── SEZIONE ESTERNA ── */}
      {(stanzeEsterne.length > 0 || facciate.length > 0 || traviEsternePure.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-green-700 uppercase flex items-center gap-1">🌳 Esterno</p>
          {stanzeEsterne.map((st, i) => (
            <StanzaDettaglio key={st.id || i} stanza={st} indice={i} onApriFoto={apriLightbox} />
          ))}
          {facciate.map((f, i) => (
            <FacciataDettaglio key={f.id || i} facciata={f} indice={i} onApriFoto={apriLightbox} />
          ))}
          {traviEsternePure.map((t, i) => (
            <TraviDettaglio key={t.id || i} trave={t} indice={i} />
          ))}
        </div>
      )}

      {lightbox && (
        <FotoLightbox
          foto={lightbox.urls[lightbox.indice]}
          indice={`${lightbox.indice + 1} / ${lightbox.urls.length}`}
          onClose={() => setLightbox(null)}
          onPrev={lightbox.urls.length > 1 ? () => setLightbox(lb => ({ ...lb, indice: (lb.indice - 1 + lb.urls.length) % lb.urls.length })) : null}
          onNext={lightbox.urls.length > 1 ? () => setLightbox(lb => ({ ...lb, indice: (lb.indice + 1) % lb.urls.length })) : null}
        />
      )}
    </div>
  );
}