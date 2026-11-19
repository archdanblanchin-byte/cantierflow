import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ChevronDown, ChevronUp, Camera, ZoomIn, Download, Ruler, Minus, Wrench } from 'lucide-react';
import { calcolaStanza } from './calcoliStanza';
import { base44 } from '@/api/base44Client';
import CampoNumero from './CampoNumero';

const TIPI_STANZA = ['Cucina', 'Soggiorno', 'Camera da letto', 'Camera figlio 1', 'Camera figlio 2', 'Corridoio', 'Disimpegno', 'Bagno', 'Bagno 2', 'Studio', 'Sala da pranzo', 'Ripostiglio', 'Garage', 'Scala', 'Altro'];

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

// ─── Riga trave esterna ───
function TraveRow({ trave, onUpdate, onRemove }) {
  const [modalita, setModalita] = useState(trave.modalita || 'lxa_sviluppo');
  const setMod = (m) => { setModalita(m); onUpdate({ modalita: m, lunghezza_m: '', larghezza_m: '', sviluppo: '', mq: 0 }); };

  const mqCalcolati = (() => {
    const l = parseFloat(trave.lunghezza_m) || 0, la = parseFloat(trave.larghezza_m) || 0, sv = parseFloat(trave.sviluppo) || 1;
    if (modalita === 'lxa_sviluppo') return l * la * sv;
    if (modalita === 'lxl') return l * la;
    return parseFloat(trave.mq) || 0;
  })();

  return (
    <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-amber-800 flex-1 min-w-[60px]">Trave</span>
        <Input className="h-7 text-xs flex-1 min-w-[100px]" placeholder="Descrizione (es. trave A)"
          value={trave.descrizione || ''} onChange={(e) => onUpdate({ descrizione: e.target.value })} />
        <div className="flex rounded-md border border-amber-300 overflow-hidden text-[10px] font-medium">
          {[['lxa_sviluppo', 'L×L×sv'], ['lxl', 'L×L'], ['mq', 'mq']].map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMod(m)}
              className={`px-2 py-1 transition-colors ${modalita === m ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 hover:bg-amber-50'}`}>{label}</button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={onRemove}><Trash2 className="w-3 h-3" /></Button>
      </div>
      {(modalita === 'lxa_sviluppo' || modalita === 'lxl') && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <CampoNumero className="h-8 w-20 text-xs" placeholder="Lung. m" value={trave.lunghezza_m || ''}
              onChange={(e) => { const l = parseFloat(e.target.value) || 0, la = parseFloat(trave.larghezza_m) || 0, sv = parseFloat(trave.sviluppo) || 1; onUpdate({ lunghezza_m: e.target.value, mq: modalita === 'lxa_sviluppo' ? l * la * sv : l * la }); }} />
            <span className="text-xs text-muted-foreground">m</span>
          </div>
          <span className="text-xs text-muted-foreground">×</span>
          <div className="flex items-center gap-1">
            <CampoNumero className="h-8 w-20 text-xs" placeholder="Larg. m" value={trave.larghezza_m || ''}
              onChange={(e) => { const la = parseFloat(e.target.value) || 0, l = parseFloat(trave.lunghezza_m) || 0, sv = parseFloat(trave.sviluppo) || 1; onUpdate({ larghezza_m: e.target.value, mq: modalita === 'lxa_sviluppo' ? l * la * sv : l * la }); }} />
            <span className="text-xs text-muted-foreground">m</span>
          </div>
          {modalita === 'lxa_sviluppo' && (
            <>
              <span className="text-xs text-muted-foreground">×</span>
              <div className="flex items-center gap-1">
                <CampoNumero className="h-8 w-20 text-xs" placeholder="Sviluppo" value={trave.sviluppo || ''}
                  onChange={(e) => { const sv = parseFloat(e.target.value) || 1, l = parseFloat(trave.lunghezza_m) || 0, la = parseFloat(trave.larghezza_m) || 0; onUpdate({ sviluppo: e.target.value, mq: l * la * sv }); }} />
                <span className="text-xs text-muted-foreground">sv</span>
              </div>
            </>
          )}
          <span className="text-xs font-bold text-amber-700">= {mqCalcolati.toFixed(2)} mq</span>
        </div>
      )}
      {modalita === 'mq' && (
        <div className="flex items-center gap-2">
          <CampoNumero className="h-8 w-28 text-xs" placeholder="0.00" value={trave.mq || ''} onChange={(e) => onUpdate({ mq: e.target.value })} />
          <span className="text-xs font-bold text-amber-700">mq</span>
        </div>
      )}
    </div>
  );
}

