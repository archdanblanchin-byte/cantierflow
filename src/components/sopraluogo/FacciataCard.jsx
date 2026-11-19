import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ChevronDown, ChevronUp, Camera, Plus, ZoomIn, Download, Ruler, Minus, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CampoNumero from './CampoNumero';

// ─── Sezione collassabile ───
function Sezione({ titolo, icon: Icon, count = 0, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{titolo}</span>
          {count > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {count}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-2 sm:p-3 space-y-3 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

const VOCI_EXTRA_TIPI = [
  { tipo: 'muffa', label: 'Muffa' },
  { tipo: 'intonaco_deumidificante', label: 'Intonaco Deumidificante' },
  { tipo: 'scrostare', label: 'Scrostare' },
  { tipo: 'stuccare', label: 'Stuccare' },
  { tipo: 'rasare', label: 'Rasare' },
  { tipo: 'altro', label: 'Altro' },
];

function VoceRow({ voce, onUpdate, onRemove, mqFacciata }) {
  const [modalita, setModalita] = useState(voce.modalita || 'lxa');
  const setMod = (m) => { setModalita(m); onUpdate({ modalita: m, lunghezze: [''], altezza_m: '', valore: 0 }); };
  const lunghezze = voce.lunghezze || (voce.lunghezza_m ? [voce.lunghezza_m] : ['']);
  const totaleLunghezza = lunghezze.reduce((sum, l) => sum + (parseFloat(l) || 0), 0);
  const altezza = parseFloat(voce.altezza_m) || 0;
  const mqCalcolati = totaleLunghezza * altezza;
  const updateLunghezza = (i, val) => {
    const nuove = [...lunghezze]; nuove[i] = val;
    const tot = nuove.reduce((s, l) => s + (parseFloat(l) || 0), 0);
    onUpdate({ lunghezze: nuove, valore: tot * altezza });
  };
  const addLunghezza = () => { onUpdate({ lunghezze: [...lunghezze, ''] }); };
  const removeLunghezza = (i) => {
    const nuove = lunghezze.filter((_, idx) => idx !== i);
    const tot = nuove.reduce((s, l) => s + (parseFloat(l) || 0), 0);
    onUpdate({ lunghezze: nuove.length ? nuove : [''], valore: tot * altezza });
  };
  return (
    <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-foreground/80 flex-1 min-w-[80px]">{voce.tipo === 'altro' ? (voce.descrizione || 'Altro') : (VOCI_EXTRA_TIPI.find(v => v.tipo === voce.tipo)?.label || voce.tipo)}</span>
        <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-medium">
          {[['lxa', 'L×A'], ['mq', 'mq'], ['perc', '%']].map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMod(m)}
              className={`px-2 py-1 transition-colors ${modalita === m ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>{label}</button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={onRemove}><Trash2 className="w-3 h-3" /></Button>
      </div>
      {voce.tipo === 'altro' && (
        <Input className="h-8 text-xs" placeholder="Descrizione lavorazione..." value={voce.descrizione || ''} onChange={(e) => onUpdate({ descrizione: e.target.value })} />
      )}
      {modalita === 'lxa' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <CampoNumero className="h-8 w-24 text-xs" placeholder="Lung. m" value={lunghezze[0] || ''} onChange={(e) => updateLunghezza(0, e.target.value)} />
              <span className="text-xs text-muted-foreground">ml</span>
            </div>
            <span className="text-xs text-muted-foreground">×</span>
            <div className="flex items-center gap-1">
              <CampoNumero className="h-8 w-20 text-xs" placeholder="Alt. m" value={voce.altezza_m || ''}
                onChange={(e) => { const a = parseFloat(e.target.value) || 0; onUpdate({ altezza_m: e.target.value, valore: totaleLunghezza * a }); }} />
              <span className="text-xs text-muted-foreground">m</span>
            </div>
            <span className="text-xs font-bold text-primary">= {mqCalcolati.toFixed(2)} mq</span>
          </div>
          {lunghezze.length > 1 && (
            <div className="space-y-1.5 pl-1">
              {lunghezze.slice(1).map((l, i) => (
                <div key={i + 1} className="flex items-center gap-1.5">
                  <CampoNumero className="h-8 w-24 text-xs" placeholder="ml" value={l} onChange={(e) => updateLunghezza(i + 1, e.target.value)} />
                  <span className="text-xs text-muted-foreground">ml</span>
                  <button type="button" onClick={() => removeLunghezza(i + 1)} className="text-destructive/60 hover:text-destructive ml-1"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">Totale lunghezze: <strong>{totaleLunghezza.toFixed(2)} ml</strong></p>
            </div>
          )}
          <button type="button" onClick={addLunghezza}
            className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/5 transition-colors">+ Aggiungi lunghezza</button>
        </div>
      )}
      {modalita === 'mq' && (
        <div className="flex items-center gap-2">
          <CampoNumero className="h-8 w-28 text-xs" placeholder="0.00" value={voce.valore || ''} onChange={(e) => onUpdate({ valore: e.target.value })} />
          <span className="text-xs text-muted-foreground">mq</span>
        </div>
      )}
      {modalita === 'perc' && (
        <div className="flex items-center gap-2 flex-wrap">
          <CampoNumero className="h-8 w-28 text-xs" placeholder="0" value={voce.valore || ''} onChange={(e) => onUpdate({ valore: e.target.value })} />
          <span className="text-xs text-muted-foreground">%</span>
          {mqFacciata > 0 && (parseFloat(voce.valore) || 0) > 0 && (
            <span className="text-xs font-bold text-primary">= {(mqFacciata * ((parseFloat(voce.valore) || 0) / 100)).toFixed(2)} mq</span>
          )}
        </div>
      )}
    </div>
  );
}

const ORIENTAMENTI = ['Nord', 'Sud', 'Est', 'Ovest', 'Altro'];

const TIPI_SOTTRAI = [
  { value: 'porta_1_lato', label: 'Porzione 1 lato', moltiplicatore: 1 },
  { value: 'porta_2_lati', label: 'Porzione 2 lati', moltiplicatore: 2 },
  { value: 'parete', label: 'Parete', moltiplicatore: 1 },
  { value: 'finestra', label: 'Finestra', moltiplicatore: 1 },
  { value: 'porta', label: 'Porta', moltiplicatore: 1 },
  { value: 'altro', label: 'Altro', moltiplicatore: 1 },
];

const TIPI_AGGIUNGI = [
  { tipo: 'parete', label: 'Parete' },
  { tipo: 'soffitto', label: 'Soffitto' },
  { tipo: 'controsoffitto', label: 'Controsoffitto' },
  { tipo: 'nicchia', label: 'Nicchia' },
  { tipo: 'pilastro', label: 'Pilastro' },
  { tipo: 'altro', label: 'Altro' },
];

function fmt2(n) { return (parseFloat(n) || 0).toFixed(2); }

// ── Riga misura base × altezza con più segmenti di base ────────────────────
function MisuraRow({ misura, index, onUpdate, onRemove }) {
  const [modalita, setModalita] = useState(misura.modalita || 'lxa');
  const basi = misura.basi || [''];
  const altezza = parseFloat(misura.altezza) || 0;
  const totBase = basi.reduce((s, b) => s + (parseFloat(b) || 0), 0);
  const mq = modalita === 'mq' ? (parseFloat(misura.mq) || 0) : totBase * altezza;
  const updateBasi = (i, val) => {
    const nuove = [...basi]; nuove[i] = val;
    const tot = nuove.reduce((s, b) => s + (parseFloat(b) || 0), 0);
    onUpdate({ basi: nuove, mq: tot * altezza });
  };
  const addBase = () => onUpdate({ basi: [...basi, ''] });
  const removeBase = (i) => {
    const nuove = basi.filter((_, idx) => idx !== i);
    const tot = nuove.reduce((s, b) => s + (parseFloat(b) || 0), 0);
    onUpdate({ basi: nuove.length ? nuove : [''], mq: tot * altezza });
  };
  const setMod = (m) => {
    setModalita(m);
    if (m === 'mq') { onUpdate({ modalita: 'mq', basi: [''], altezza: '', mq: parseFloat(misura.mq) || 0 }); }
    else { onUpdate({ modalita: 'lxa', mq: 0 }); }
  };
  return (
    <div className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Input
          className="h-7 w-32 text-xs font-semibold"
          placeholder={`Campata ${index + 1}`}
          value={misura.nome || ''}
          onChange={(e) => onUpdate({ nome: e.target.value })} />
        <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-medium">
          <button type="button" onClick={() => setMod('lxa')} className={`px-2 py-1 transition-colors ${modalita === 'lxa' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>B×A</button>
          <button type="button" onClick={() => setMod('mq')} className={`px-2 py-1 transition-colors ${modalita === 'mq' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>Solo MQ</button>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}><Trash2 className="w-3 h-3" /></Button>
      </div>
      {modalita === 'mq' && (
        <div className="flex items-center gap-2">
          <CampoNumero className="h-8 w-28 text-xs" placeholder="0.00" value={misura.mq || ''} onChange={(e) => onUpdate({ mq: e.target.value })} />
          <span className="text-xs text-muted-foreground">mq</span>
          <span className="text-xs font-bold text-primary">= {fmt2(parseFloat(misura.mq) || 0)} mq</span>
        </div>
      )}
      {modalita === 'lxa' && (
        <>
          {/* Base (prima) + Altezza sulla stessa riga */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <CampoNumero className="h-8 w-24 text-xs" placeholder="Base m" value={basi[0] || ''} onChange={(e) => updateBasi(0, e.target.value)} />
              <span className="text-xs text-muted-foreground">m</span>
            </div>
            <span className="text-xs text-muted-foreground">×</span>
            <div className="flex items-center gap-1">
              <CampoNumero className="h-8 w-20 text-xs" placeholder="Alt. m" value={misura.altezza || ''} onChange={(e) => { const a = parseFloat(e.target.value) || 0; onUpdate({ altezza: e.target.value, mq: totBase * a }); }} />
              <span className="text-xs text-muted-foreground">m</span>
            </div>
            <span className="text-xs font-bold text-primary">= {fmt2(mq)} mq</span>
          </div>
          {/* Basi aggiuntive sotto */}
          {basi.length > 1 && (
            <div className="space-y-1.5 pl-1">
              {basi.slice(1).map((b, i) => (
                <div key={i + 1} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-4 text-right">{i + 2}.</span>
                  <CampoNumero className="h-8 w-24 text-xs" placeholder="Base m" value={b} onChange={(e) => updateBasi(i + 1, e.target.value)} />
                  <span className="text-xs text-muted-foreground">m</span>
                  <button type="button" onClick={() => removeBase(i + 1)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">Base totale: <strong>{fmt2(totBase)} m</strong></p>
            </div>
          )}
          {/* Bottone aggiungi base sotto */}
          <button type="button" onClick={addBase} className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/5 transition-colors">+ Aggiungi base</button>
        </>
      )}
    </div>
  );
}

export default function FacciataCard({ facciata, index, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const [showAggiungiOpts, setShowAggiungiOpts] = useState(false);
  const [showVoceOpts, setShowVoceOpts] = useState(false);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const update = (field, valueOrFn) => {
    if (typeof valueOrFn === 'function') { onChange((prev) => ({ [field]: valueOrFn(prev[field]) })); }
    else { onChange({ [field]: valueOrFn }); }
  };

  // Lavorazioni extra
  const addVoceExtra = (tipo) => { update('voci_extra', (prev) => [...(prev || []), { tipo, valore: 0, modalita: 'lxa', lunghezze: [''], altezza_m: '' }]); setShowVoceOpts(false); };
  const updateVoceExtra = (i, fields) => update('voci_extra', (prev) => { const u = [...(prev || [])]; u[i] = { ...u[i], ...fields }; return u; });
  const removeVoceExtra = (i) => update('voci_extra', (prev) => prev.filter((_, idx) => idx !== i));

  // Misure campate
  const addMisura = () => { update('misure', (prev) => [...(prev || []), { id: Math.random().toString(36).slice(2, 9), basi: [''], altezza: '', mq: 0 }]); };
  const updateMisura = (i, fields) => update('misure', (prev) => { const u = [...(prev || [])]; u[i] = { ...u[i], ...fields }; return u; });
  const removeMisura = (i) => update('misure', (prev) => prev.filter((_, idx) => idx !== i));

  // Sottrai porzione
  const addSottrai = (tipo) => { update('sottrazioni', (prev) => [...(prev || []), { tipo, modalita: 'lxa', lunghezza: '', altezza: '', mq: 0 }]); };
  const updateSottrai = (i, fields) => update('sottrazioni', (prev) => { const u = [...(prev || [])]; u[i] = { ...u[i], ...fields }; return u; });
  const removeSottrai = (i) => update('sottrazioni', (prev) => prev.filter((_, idx) => idx !== i));

  // Aggiungi porzione
  const addPorzione = (tipo) => { update('porzioni', (prev) => [...(prev || []), { tipo, modalita: 'lxa', lunghezza_m: '', altezza_m: '', mq: 0 }]); setShowAggiungiOpts(false); };
  const updatePorzione = (i, fields) => update('porzioni', (prev) => { const u = [...(prev || [])]; u[i] = { ...u[i], ...fields }; return u; });
  const removePorzione = (i) => update('porzioni', (prev) => prev.filter((_, idx) => idx !== i));

  // Foto
  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    setUploadingFoto(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    update('foto', (prev) => [...(prev || []), ...urls]);
    setUploadingFoto(false); e.target.value = '';
  };
  const removeFoto = (i) => update('foto', (prev) => prev.filter((_, idx) => idx !== i));

  // Calcoli
  const mqMisure = (facciata.misure || []).reduce((acc, m) => acc + (parseFloat(m.mq) || 0), 0);
  const mqSottrai = (facciata.sottrazioni || []).reduce((acc, s) => {
    const sMod = s.modalita || 'lxa';
    if (sMod === 'mq') return acc + (parseFloat(s.mq) || 0);
    const t = TIPI_SOTTRAI.find(x => x.value === s.tipo) || TIPI_SOTTRAI[0];
    return acc + (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * t.moltiplicatore;
  }, 0);
  const mqPorzioni = (facciata.porzioni || []).reduce((acc, p) => {
    const mq = p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0;
    return acc + mq;
  }, 0);
  const mqTotale = mqMisure - mqSottrai + mqPorzioni;

  const FotoGrid = () => (
    <div className="flex flex-wrap gap-2">
      {(facciata.foto || []).map((url, i) => (
        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group">
          <img src={url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <a href={url} target="_blank" rel="noopener noreferrer" className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center"><ZoomIn className="w-3 h-3 text-slate-800" /></a>
            <a href={url} download className="w-5 h-5 bg-white/90 rounded-full flex items-center justify-center"><Download className="w-3 h-3 text-slate-800" /></a>
          </div>
          <button type="button" onClick={() => removeFoto(i)} className="absolute top-0.5 right-0.5 bg-black/70 rounded-full w-5 h-5 flex items-center justify-center"><Trash2 className="w-3 h-3 text-white" /></button>
        </div>
      ))}
      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors gap-0.5">
        {uploadingFoto ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <><Plus className="w-5 h-5 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Galleria</span></>}
        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotoUpload} />
      </label>
      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors gap-0.5">
        {uploadingFoto ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <><Camera className="w-5 h-5 text-muted-foreground" /><span className="text-[9px] text-muted-foreground">Foto</span></>}
        <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFotoUpload} />
      </label>
    </div>
  );

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/30 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
          <span className="font-semibold text-sm">{facciata.nome_custom || (facciata.orientamento ? `Facciata ${facciata.orientamento}` : 'Nuova facciata')}</span>
          {mqTotale > 0 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0 bg-green-50 text-green-700 border-green-200">{mqTotale.toFixed(1)} mq tot.</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="p-1.5 sm:p-4 space-y-3">
          {/* Sezione 1: Aggiungi */}
          <Sezione titolo="Aggiungi" icon={Ruler} count={(facciata.porzioni || []).length} defaultOpen={true}>
            {/* Orientamento + nome */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Orientamento</Label>
                <div className="flex flex-wrap gap-1">
                  {ORIENTAMENTI.map(o => (
                    <button key={o} type="button" onClick={() => update('orientamento', o)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${facciata.orientamento === o ? 'bg-green-600 text-white border-green-600' : 'border-border text-muted-foreground hover:border-green-400 hover:text-green-700'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome personalizzato</Label>
                <Input className="h-9" placeholder="Es: Fronte strada" value={facciata.nome_custom || ''} onChange={(e) => update('nome_custom', e.target.value)} />
              </div>
            </div>

            {/* Misure campate */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Misure (Base × Altezza)</Label>
              {(facciata.misure || []).map((m, i) => (
                <MisuraRow key={m.id || i} misura={m} index={i} onUpdate={(fields) => updateMisura(i, fields)} onRemove={() => removeMisura(i)} />
              ))}
              <button type="button" onClick={addMisura} className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-primary/40 text-primary hover:border-primary hover:bg-primary/5 transition-colors">+ Aggiungi campata</button>
            </div>

            {/* Porzioni aggiuntive */}
            {(facciata.porzioni || []).length > 0 && (
              <div className="space-y-2">
                {(facciata.porzioni || []).map((p, i) => {
                  const mqP = p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0;
                  return (
                    <div key={i} className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-blue-800 flex-1">{TIPI_AGGIUNGI.find(v => v.tipo === p.tipo)?.label || p.tipo}</span>
                        {p.tipo === 'altro' && (<Input className="h-7 text-xs w-28" placeholder="Descrizione..." value={p.descrizione || ''} onChange={(e) => updatePorzione(i, { descrizione: e.target.value })} />)}
                        <div className="flex rounded-md border border-blue-200 overflow-hidden text-[10px] font-medium">
                          {[['lxa', 'B×A'], ['mq', 'mq']].map(([m, label]) => (
                            <button key={m} type="button" onClick={() => updatePorzione(i, { modalita: m, lunghezza_m: '', altezza_m: '', mq: 0 })}
                              className={`px-2.5 py-1 transition-colors ${p.modalita === m ? 'bg-blue-600 text-white' : 'bg-white text-blue-500 hover:bg-blue-50'}`}>{label}</button>
                          ))}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => removePorzione(i)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                      {p.modalita === 'lxa' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <CampoNumero className="h-8 w-20 text-xs" placeholder="Base m" value={p.lunghezza_m || ''} onChange={(e) => { const b = parseFloat(e.target.value) || 0; const a = parseFloat(p.altezza_m) || 0; updatePorzione(i, { lunghezza_m: e.target.value, mq: b * a }); }} />
                            <span className="text-xs text-muted-foreground">m</span>
                          </div>
                          <span className="text-xs text-muted-foreground">×</span>
                          <div className="flex items-center gap-1">
                            <CampoNumero className="h-8 w-20 text-xs" placeholder="Alt. m" value={p.altezza_m || ''} onChange={(e) => { const a = parseFloat(e.target.value) || 0; const b = parseFloat(p.lunghezza_m) || 0; updatePorzione(i, { altezza_m: e.target.value, mq: b * a }); }} />
                            <span className="text-xs text-muted-foreground">m</span>
                          </div>
                          <span className="text-xs font-bold text-blue-700">= {fmt2(mqP)} mq</span>
                        </div>
                      )}
                      {p.modalita === 'mq' && (
                        <div className="flex items-center gap-2">
                          <CampoNumero className="h-8 w-28 text-xs" placeholder="0.00" value={p.mq || ''} onChange={(e) => updatePorzione(i, { mq: e.target.value })} />
                          <span className="text-xs font-bold text-blue-700">{fmt2(parseFloat(p.mq) || 0)} mq</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-blue-700 font-semibold">Totale porzioni: {fmt2(mqPorzioni)} mq</p>
              </div>
            )}

            {/* Aggiungi porzione */}
            {showAggiungiOpts ? (
              <div className="flex flex-wrap gap-1.5">
                {TIPI_AGGIUNGI.map(v => (
                  <button key={v.tipo} type="button" onClick={() => addPorzione(v.tipo)} className="text-[11px] px-2.5 py-1 rounded-full border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors">+ {v.label}</button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setShowAggiungiOpts(true)} className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium">+ Aggiungi superficie</button>
            )}

            {/* Riepilogo calcoli */}
            {mqMisure > 0 && (
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-primary mb-1.5">Superfici calcolate</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <span className="text-muted-foreground">Superficie lorda:</span>
                  <span className="font-semibold">{fmt2(mqMisure)} mq</span>
                  {mqSottrai > 0 && <><span className="text-destructive/80">− Sottrazioni:</span><span className="font-semibold text-destructive/80">−{fmt2(mqSottrai)} mq</span></>}
                  {mqPorzioni > 0 && <><span className="text-blue-700">+ Porzioni aggiunte:</span><span className="font-semibold text-blue-700">+{fmt2(mqPorzioni)} mq</span></>}
                  <span className="font-medium border-t border-primary/20 pt-1 text-primary">Totale da tinteggiare:</span>
                  <span className="font-bold text-primary border-t border-primary/20 pt-1">{fmt2(mqTotale)} mq</span>
                </div>
              </div>
            )}
          </Sezione>

          {/* Sezione 2: Sottrarre */}
          <Sezione titolo="Sottrarre" icon={Minus} count={(facciata.sottrazioni || []).length}>
            {(facciata.sottrazioni || []).map((s, i) => {
              const tipoInfo = TIPI_SOTTRAI.find(t => t.value === s.tipo) || TIPI_SOTTRAI[0];
              const sMod = s.modalita || 'lxa';
              const mqLxa = (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * tipoInfo.moltiplicatore;
              const mqDirect = parseFloat(s.mq) || 0;
              const mqTot = sMod === 'mq' ? mqDirect : mqLxa;
              const updateSot = (fields) => updateSottrai(i, fields);
              return (
                <div key={i} className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex flex-wrap gap-1 flex-1">
                      {TIPI_SOTTRAI.map(t => (
                        <button key={t.value} type="button" onClick={() => updateSot({ tipo: t.value })}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${s.tipo === t.value ? 'bg-destructive/80 text-white border-destructive/80' : 'border-dashed border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive'}`}>{t.label}</button>
                      ))}
                    </div>
                    <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-medium">
                      {[['lxa', 'B×A'], ['mq', 'mq']].map(([m, label]) => (
                        <button key={m} type="button" onClick={() => updateSot({ modalita: m })}
                          className={`px-2 py-1 transition-colors ${sMod === m ? 'bg-destructive/80 text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}>{label}</button>
                      ))}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => removeSottrai(i)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                  {s.tipo === 'altro' && <Input className="h-8 text-xs" placeholder="Descrizione..." value={s.descrizione || ''} onChange={(e) => updateSot({ descrizione: e.target.value })} />}
                  {sMod === 'lxa' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <CampoNumero className="h-8 w-20 text-xs" placeholder="Lung. m" value={s.lunghezza || ''} onChange={(e) => updateSot({ lunghezza: e.target.value })} />
                        <span className="text-xs text-muted-foreground">m</span>
                      </div>
                      <span className="text-xs text-muted-foreground">×</span>
                      <div className="flex items-center gap-1">
                        <CampoNumero className="h-8 w-20 text-xs" placeholder="Alt. m" value={s.altezza || ''} onChange={(e) => updateSot({ altezza: e.target.value })} />
                        <span className="text-xs text-muted-foreground">m</span>
                      </div>
                      {tipoInfo.moltiplicatore === 2 && <span className="text-[10px] text-blue-600 font-medium">× 2 lati</span>}
                      {s.lunghezza && s.altezza && <span className="text-xs font-bold text-destructive">− {mqTot.toFixed(2)} mq</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CampoNumero className="h-8 w-28 text-xs" placeholder="0.00" value={s.mq || ''} onChange={(e) => updateSot({ mq: e.target.value })} />
                      <span className="text-xs text-muted-foreground">mq</span>
                      {mqDirect > 0 && <span className="text-xs font-bold text-destructive">− {mqDirect.toFixed(2)} mq</span>}
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => update('sottrazioni', (prev) => [...(prev || []), { tipo: 'finestra', modalita: 'lxa', lunghezza: '', altezza: '', mq: 0 }])}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-destructive/30 text-destructive/70 hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-colors font-medium">+ Aggiungi porzione da sottrarre</button>
          </Sezione>

          {/* Sezione 3: Lavorazioni puntuali */}
          <Sezione titolo="Lavorazioni puntuali" icon={Wrench} count={(facciata.voci_extra || []).length}>
            {(facciata.voci_extra || []).map((voce, i) => (
              <VoceRow key={i} voce={voce} mqFacciata={mqTotale} onUpdate={(fields) => updateVoceExtra(i, fields)} onRemove={() => removeVoceExtra(i)} />
            ))}
            {showVoceOpts ? (
              <div className="flex flex-wrap gap-1.5">
                {VOCI_EXTRA_TIPI.map(v => (
                  <button key={v.tipo} type="button" onClick={() => addVoceExtra(v.tipo)} className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">+ {v.label}</button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setShowVoceOpts(true)} className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors font-medium">+ Aggiungi lavorazione</button>
            )}
          </Sezione>

          {/* Sezione 4: Foto */}
          <Sezione titolo="Foto" icon={Camera} count={(facciata.foto || []).length}>
            <FotoGrid />
          </Sezione>
        </div>
      )}
    </div>
  );
}