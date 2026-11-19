import React, { useState } from 'react';
import { Plus, Trash2, FileText, Paperclip, X, Loader2, ChevronDown, ChevronRight, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import PorzioneRilievo from './PorzioneRilievo';
import GalleriaImmagini from '../immagini/GalleriaImmagini';
import { creaPorzione, riepilogoLavorazione, ultimaAltezzaStanze, fmtMq } from '@/lib/rilievi';

const btnDoc = 'flex-1 min-w-[140px] flex items-center justify-center gap-1.5 h-9 rounded-lg border border-dashed border-border bg-muted/20 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer';

export default function BloccoLavorazione({ lav, onChange, onRemove, anagrafiche, rilievi }) {
  const [uploading, setUploading] = useState(false);
  const [mostraNote, setMostraNote] = useState(!!lav.note);
  const [aperta, setAperta] = useState(true);
  const [modificaNome, setModificaNome] = useState(false);
  const [nomeEdit, setNomeEdit] = useState(lav.nome || '');

  const confermaNome = () => {
    const pulito = nomeEdit.trim();
    if (pulito && pulito !== lav.nome) onChange({ ...lav, nome: pulito });
    setModificaNome(false);
  };

  const riepilogo = riepilogoLavorazione(lav);
  const totale = Object.entries(riepilogo.totali).map(([u, v]) => `${fmtMq(v)} ${u}`).join(' · ') || '—';

  const aggiornaPorzione = (id, porzione) =>
    onChange({ ...lav, porzioni: lav.porzioni.map((p) => (p.id === id ? porzione : p)) });

  const rimuoviPorzione = (id) => onChange({ ...lav, porzioni: lav.porzioni.filter((p) => p.id !== id) });

  const aggiungiPorzione = () =>
    onChange({ ...lav, porzioni: [...lav.porzioni, creaPorzione('semplice', ultimaAltezzaStanze(rilievi))] });

  const caricaFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const nuovi = await Promise.all(files.map(async (f) => {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: f });
      return { id: Math.random().toString(36).slice(2, 9), nome: f.name, url: file_url };
    }));
    onChange({ ...lav, file: [...(lav.file || []), ...nuovi] });
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      {/* Intestazione lavorazione */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-card border-b border-border">
        <button type="button" onClick={() => setAperta((v) => !v)} title={aperta ? 'Comprimi lavorazione' : 'Espandi lavorazione'}
          className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0">
          {aperta ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {modificaNome ? (
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <Input
              value={nomeEdit}
              onChange={(e) => setNomeEdit(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confermaNome(); if (e.key === 'Escape') setModificaNome(false); }}
              autoFocus
              className="h-8 text-sm font-bold uppercase tracking-wide px-2"
              onBlur={confermaNome}
            />
            <button type="button" onClick={confermaNome}
              className="w-7 h-7 flex items-center justify-center rounded-md text-primary hover:bg-primary/10 flex-shrink-0">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setAperta((v) => !v)} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold uppercase tracking-wide truncate">{lav.nome}</p>
            <p className="text-xs text-muted-foreground tabular-nums mt-0.5 truncate">
              {aperta ? totale : `Totale ${totale}`}
            </p>
          </button>
        )}
        {!modificaNome && (
          <button type="button" onClick={() => { setNomeEdit(lav.nome || ''); setModificaNome(true); }} title="Modifica nome lavorazione"
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button type="button" onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Scheda riassuntiva (lavorazione compressa) */}
      {!aperta && (
        <div className="px-4 py-3 bg-muted/20 space-y-1.5">
          {riepilogo.righe.length === 0 && <p className="text-xs text-muted-foreground">Nessuna misura rilevata</p>}
          {riepilogo.righe.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-muted-foreground">
                {r.nome}{r.misure > 1 ? ` · ${r.misure} misure` : ''}
              </span>
              <span className="font-semibold tabular-nums flex-shrink-0">{fmtMq(r.valore)} {r.unita}</span>
            </div>
          ))}
        </div>
      )}

      {aperta && (
        <>
          {/* Porzioni */}
          <div className="p-3 space-y-3 bg-muted/20">
            {lav.porzioni.map((p) => (
              <PorzioneRilievo key={p.id} porzione={p} anagrafiche={anagrafiche}
                altezzaPrecedente={ultimaAltezzaStanze(rilievi)}
                onChange={(porzione) => aggiornaPorzione(p.id, porzione)}
                onRemove={() => rimuoviPorzione(p.id)} />
            ))}
            <button type="button" onClick={aggiungiPorzione}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-border bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              <Plus className="w-4 h-4" /> Aggiungi porzione
            </button>
          </div>

          {/* Documentazione della lavorazione */}
          <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMostraNote((v) => !v)} className={btnDoc}>
                <FileText className="w-3.5 h-3.5" /> Descrizione / Note
              </button>
              <label className={btnDoc}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />} Carica file
                <input type="file" accept="*/*" multiple className="hidden" onChange={caricaFile} disabled={uploading} />
              </label>
            </div>

            <GalleriaImmagini immagini={lav.foto || []} onChange={(foto) => onChange({ ...lav, foto })} />

            {mostraNote && (
              <Textarea rows={2} placeholder="Note su questa lavorazione…" value={lav.note || ''}
                onChange={(e) => onChange({ ...lav, note: e.target.value })} className="text-sm" />
            )}

            {(lav.file || []).length > 0 && (
              <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                {lav.file.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-card">
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-xs truncate hover:underline">{f.nome}</a>
                    <button type="button" onClick={() => onChange({ ...lav, file: lav.file.filter((x) => x.id !== f.id) })}
                      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}