const PARETI_EXTRA_TIPI = [
  { tipo: 'parete', label: 'Parete' }, { tipo: 'controsoffitto', label: 'Controsoffitto' },
  { tipo: 'nicchia', label: 'Nicchia' }, { tipo: 'pilastro', label: 'Pilastro' }, { tipo: 'altro_parete', label: 'Altro' },
];

// ─── Riga parete extra ───
function PareteRow({ parete, onUpdate, onRemove }) {
  const [modalita, setModalita] = useState(parete.modalita || 'lxa');
  const setMod = (m) => { setModalita(m); onUpdate({ modalita: m, lunghezza_m: '', altezza_m: '', mq: 0 }); };
  const mqCalcolati = modalita === 'lxa' ? (parseFloat(parete.lunghezza_m) || 0) * (parseFloat(parete.altezza_m) || 0) : parseFloat(parete.mq) || 0;

  return (
    <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-blue-800 flex-1 min-w-[80px]">{PARETI_EXTRA_TIPI.find(v => v.tipo === parete.tipo)?.label || parete.tipo}</span>
        {parete.tipo === 'altro_parete' && (
          <Input className="h-7 text-xs w-28" placeholder="Descrizione..." value={parete.descrizione || ''} onChange={(e) => onUpdate({ descrizione: e.target.value })} />
        )}
        <div className="flex rounded-md border border-blue-200 overflow-hidden text-[10px] font-medium">
          {[['lxa', 'B×A'], ['mq', 'mq']].map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMod(m)}
              className={`px-2.5 py-1 transition-colors ${modalita === m ? 'bg-blue-600 text-white' : 'bg-white text-blue-500 hover:bg-blue-50'}`}>{label}</button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={onRemove}><Trash2 className="w-3 h-3" /></Button>
      </div>
      {modalita === 'lxa' && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <CampoNumero className="h-8 w-20 text-xs" placeholder="Base m" value={parete.lunghezza_m || ''}
              onChange={(e) => { const b = parseFloat(e.target.value) || 0, a = parseFloat(parete.altezza_m) || 0; onUpdate({ lunghezza_m: e.target.value, mq: b * a }); }} />
            <span className="text-xs text-muted-foreground">m</span>
          </div>
          <span className="text-xs text-muted-foreground">×</span>
          <div className="flex items-center gap-1">
            <CampoNumero className="h-8 w-20 text-xs" placeholder="Alt. m" value={parete.altezza_m || ''}
              onChange={(e) => { const a = parseFloat(e.target.value) || 0, b = parseFloat(parete.lunghezza_m) || 0; onUpdate({ altezza_m: e.target.value, mq: b * a }); }} />
            <span className="text-xs text-muted-foreground">m</span>
          </div>
          <span className="text-xs font-bold text-blue-700">= {mqCalcolati.toFixed(2)} mq</span>
        </div>
      )}
      {modalita === 'mq' && (
        <div className="flex items-center gap-2">
          <CampoNumero className="h-8 w-28 text-xs" placeholder="0.00" value={parete.mq || ''} onChange={(e) => onUpdate({ mq: e.target.value })} />
          <span className="text-xs text-muted-foreground">mq</span>
          <span className="text-xs font-bold text-blue-700">{(parseFloat(parete.mq) || 0).toFixed(2)} mq</span>
        </div>
      )}
    </div>
  );
}

const VOCI_EXTRA_TIPI = [
  { tipo: 'muffa', label: 'Muffa' }, { tipo: 'intonaco_deumidificante', label: 'Intonaco Deumidificante' },
  { tipo: 'scrostare', label: 'Scrostare' }, { tipo: 'stuccare', label: 'Stuccare' },
  { tipo: 'rasare', label: 'Rasare' }, { tipo: 'altro', label: 'Altro' },
];

