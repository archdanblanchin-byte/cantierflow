import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Save, Camera, ImageIcon, X, ZoomIn, CloudUpload, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import TotaliSopraluogo from './TotaliSopraluogo';
import RilevamentoMisure from './rilievi/RilevamentoMisure';
import MisureVecchiaDinamica from './MisureVecchiaDinamica';
import { getAmbito, calcolaTotaliByAmbito, facciataMqTotale } from './calcoliStanza';
import AudioNote from './AudioNote.jsx';
import AudioLavorazioni from './AudioLavorazioni.jsx';
import GpsIndirizzo from './GpsIndirizzo';
import GalleriaImmagini from './immagini/GalleriaImmagini';
import AllegatiSopraluogo from './AllegatiSopraluogo';
import ScansionePDF from './ScansionePDF';
import SezioneAllaCA from '@/components/preventivo/SezioneAllaCA';
import { base44 } from '@/api/base44Client';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_FORM = {
  tipo: 'interno',
  cliente_cognome: '',
  cliente_nome_personale: '',
  cliente_nome: '',
  nome_cantiere: '',
  cliente_indirizzo: '',
  cliente_citta: '',
  cliente_lat: null,
  cliente_lng: null,
  cliente_telefono: '',
  cliente_mail: '',
  ca_attivo: false,
  ca_nome: '',
  ca_cognome: '',
  ca_indirizzo: '',
  ca_citta: '',
  ca_telefono: '',
  ca_email: '',
  data_sopraluogo: new Date().toISOString().split('T')[0],
  prodotti_particolari: '',
  note_generali: '',
  note_dettaglio: '',
  stanze: [],
  rilievi: [],
  misure_extra: [],
  foto_generali: [],
  foto_esterno: [],
  allegati: [],
  audio_note: '',
  audio_lavorazioni: '',
  stato: 'bozza'
};

// ── Componente principale ─────────────────────────────────────────────────────
// Nei sopralluoghi salvati prima della separazione cognome/nome il nome completo
// viene diviso: l'ultima parola è il cognome, le altre formano il nome.
function inizializzaForm(sopraluogo) {
  const base = { ...DEFAULT_FORM, ...sopraluogo };
  if (!base.cliente_cognome && !base.cliente_nome_personale && base.cliente_nome) {
    const parti = String(base.cliente_nome).trim().split(/\s+/);
    base.cliente_cognome = parti.length > 1 ? parti[parti.length - 1] : parti[0];
    base.cliente_nome_personale = parti.length > 1 ? parti.slice(0, -1).join(' ') : '';
  }
  return base;
}

