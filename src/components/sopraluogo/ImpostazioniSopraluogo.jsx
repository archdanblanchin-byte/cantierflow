import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Plus, Trash2, GripVertical, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const CHIAVE_PUNTI_ANALISI = 'punti_analisi_sopraluogo';
const CHIAVE_PUNTI_LAVORI = 'punti_lavori_sopraluogo';

const DEFAULT_PUNTI_ANALISI = [
  { emoji: '👤', label: 'Cliente', hint: 'tipo cliente, aspettative, gusti/colori, budget percepito' },
  { emoji: '🏗️', label: 'Cantiere', hint: 'accesso, parcheggio, ascensore, presenza mobili/persone' },
  { emoji: '🦺', label: 'Sicurezza', hint: 'scala, trabattello, ponteggio, piattaforma aerea' },
  { emoji: '🧱', label: 'Superfici', hint: 'muffa, umidità, crepe, distacchi, infiltrazioni' },
  { emoji: '🔧', label: 'Lavori', hint: 'rasature, carteggiatura, fondo, pittura, smalti' },
  { emoji: '🪣', label: 'Prodotti', hint: 'tipo pittura, ciclo corretto, colori e finiture' },
  { emoji: '📅', label: 'Organizzazione', hint: 'MQ, operatori, tempistiche, tempi asciugatura' },
  { emoji: '🤝', label: 'Accordi', hint: 'incluso/escluso, pagamento, date concordate' },
];

const DEFAULT_PUNTI_LAVORI = [
  { emoji: '🔨', label: 'Protezioni', hint: 'proteggere pavimenti, mobili, infissi' },
  { emoji: '🪚', label: 'Preparazione', hint: 'rasature, stuccature, carteggiatura' },
  { emoji: '🎨', label: 'Fondo', hint: 'fissativo, primer, antimuffa' },
  { emoji: '🖌️', label: 'Pittura', hint: 'tipo pittura, numero mani, finiture' },
  { emoji: '🚪', label: 'Smalti', hint: 'porte, finestre, radiatori' },
  { emoji: '🧹', label: 'Pulizia finale', hint: 'rimozione protezioni, pulizia locali' },
];

function PuntiEditor({ titolo, descrizione, punti, onChange, defaultPunti }) {
  const updatePunto = (i, field, val) => {
    onChange(punti.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const addPunto = () => onChange([...punti, { emoji: '📌', label: 'Nuovo punto', hint: '' }]);
  const removePunto = (i) => onChange(punti.filter((_, idx) => idx !== i));
  const ripristina = () => onChange(defaultPunti);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground">{titolo}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{descrizione}</p>
      </div>

      <div className="space-y-2">
        {punti.map((p, i) => (
          <div key={i} className="flex items-start gap-2 p-3 bg-card border border-border rounded-xl">
            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
            <div className="w-12 flex-shrink-0">
              <Input
                value={p.emoji}
                onChange={(e) => updatePunto(i, 'emoji', e.target.value)}
                className="text-center text-base h-8 px-1"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Input
                value={p.label}
                onChange={(e) => updatePunto(i, 'label', e.target.value)}
                className="h-8 font-semibold text-sm"
                placeholder="Nome punto"
              />
              <Input
                value={p.hint}
                onChange={(e) => updatePunto(i, 'hint', e.target.value)}
                className="h-8 text-xs"
                placeholder="Descrizione breve"
              />
            </div>
            <button
              type="button"
              onClick={() => removePunto(i)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors mt-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={addPunto} className="flex-1 gap-2 border-dashed text-sm">
          <Plus className="w-4 h-4" /> Aggiungi punto
        </Button>
        <Button type="button" variant="ghost" onClick={ripristina} className="text-xs text-muted-foreground">
          Ripristina
        </Button>
      </div>
    </section>
  );
}

export default function ImpostazioniSopraluogo({ onBack }) {
  const [puntiAnalisi, setPuntiAnalisi] = useState(DEFAULT_PUNTI_ANALISI);
  const [puntiLavori, setPuntiLavori] = useState(DEFAULT_PUNTI_LAVORI);
  const [ids, setIds] = useState({ analisi: null, lavori: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [rAnalisi, rLavori] = await Promise.all([
        base44.entities.ImpostazioneApp.filter({ chiave: CHIAVE_PUNTI_ANALISI }),
        base44.entities.ImpostazioneApp.filter({ chiave: CHIAVE_PUNTI_LAVORI }),
      ]);
      if (rAnalisi.length > 0) {
        setIds(prev => ({ ...prev, analisi: rAnalisi[0].id }));
        try { setPuntiAnalisi(JSON.parse(rAnalisi[0].valore)); } catch {}
      }
      if (rLavori.length > 0) {
        setIds(prev => ({ ...prev, lavori: rLavori[0].id }));
        try { setPuntiLavori(JSON.parse(rLavori[0].valore)); } catch {}
      }
      setLoading(false);
    })();
  }, []);

  const salva = async () => {
    setSaving(true);
    await Promise.all([
      ids.analisi
        ? base44.entities.ImpostazioneApp.update(ids.analisi, { valore: JSON.stringify(puntiAnalisi) })
        : base44.entities.ImpostazioneApp.create({ chiave: CHIAVE_PUNTI_ANALISI, valore: JSON.stringify(puntiAnalisi) })
          .then(c => setIds(prev => ({ ...prev, analisi: c.id }))),
      ids.lavori
        ? base44.entities.ImpostazioneApp.update(ids.lavori, { valore: JSON.stringify(puntiLavori) })
        : base44.entities.ImpostazioneApp.create({ chiave: CHIAVE_PUNTI_LAVORI, valore: JSON.stringify(puntiLavori) })
          .then(c => setIds(prev => ({ ...prev, lavori: c.id }))),
    ]);
    setSaving(false);
    toast.success('Impostazioni salvate');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-16">
      {/* Navbar */}
      <div className="bg-background px-4 fixed top-10 left-0 right-0 z-20 border-b border-border flex items-center gap-3 shadow-sm my-4 py-1">
        <Button type="button" size="sm" variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="flex-1 text-sm font-semibold">Impostazioni Sopraluogo</span>
        <Button onClick={salva} disabled={saving} size="sm" className="h-8 gap-1.5">
          <Save className="w-4 h-4" />
          {saving ? 'Salvo…' : 'Salva'}
        </Button>
      </div>

      <div className="mt-20 space-y-8">
        <PuntiEditor
          titolo="Punti guida — Nota vocale"
          descrizione="Mostrati durante la registrazione audio e usati dall'AI per strutturare l'analisi."
          punti={puntiAnalisi}
          onChange={setPuntiAnalisi}
          defaultPunti={DEFAULT_PUNTI_ANALISI}
        />
        <div className="border-t border-border" />
        <PuntiEditor
          titolo="Punti guida — Lavorazioni"
          descrizione="Mostrati durante la registrazione delle lavorazioni da eseguire."
          punti={puntiLavori}
          onChange={setPuntiLavori}
          defaultPunti={DEFAULT_PUNTI_LAVORI}
        />
      </div>
    </div>
  );
}