// ─── Riga voce extra ───
function VoceRow({ voce, onUpdate, onRemove, mqStanza }) {
  const [modalita, setModalita] = useState(voce.modalita || 'lxa');
  const setMod = (m) => { setModalita(m); onUpdate({ modalita: m, lunghezze: [''], altezza_m: '', valore: 0 }); };
  const lunghezze = voce.lunghezze || (voce.lunghezza_m ? [voce.lunghezza_m] : ['']);
  const totaleLunghezza = lunghezze.reduce((sum, l) => sum + (parseFloat(l) || 0), 0);
  const altezza = parseFloat(voce.altezza_m) || 0;
  const mqCalcolati = totaleLunghezza * altezza;

  const updateLunghezza = (i, val) => {
    const nuove = [...lunghezze]; nuove[i] = val;
    const tot = nuove.reduce((s, l) => s + (parseFloat(l) || 0), 0);
    onUpdate({ lunghezze: nuove, lunghezza_m: undefined, valore: tot * altezza });
  };
  const addLunghezza = () => { onUpdate({ lunghezze: [...lunghezze, ''], lunghezza_m: undefined }); };
  const removeLunghezza = (i) => {
    const nuove = lunghezze.filter((_, idx) => idx !== i);
    const tot = nuove.reduce((s, l) => s + (parseFloat(l) || 0), 0);
    onUpdate({ lunghezze: nuove.length ? nuove : [''], lunghezza_m: undefined, valore: tot * altezza });
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
          {/* Lunghezza + Altezza sulla stessa riga */}
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
          {/* Lunghezze aggiuntive */}
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
          {mqStanza > 0 && (parseFloat(voce.valore) || 0) > 0 && (
            <span className="text-xs font-bold text-primary">= {(mqStanza * ((parseFloat(voce.valore) || 0) / 100)).toFixed(2)} mq
              <span className="text-muted-foreground font-normal ml-1">(su {mqStanza.toFixed(1)} mq stanza)</span>
            </span>
          )}
          {mqStanza === 0 && <span className="text-[10px] text-amber-600">Inserisci le misure della stanza per calcolare i mq</span>}
        </div>
      )}
    </div>
  );
}

const TIPI_APERTURA = [
  { value: 'porta_1_lato', label: 'Porzione 1 lato', moltiplicatore: 1 },
  { value: 'porta_2_lati', label: 'Porzione 2 lati', moltiplicatore: 2 },
  { value: 'parete', label: 'Parete', moltiplicatore: 1 },
  { value: 'soffitto', label: 'Soffitto', moltiplicatore: 1 },
  { value: 'armadio', label: 'Armadio', moltiplicatore: 1 },
  { value: 'cucina', label: 'Cucina', moltiplicatore: 1 },
  { value: 'altro', label: 'Altro', moltiplicatore: 1 },
];