export default function FormSopraluogo({ sopraluogo, onSave, onBack, onDirtyChange, isSaving, giaSalvato, driveLoading, onCreaCartellina, driveFolderLink }) {
  const [form, setForm] = useState(() => inizializzaForm(sopraluogo));
  const [mostraScansione, setMostraScansione] = useState(false);
  const containerRef = useRef(null);

  const update = (field, valueOrFn) => {
    setForm((prev) => {
      const newValue = typeof valueOrFn === 'function' ? valueOrFn(prev[field]) : valueOrFn;
      return { ...prev, [field]: newValue };
    });
    onDirtyChange?.(true);
  };

  // Aggiorna una stanza applicando i campi parziali sullo stato più recente
  const updateStanza = (index, partialOrFn) => {
    setForm((prev) => {
      const updated = [...(prev.stanze || [])];
      const current = updated[index] || {};
      const partial = typeof partialOrFn === 'function' ? partialOrFn(current) : partialOrFn;
      updated[index] = { ...current, ...partial };
      return { ...prev, stanze: updated };
    });
    onDirtyChange?.(true);
  };

  const handleGps = (gpsData) => {
    setForm((prev) => ({
      ...prev,
      cliente_indirizzo: gpsData.indirizzo ?? prev.cliente_indirizzo,
      cliente_citta: gpsData.citta ?? prev.cliente_citta,
      cliente_lat: gpsData.lat ?? prev.cliente_lat,
      cliente_lng: gpsData.lng ?? prev.cliente_lng
    }));
  };

  const addStanza = (ambito = 'interno') => {
    const stesseStanze = (form.stanze || []).filter((s) => getAmbito(s) === ambito && s.tipo !== 'travi_esterne' && s.tipo !== 'facciata' && s.altezza);
    const ultimaAltezza = stesseStanze.length > 0 ? stesseStanze[stesseStanze.length - 1].altezza : '';
    const nuova = { id: generateId(), tipo: '', ambito, nome_custom: '', lunghezza: '', larghezza: '', altezza: ultimaAltezza, altezza_suggerita: !!ultimaAltezza, soffitto: false, travi: false, travi_ml: '', voci_extra: [], foto: [] };
    update('stanze', (prev) => [...(prev || []), nuova]);
  };

  const addTravi = (ambito = 'esterno') => {
    const nuova = { id: Date.now().toString(), tipo: 'travi_esterne', ambito, nome_custom: '', travi_esterne: [] };
    update('stanze', (prev) => [...(prev || []), nuova]);
  };

  const addFacciata = () => {
    const nuova = { id: generateId(), tipo: 'facciata', ambito: 'esterno', orientamento: '', nome_custom: '', misure: [], sottrazioni: [], porzioni: [], foto: [] };
    update('stanze', (prev) => [...(prev || []), nuova]);
  };

  // updateStanza ora definito sopra con functional updater
  const deleteStanza = (index) => {
    update('stanze', (prev) => (prev || []).filter((_, i) => i !== index));
  };

  const handleScansionePDF = (allegato) => {
    update('allegati', (prev) => [...(prev || []), { ...allegato, id: Math.random().toString(36).slice(2, 9) }]);
    setMostraScansione(false);
  };

  const cleanNumeric = (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  };

  const buildSafeForm = () => {
    const cleanedStanze = (form.stanze || []).map((s) => ({
      ...s,
      lunghezza: cleanNumeric(s.lunghezza),
      larghezza: cleanNumeric(s.larghezza),
      altezza: cleanNumeric(s.altezza),
      travi_ml: cleanNumeric(s.travi_ml),
      travi_sigillatura_ml: cleanNumeric(s.travi_sigillatura_ml),
      travi_sviluppo: cleanNumeric(s.travi_sviluppo),
      travi_esterne: (s.travi_esterne || []).map((t) => ({
        ...t,
        lunghezza_m: cleanNumeric(t.lunghezza_m),
        larghezza_m: cleanNumeric(t.larghezza_m),
        sviluppo: cleanNumeric(t.sviluppo),
        mq: cleanNumeric(t.mq)
      })),
      pareti_extra: (s.pareti_extra || []).map((p) => ({
        ...p,
        lunghezza_m: cleanNumeric(p.lunghezza_m),
        altezza_m: cleanNumeric(p.altezza_m),
        mq: cleanNumeric(p.mq)
      })),
      aperture: (s.aperture || []).map((ap) => ({
        ...ap,
        lunghezza: cleanNumeric(ap.lunghezza),
        altezza: cleanNumeric(ap.altezza)
      })),
      voci_extra: (s.voci_extra || []).map((v) => ({
        ...v,
        valore: cleanNumeric(v.valore),
        lunghezza_m: cleanNumeric(v.lunghezza_m),
        altezza_m: cleanNumeric(v.altezza_m)
      }))
    }));

    // Costruisce un oggetto con solo i campi scalari/array sicuri (evita riferimenti circolari DOM/Window)
    const nomeCompleto = [form.cliente_cognome, form.cliente_nome_personale].filter(Boolean).join(' ').trim();
    const safeForm = {
      tipo: form.tipo,
      cliente_cognome: form.cliente_cognome,
      cliente_nome_personale: form.cliente_nome_personale,
      cliente_nome: nomeCompleto || form.cliente_nome,
      nome_cantiere: form.nome_cantiere,
      cliente_indirizzo: form.cliente_indirizzo,
      cliente_citta: form.cliente_citta,
      cliente_lat: form.cliente_lat,
      cliente_lng: form.cliente_lng,
      cliente_telefono: form.cliente_telefono,
      cliente_mail: form.cliente_mail,
      data_sopraluogo: form.data_sopraluogo,
      prodotti_particolari: form.prodotti_particolari,
      note_generali: form.note_generali,
      note_dettaglio: form.note_dettaglio,
      audio_note: form.audio_note,
      audio_lavorazioni: form.audio_lavorazioni,
      stato: form.stato,
      ca_attivo: form.ca_attivo,
      ca_nome: form.ca_nome,
      ca_cognome: form.ca_cognome,
      ca_indirizzo: form.ca_indirizzo,
      ca_citta: form.ca_citta,
      ca_telefono: form.ca_telefono,
      ca_email: form.ca_email,
      foto_generali: form.foto_generali,
      foto_esterno: form.foto_esterno,
      allegati: form.allegati,
      misure_extra: (form.misure_extra || []).map((m) => ({
        ...m,
        valore: cleanNumeric(m.valore)
      })),
      stanze: cleanedStanze,
      rilievi: form.rilievi || []
    };
    return safeForm;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(buildSafeForm());
  };

  const handleCreaCartellina = () => {
    onCreaCartellina(buildSafeForm());
  };

  // ── Computazioni per blocchi ambito ──
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

  const updateMisureAmbito = (ambito, newItems) => {
    const others = (form.misure_extra || []).filter((m) => (m.ambito || 'interno') !== ambito);
    update('misure_extra', [...others, ...newItems]);
  };

  // I sopralluoghi creati con la vecchia dinamica (metrature per stanze/facciate)
  // mantengono la loro struttura originale anche in modifica.
  const usaVecchiaDinamica = (form.stanze || []).length > 0 && (form.rilievi || []).length === 0;

  return (
    <form ref={containerRef} onSubmit={handleSubmit} className="bg-background mt-10 flex flex-col min-h-screen">
      {/* ── Navbar ── */}
      <div className="bg-background px-4 fixed top-10 left-0 right-0 z-20 border-b border-border flex items-center gap-3 flex-shrink-0 shadow-sm py-1 my-2">
        <Button type="button" size="sm" variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate font-medium">
            {[form.cliente_cognome, form.cliente_nome_personale].filter(Boolean).join(' ') || form.cliente_nome}
            {form.nome_cantiere ? ` · ${form.nome_cantiere}` : ''}
          </p>
        </div>
        {giaSalvato &&
        <a href={driveFolderLink} target="_blank" rel="noreferrer" className="flex-shrink-0">
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 bg-green-50 border-green-300 text-green-700 hover:bg-green-100">
              <CheckCircle2 className="w-3.5 h-3.5" /> Apri Drive
            </Button>
          </a>
        }
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 flex-shrink-0" onClick={handleCreaCartellina} disabled={driveLoading || isSaving}>
          {driveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : giaSalvato ? <RefreshCw className="w-3.5 h-3.5" /> : <CloudUpload className="w-3.5 h-3.5" />}
          {driveLoading ? giaSalvato ? 'Aggiornamento…' : 'Creazione…' : giaSalvato ? 'Aggiorna rilievo' : 'Crea cartellina'}
        </Button>
        <Button type="submit" disabled={isSaving} size="sm" className="h-8 gap-1.5 flex-shrink-0">
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvo...' : 'Salva'}
        </Button>
      </div>

      {/* ── CONTENUTO SCROLLABILE ── */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-4 py-2 sm:py-4 space-y-6 pb-16 mt-20 max-w-5xl mx-auto w-full">

        {/* ── DATI CLIENTE ── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
            Dati Cliente
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cognome *</Label>
              <Input required placeholder="Rossi"
              value={form.cliente_cognome}
              onChange={(e) => update('cliente_cognome', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input placeholder="Mario"
              value={form.cliente_nome_personale}
              onChange={(e) => update('cliente_nome_personale', e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Nome cantiere</Label>
              <Input placeholder="Cantiere Via Roma"
              value={form.nome_cantiere}
              onChange={(e) => update('nome_cantiere', e.target.value)} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Indirizzo & GPS</Label>
              <GpsIndirizzo value={{ indirizzo: form.cliente_indirizzo, citta: form.cliente_citta, lat: form.cliente_lat, lng: form.cliente_lng }} onChange={handleGps} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefono</Label>
              <Input placeholder="+39 333 123456"
              value={form.cliente_telefono}
              onChange={(e) => update('cliente_telefono', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="cliente@email.it"
              value={form.cliente_mail}
              onChange={(e) => update('cliente_mail', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data sopralluogo</Label>
              <Input type="date"
              value={form.data_sopraluogo}
              onChange={(e) => update('data_sopraluogo', e.target.value)} />
            </div>
          </div>
          <SezioneAllaCA form={form} update={update} />
        </section>

        <div className="border-t border-border" />

        {/* ── 2. MISURE: SOPRALLUOGO INTERNO + ESTERNO ── */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
            Misure & Rilievo
          </h2>
          {usaVecchiaDinamica ?
          <MisureVecchiaDinamica
            form={form}
            updateStanza={updateStanza}
            deleteStanza={deleteStanza}
            addStanza={addStanza}
            addTravi={addTravi}
            addFacciata={addFacciata}
            updateMisureAmbito={updateMisureAmbito} /> :
          <RilevamentoMisure
            rilievi={form.rilievi || []}
            onChange={(v) => update('rilievi', v)} />
          }
        </section>

        {/* ── 3. TOTALI ── */}
        {(totaleInterno > 0 || totaleEsterno > 0) &&
        <>
            <div className="border-t border-border" />
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                Totali
              </h2>
              <TotaliSopraluogo stanze={form.stanze || []} />
            </section>
          </>
        }

        {/* ── 3. INFORMAZIONI CLIENTE E CANTIERE ── */}
        <div className="border-t border-border" />
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
            Informazioni cliente e cantiere
          </h2>
          <p className="text-xs text-muted-foreground">Premi il bottone, parla, e l'AI creerà automaticamente i punti chiave</p>
          <AudioNote value={form.audio_note} onChange={(v) => update('audio_note', v)} />
        </section>

        {/* ── 4. LAVORAZIONI ── */}
        <div className="border-t border-border" />
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</span>
            Lavorazioni da eseguire
          </h2>
          <p className="text-xs text-muted-foreground">Descrivi a voce le lavorazioni dall'inizio alla fine: l'AI creerà un elenco numerato</p>
          <AudioLavorazioni value={form.audio_lavorazioni} onChange={(v) => update('audio_lavorazioni', v)} />
        </section>

        {/* ── 5. FOTO, IMMAGINI E ALLEGATI ── */}
        <div className="border-t border-border" />
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</span>
            Foto, immagini e allegati
            {(form.foto_generali || []).length > 0 &&
            <span className="ml-auto text-xs text-muted-foreground font-normal">{form.foto_generali.length} immagini</span>
            }
          </h2>
          <p className="text-xs text-muted-foreground">
            Scatta, carica o scansiona. Tocca ✏️ su un'immagine per annotarla: testi, evidenziazioni, figure libere e quote vengono salvati dentro l'immagine.
          </p>
          <GalleriaImmagini
            immagini={form.foto_generali || []}
            onChange={(v) => update('foto_generali', v)} />
          <button
            type="button"
            onClick={() => setMostraScansione(true)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-medium text-sm hover:bg-blue-100 transition-colors">
            <Camera className="w-4 h-4" /> Scansiona documento (multi-pagina → PDF)
          </button>
          <AllegatiSopraluogo
            allegati={form.allegati || []}
            onChange={(v) => update('allegati', v)} />
        </section>

        {/* Modale scansione */}
        {mostraScansione &&
        <ScansionePDF
          onComplete={handleScansionePDF}
          onCancel={() => setMostraScansione(false)} />
        }
      </div>
    </form>);
}