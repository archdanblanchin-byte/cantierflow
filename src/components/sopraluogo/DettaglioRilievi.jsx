import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MODALITA_RILIEVO, calcolaMisura, calcolaPorzione, calcolaVoceStanza,
  dettaglioStanza, fmtMq, formulaMisura, misurePorzione, nomePorzione,
  num, totaliLavorazione, unitaPorzione,
} from '@/lib/rilievi';

const labelMod = (k) => MODALITA_RILIEVO.find((m) => m.key === k)?.label || k;

// Dettaglio di una misura "stanza": dimensioni, pareti, soffitto, sottrazioni e aggiunte
function DettaglioStanza({ m }) {
  const d = dettaglioStanza(m);
  const l = num(m.lunghezza), w = num(m.larghezza), h = num(m.altezza);
  const voci = (arr, segno, cls) => (arr || []).map((v, i) => (
    <div key={i} className={cn('flex justify-between gap-3', cls)}>
      <span className="truncate">
        {v.descrizione ? `${v.descrizione} — ` : ''}
        {v.modalita === 'bxa' ? `${fmtMq(v.base)} × ${fmtMq(v.altezza)} m` : `${fmtMq(v.quantita)} ${v.unita || ''}`.trim()}
      </span>
      <span className="tabular-nums flex-shrink-0">{segno}{fmtMq(calcolaVoceStanza(v))} m²</span>
    </div>
  ));
  return (
    <div className="mt-0.5 pl-1 space-y-0.5 text-[11px]">
      {(l || w || h) ? (
        <div className="text-muted-foreground">
          Locale {fmtMq(l)} × {fmtMq(w)} m · altezza {fmtMq(h)} m · perimetro {fmtMq((l + w) * 2)} m
        </div>
      ) : null}
      <div className="text-muted-foreground">
        Pareti {fmtMq(d.pareti)} m²{d.soffitto > 0 ? ` · soffitto ${fmtMq(d.soffitto)} m²` : ''}
      </div>
      {voci(m.sottrazioni, '−', 'text-red-600')}
      {voci(m.aggiunte, '+', 'text-blue-600')}
    </div>
  );
}

function PorzioneDettaglio({ porzione, indice }) {
  const misure = misurePorzione(porzione);
  const unita = unitaPorzione(porzione);
  return (
    <div className="border-l-2 border-border pl-3 space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium truncate">
          {nomePorzione(porzione, indice)}
          <span className="ml-1.5 text-[10px] text-muted-foreground">
            · {labelMod(porzione.modalita)}{misure.length > 1 ? ` · ${misure.length} misure` : ''}
          </span>
        </span>
        <span className="text-sm font-semibold text-primary tabular-nums flex-shrink-0">
          {fmtMq(calcolaPorzione(porzione))} {unita}
        </span>
      </div>
      {misure.map((m, mi) => (
        <div key={mi} className="text-xs">
          <div className="flex justify-between gap-3 text-muted-foreground">
            <span className="truncate">
              {misure.length > 1 && <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px]">Misura {mi + 1}</span>}
              {formulaMisura(m, porzione.modalita)}
            </span>
            <span className="font-semibold text-foreground tabular-nums flex-shrink-0">
              {fmtMq(calcolaMisura(m, porzione.modalita))} {unita}
            </span>
          </div>
          {porzione.modalita === 'stanza' && <DettaglioStanza m={m} />}
        </div>
      ))}
    </div>
  );
}

// Vista completa (sola lettura) del rilevamento misure di un sopralluogo
export default function DettaglioRilievi({ rilievi = [], onFotoClick }) {
  const [chiusi, setChiusi] = useState({});
  if (!rilievi.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-bold">🔨 Rilevamento misure ({rilievi.length})</h3>
      {rilievi.map((lav) => {
        const aperta = !chiusi[lav.id];
        const totaleTxt = Object.entries(totaliLavorazione(lav))
          .map(([u, v]) => `${fmtMq(v)} ${u}`).join(' · ');
        return (
          <div key={lav.id} className="border border-border rounded-xl overflow-hidden">
            <button type="button" onClick={() => setChiusi((c) => ({ ...c, [lav.id]: !c[lav.id] }))}
              className="w-full flex items-center gap-2 px-3 py-2 bg-muted/40 text-left">
              {aperta ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              <span className="flex-1 min-w-0 text-xs font-bold uppercase tracking-wide truncate">{lav.nome}</span>
              {totaleTxt && <span className="text-xs font-semibold text-primary tabular-nums flex-shrink-0">{totaleTxt}</span>}
            </button>
            {aperta && (
              <div className="p-3 space-y-3">
                {(lav.porzioni || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nessuna misura rilevata</p>
                ) : (
                  (lav.porzioni || []).map((p, pi) => <PorzioneDettaglio key={p.id} porzione={p} indice={pi} />)
                )}
                {lav.note && (
                  <p className="text-xs whitespace-pre-wrap bg-muted/40 rounded-lg p-2">{lav.note}</p>
                )}
                {(lav.foto || []).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                      Fotografie e immagini annotate
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {lav.foto.map((url, i) => (
                        <img key={i} src={url} alt="" onClick={() => onFotoClick?.(lav.foto, i)}
                          className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-transform" />
                      ))}
                    </div>
                  </div>
                )}
                {(lav.file || []).length > 0 && (
                  <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                    {lav.file.map((f) => (
                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40">
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 min-w-0 text-xs truncate">{f.nome}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}