export default function StanzaCard({ stanza, index, onChange, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [showPareteOpts, setShowPareteOpts] = useState(false);
  const [showVoceOpts, setShowVoceOpts] = useState(false);
  const lunghezzaRef = useRef(null);

  const update = (field, valueOrFn) => {
    if (typeof valueOrFn === 'function') { onChange((prev) => ({ [field]: valueOrFn(prev[field]) })); }
    else { onChange({ [field]: valueOrFn }); }
  };

  const addTraveEsterna = () => update('travi_esterne', (prev) => [...(prev || []), { modalita: 'lxa_sviluppo', lunghezza_m: '', larghezza_m: '', sviluppo: '', mq: 0, descrizione: '' }]);
  const updateTraveEsterna = (i, fields) => update('travi_esterne', (prev) => { const u = [...(prev || [])]; u[i] = { ...u[i], ...fields }; return u; });
  const removeTraveEsterna = (i) => update('travi_esterne', (prev) => prev.filter((_, idx) => idx !== i));

  const addPareteExtra = (tipo) => update('pareti_extra', (prev) => [...(prev || []), { tipo, modalita: 'lxa', lunghezza_m: '', altezza_m: '', mq: 0 }]);
  const updatePareteExtra = (i, fields) => update('pareti_extra', (prev) => { const u = [...(prev || [])]; u[i] = { ...u[i], ...fields }; return u; });
  const removePareteExtra = (i) => update('pareti_extra', (prev) => prev.filter((_, idx) => idx !== i));

  const addVoceExtra = (tipo) => update('voci_extra', (prev) => [...(prev || []), { tipo, valore: 0, modalita: 'lxa', lunghezze: [''], altezza_m: '' }]);
  const updateVoceFields = (i, fields) => update('voci_extra', (prev) => { const u = [...(prev || [])]; u[i] = { ...u[i], ...fields }; return u; });
  const removeVoce = (i) => update('voci_extra', (prev) => prev.filter((_, idx) => idx !== i));

  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    setUploadingFoto(true);
    const urls = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file }).then(r => r.file_url)));
    update('foto', (prev) => [...(prev || []), ...urls]);
    setUploadingFoto(false); e.target.value = '';
  };
  const removeFoto = (i) => update('foto', (prev) => prev.filter((_, idx) => idx !== i));

  const calc = calcolaStanza(stanza);
  const mqStanzaPerPerc = calc.mq_pareti + calc.mq_soffitto;

  const FotoGrid = () => (
    <div className="flex flex-wrap gap-2">
      {(stanza.foto || []).map((url, i) => (
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
      {/* Header stanza */}
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/30 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">#{index + 1}</span>
          <span className="font-semibold text-sm">{stanza.nome_custom || (stanza.tipo === 'travi_esterne' ? 'Travi' : stanza.tipo) || 'Nuova stanza'}</span>
          {stanza.tipo === 'travi_esterne' && calc.mq_travi_esterne > 0 && (
            <Badge variant="outline" className="text-[10px] px-2 py-0 bg-amber-50 text-amber-700 border-amber-200">{calc.mq_travi_esterne.toFixed(1)} mq travi</Badge>
          )}
          {stanza.tipo !== 'travi_esterne' && stanza.lunghezza && stanza.larghezza && stanza.altezza && (
            <Badge variant="outline" className="text-[10px] px-2 py-0 bg-primary/5 text-primary border-primary/20">{calc.totale_mq.toFixed(1)} mq tot.</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="w-3.5 h-3.5" /></Button>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>

      {/* ─── Travi esterne ─── */}
      {expanded && stanza.tipo === 'travi_esterne' && (
        <div className="p-1.5 sm:p-4 space-y-3">
          {/* Sezione 1: Aggiungi */}
          <Sezione titolo="Aggiungi" icon={Ruler} count={(stanza.travi_esterne || []).length} defaultOpen={true}>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome personalizzato</Label>
              <Input className="h-9" placeholder="Es: Salone, Corridoio..." value={stanza.nome_custom || ''} onChange={(e) => update('nome_custom', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Travi</Label>
              {(stanza.travi_esterne || []).map((trave, i) => (
                <TraveRow key={i} trave={trave} onUpdate={(fields) => updateTraveEsterna(i, fields)} onRemove={() => removeTraveEsterna(i)} />
              ))}
              <button type="button" onClick={addTraveEsterna}
                className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-amber-300 text-amber-600 hover:border-amber-500 hover:bg-amber-50 transition-colors">+ Aggiungi trave</button>
            </div>
            {(stanza.travi_esterne || []).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1 text-xs text-amber-800">
                <p className="font-semibold mb-1.5">Riepilogo travi</p>
                {(stanza.travi_esterne || []).map((t, i) => {
                  const l = parseFloat(t.lunghezza_m) || 0, la = parseFloat(t.larghezza_m) || 0, sv = parseFloat(t.sviluppo) || 1;
                  const mq = t.modalita === 'lxa_sviluppo' ? l * la * sv : t.modalita === 'lxl' ? l * la : parseFloat(t.mq) || 0;
                  return <div key={i} className="flex justify-between"><span className="text-amber-700">{t.descrizione || `Trave ${i + 1}`}</span><span className="font-bold">{mq.toFixed(2)} mq</span></div>;
                })}
                <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                  <span className="font-semibold">Totale travi:</span>
                  <span className="font-bold text-amber-900">{(stanza.travi_esterne || []).reduce((acc, t) => {
                    const l = parseFloat(t.lunghezza_m) || 0, la = parseFloat(t.larghezza_m) || 0, sv = parseFloat(t.sviluppo) || 1;
                    return acc + (t.modalita === 'lxa_sviluppo' ? l * la * sv : t.modalita === 'lxl' ? l * la : parseFloat(t.mq) || 0);
                  }, 0).toFixed(2)} mq</span>
                </div>
              </div>
            )}
          </Sezione>

          {/* Sezione 2: Foto */}
          <Sezione titolo="Foto" icon={Camera} count={(stanza.foto || []).length}>
            <FotoGrid />
          </Sezione>
        </div>
      )}

      {/* ─── Stanza normale ─── */}
      {expanded && stanza.tipo !== 'travi_esterne' && (
        <div className="p-1.5 sm:p-4 space-y-3">
          {/* Sezione 1: Metrature */}
          <Sezione titolo="Aggiungi" icon={Ruler} count={(stanza.pareti_extra || []).length} defaultOpen={true}>
            {/* Tipo stanza + Nome */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo stanza</Label>
                <select value={stanza.tipo || ''} onChange={(e) => { const val = e.target.value; update('tipo', val); if (val && val !== 'Altro') setTimeout(() => lunghezzaRef.current?.focus(), 50); }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Seleziona tipo...</option>
                  {TIPI_STANZA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome personalizzato</Label>
                <Input className="h-9" placeholder="Es: Camera principale" value={stanza.nome_custom || ''} onChange={(e) => update('nome_custom', e.target.value)} />
              </div>
            </div>

            {/* Misure */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Lunghezza (m)</Label>
                <CampoNumero ref={lunghezzaRef} className="h-9" placeholder="0.00" value={stanza.lunghezza || ''} onChange={(e) => update('lunghezza', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Larghezza (m)</Label>
                <CampoNumero className="h-9" placeholder="0.00" value={stanza.larghezza || ''} onChange={(e) => update('larghezza', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  Altezza (m)
                  {stanza.altezza_suggerita && <span className="text-[9px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">stessa</span>}
                </Label>
                <CampoNumero
                  className={`h-9 ${stanza.altezza_suggerita ? 'border-green-300 bg-green-50/50' : ''}`}
                  placeholder="0.00"
                  value={stanza.altezza || ''}
                  onChange={(e) => { update('altezza', e.target.value); if (stanza.altezza_suggerita) update('altezza_suggerita', false); }} />
                {stanza.altezza_suggerita && (
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => update('altezza_suggerita', false)}
                      className="text-[10px] text-green-600 font-medium hover:underline">Sì, conferma</button>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <button type="button" onClick={() => { update('altezza', ''); update('altezza_suggerita', false); }}
                      className="text-[10px] text-muted-foreground hover:text-destructive">cambia</button>
                  </div>
                )}
              </div>
            </div>

            {/* Superfici aggiuntive */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Superfici da includere nel calcolo:</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => update('soffitto', !stanza.soffitto)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${stanza.soffitto ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
                  {stanza.soffitto ? '✓' : '○'} Soffitto
                </button>
                <button type="button" onClick={() => update('travi', !stanza.travi)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${stanza.travi ? 'bg-amber-500 text-white border-amber-500' : 'bg-card border-border text-muted-foreground hover:border-amber-400'}`}>
                  {stanza.travi ? '✓' : '○'} Travi
                </button>
              </div>
            </div>

            {/* Sigillatura travi */}
            {stanza.travi && (
              <div className="space-y-1.5">
                <Label className="text-xs">Sigillatura travi — ML parete</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <CampoNumero className="h-9 w-28" placeholder="ML parete" value={stanza.travi_sigillatura_ml || ''} onChange={(e) => update('travi_sigillatura_ml', e.target.value)} />
                  <span className="text-xs text-muted-foreground">× 2 ×</span>
                  <div className="flex items-center gap-1">
                    <CampoNumero className="h-9 w-20" placeholder="1,65" value={stanza.travi_sviluppo || ''} onChange={(e) => update('travi_sviluppo', e.target.value)} />
                    <span className="text-xs text-muted-foreground">(sviluppo)</span>
                  </div>
                  {stanza.travi_sigillatura_ml && <span className="text-xs font-bold text-primary">= {((parseFloat(stanza.travi_sigillatura_ml) || 0) * 2 * (parseFloat(stanza.travi_sviluppo) || 1.65)).toFixed(2)} ml</span>}
                </div>
                <p className="text-xs text-muted-foreground">ML parete × 2 × sviluppo (default 1.65)</p>
              </div>
            )}

            {/* Calcoli superficie */}
            {stanza.lunghezza && stanza.larghezza && stanza.altezza && (
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-primary mb-1.5">Superfici calcolate</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <span className="text-muted-foreground">Pareti lorde:</span>
                  <span className="font-semibold">{(((parseFloat(stanza.lunghezza) || 0) + (parseFloat(stanza.larghezza) || 0)) * 2 * (parseFloat(stanza.altezza) || 0)).toFixed(2)} mq</span>
                  {calc.mq_aperture > 0 && <><span className="text-muted-foreground text-destructive/80">− Porte/Archi:</span><span className="font-semibold text-destructive/80">−{calc.mq_aperture.toFixed(2)} mq</span></>}
                  <span className="text-muted-foreground">Pareti nette:</span><span className="font-semibold">{calc.mq_pareti.toFixed(2)} mq</span>
                  {stanza.soffitto && <><span className="text-muted-foreground">Soffitto:</span><span className="font-semibold">{calc.mq_soffitto.toFixed(2)} mq</span></>}
                  {calc.mq_travi_esterne > 0 && <><span className="text-muted-foreground">Travi esterne:</span><span className="font-semibold">+{calc.mq_travi_esterne.toFixed(2)} mq</span></>}
                  {calc.mq_pareti_extra > 0 && <><span className="text-muted-foreground">Pareti extra:</span><span className="font-semibold">+{calc.mq_pareti_extra.toFixed(2)} mq</span></>}
                  <span className="text-muted-foreground font-medium border-t border-primary/20 pt-1">Totale da pitturare:</span>
                  <span className="font-bold text-primary border-t border-primary/20 pt-1">{calc.totale_mq.toFixed(2)} mq</span>
                  {stanza.travi && <><span className="text-amber-700 font-medium border-t border-amber-200 pt-1">Travi (sep.):</span><span className="font-bold text-amber-700 border-t border-amber-200 pt-1">{calc.mq_travi.toFixed(2)} mq</span></>}
                  {stanza.travi && calc.mq_sigillatura_travi > 0 && <><span className="text-amber-600 text-[11px]">Sigillatura travi:</span><span className="font-semibold text-amber-600 text-[11px]">{calc.mq_sigillatura_travi.toFixed(2)} ml</span></>}
                  {stanza.travi && stanza.lunghezza && stanza.larghezza && <><span className="text-amber-700 text-[11px] border-t border-amber-100 pt-1">Calcolo travi:</span><span className="font-semibold text-amber-700 text-[11px] border-t border-amber-100 pt-1">{((parseFloat(stanza.lunghezza) || 0) * (parseFloat(stanza.larghezza) || 0)).toFixed(2)} × 1.65 = {((parseFloat(stanza.lunghezza) || 0) * (parseFloat(stanza.larghezza) || 0) * 1.65).toFixed(2)} mq</span></>}
                </div>
              </div>
            )}

            {/* Porzioni aggiuntive (pareti_extra) */}
            {(stanza.pareti_extra || []).length > 0 && (
              <div className="space-y-2">
                {(stanza.pareti_extra || []).map((parete, i) => (
                  <PareteRow key={i} parete={parete} onUpdate={(fields) => updatePareteExtra(i, fields)} onRemove={() => removePareteExtra(i)} />
                ))}
                {(stanza.pareti_extra || []).length > 0 && (
                  <p className="text-xs text-blue-700 font-semibold">Totale porzioni: {(stanza.pareti_extra || []).reduce((acc, p) => acc + (p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0), 0).toFixed(2)} mq</p>
                )}
              </div>
            )}

            {/* Aggiungi porzione */}
            {showPareteOpts ? (
              <div className="flex flex-wrap gap-1.5">
                {PARETI_EXTRA_TIPI.map(v => (
                  <button key={v.tipo} type="button" onClick={() => { addPareteExtra(v.tipo); setShowPareteOpts(false); }}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors">+ {v.label}</button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setShowPareteOpts(true)}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium">
                + Aggiungi superficie
              </button>
            )}
          </Sezione>

          {/* Sezione 2: Sottrazioni */}
          <Sezione titolo="Sottrarre" icon={Minus} count={(stanza.aperture || []).length}>
            {(stanza.aperture || []).map((ap, i) => {
              const tipoInfo = TIPI_APERTURA.find(t => t.value === ap.tipo) || TIPI_APERTURA[0];
              const apMod = ap.modalita || 'lxa';
              const mqLxa = (parseFloat(ap.lunghezza) || 0) * (parseFloat(ap.altezza) || 0) * tipoInfo.moltiplicatore;
              const mqDirect = parseFloat(ap.mq) || 0;
              const mqTot = apMod === 'mq' ? mqDirect : mqLxa;
              const updateAp = (fields) => update('aperture', (prev) => { const u = [...(prev || [])]; u[i] = { ...u[i], ...fields }; return u; });
              return (
                <div key={i} className="bg-muted/30 border border-border/60 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex flex-wrap gap-1 flex-1">
                      {TIPI_APERTURA.map(t => (
                        <button key={t.value} type="button" onClick={() => updateAp({ tipo: t.value })}
                          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${ap.tipo === t.value ? 'bg-destructive/80 text-white border-destructive/80' : 'border-dashed border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive'}`}>{t.label}</button>
                      ))}
                    </div>
                    <div className="flex rounded-md border border-border overflow-hidden text-[10px] font-medium">
                      {[['lxa', 'B×A'], ['mq', 'mq']].map(([m, label]) => (
                        <button key={m} type="button" onClick={() => updateAp({ modalita: m })}
                          className={`px-2 py-1 transition-colors ${apMod === m ? 'bg-destructive/80 text-white' : 'bg-card text-muted-foreground hover:bg-muted'}`}>{label}</button>
                      ))}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => update('aperture', (prev) => prev.filter((_, idx) => idx !== i))}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                  {ap.tipo === 'altro' && <Input className="h-8 text-xs" placeholder="Descrizione..." value={ap.descrizione || ''} onChange={(e) => updateAp({ descrizione: e.target.value })} />}
                  {apMod === 'lxa' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <CampoNumero className="h-8 w-20 text-xs" placeholder="Lung. m" value={ap.lunghezza || ''} onChange={(e) => updateAp({ lunghezza: e.target.value })} />
                        <span className="text-xs text-muted-foreground">m</span>
                      </div>
                      <span className="text-xs text-muted-foreground">×</span>
                      <div className="flex items-center gap-1">
                        <CampoNumero className="h-8 w-20 text-xs" placeholder="Alt. m" value={ap.altezza || ''} onChange={(e) => updateAp({ altezza: e.target.value })} />
                        <span className="text-xs text-muted-foreground">m</span>
                      </div>
                      {tipoInfo.moltiplicatore === 2 && <span className="text-[10px] text-blue-600 font-medium">× 2 lati</span>}
                      {ap.lunghezza && ap.altezza && <span className="text-xs font-bold text-destructive">− {mqTot.toFixed(2)} mq</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CampoNumero className="h-8 w-28 text-xs" placeholder="0.00" value={ap.mq || ''} onChange={(e) => updateAp({ mq: e.target.value })} />
                      <span className="text-xs text-muted-foreground">mq</span>
                      {mqDirect > 0 && <span className="text-xs font-bold text-destructive">− {mqDirect.toFixed(2)} mq</span>}
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => update('aperture', (prev) => [...(prev || []), { tipo: 'porta_1_lato', modalita: 'lxa', lunghezza: '', altezza: '', mq: 0 }])}
              className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-destructive/30 text-destructive/70 hover:border-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-colors font-medium">
              + Aggiungi porzione da sottrarre
            </button>
          </Sezione>

          {/* Sezione 3: Altre lavorazioni */}
          <Sezione titolo="Lavorazioni puntuali" icon={Wrench} count={(stanza.voci_extra || []).length}>
            {(stanza.voci_extra || []).map((voce, i) => (
              <VoceRow key={i} voce={voce} mqStanza={mqStanzaPerPerc} onUpdate={(fields) => updateVoceFields(i, fields)} onRemove={() => removeVoce(i)} />
            ))}
            {showVoceOpts ? (
              <div className="flex flex-wrap gap-1.5">
                {VOCI_EXTRA_TIPI.map(v => (
                  <button key={v.tipo} type="button" onClick={() => { addVoceExtra(v.tipo); setShowVoceOpts(false); }}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors">+ {v.label}</button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setShowVoceOpts(true)}
                className="text-[11px] px-3 py-1.5 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors font-medium">
                + Aggiungi lavorazione
              </button>
            )}
          </Sezione>

          {/* Sezione 4: Foto */}
          <Sezione titolo="Foto" icon={Camera} count={(stanza.foto || []).length}>
            <FotoGrid />
          </Sezione>
        </div>
      )}
    </div>
  );
}