import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, X, Printer, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generaPdfRilievo } from '@/lib/pdfRilievo';

const DEFAULT_MARGINI = { top: 16, bottom: 16, left: 20, right: 20 };

export default function PdfSopraluogo({ sopraluogo, compact = false }) {
  const [loading, setLoading] = useState(false);
  const [htmlContent, setHtmlContent] = useState(null);
  const [editableHtml, setEditableHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [margini, setMargini] = useState(DEFAULT_MARGINI);
  const [salvando, setSalvando] = useState(false);
  const [salvato, setSalvato] = useState(false);
  const [percorsoDrive, setPercorsoDrive] = useState('');

  const applicaMargini = (html, m) =>
  html.replace(/padding:\s*[\d.]+px\s+[\d.]+px/, `padding: ${m.top}px ${m.right}px ${m.bottom}px ${m.left}px`);

  const updateMargine = (key, val) => {
    const nuovi = { ...margini, [key]: Number(val) };
    setMargini(nuovi);
    if (htmlContent) setEditableHtml(applicaMargini(htmlContent, nuovi));
  };

  const nomeFile = () => {
    const parti = [sopraluogo.cliente_nome];
    if (sopraluogo.cliente_citta) parti.push(sopraluogo.cliente_citta);
    return parti.join(', ');
  };

  const apriStampa = (html) => {
    const win = window.open('', '_blank');
    win.document.write(html.replace('<title>', `<title>${nomeFile()} — `));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const genera = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('generaPdfSopraluogo', { sopraluogo });
    const html = res.data.html;
    setHtmlContent(html);
    setEditableHtml(applicaMargini(html, margini));
    if (compact) {
      apriStampa(html);
    } else {
      setShowPreview(true);
    }
    setLoading(false);
  };

  const stampa = () => {
    apriStampa(editableHtml);
  };

  const handleSalvaDrive = async () => {
    setSalvando(true);
    try {
      let pdfBase64 = null;
      try { pdfBase64 = await generaPdfRilievo(sopraluogo); } catch { pdfBase64 = null; }
      const res = await base44.functions.invoke('salvaSopraluogoDrive', { sopraluogoId: sopraluogo.id, pdfBase64 });
      const percorso = res.data?.percorso || res.data?.folder || '';
      setPercorsoDrive(percorso);
      setSalvato(true);
      setTimeout(() => { setSalvato(false); setPercorsoDrive(''); }, 5000);
    } catch (e) {
      alert('Errore salvataggio: ' + (e?.response?.data?.error || e.message));
    }
    setSalvando(false);
  };

  if (!showPreview) {
    if (compact) {
      return (
        <Button type="button" variant="ghost" size="icon" onClick={genera} disabled={loading} className="h-8 w-8" title="Genera PDF">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
        </Button>);
    }
    return (
      <Button type="button" variant="outline" onClick={genera} disabled={loading} className="gap-2 w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
        {loading ? 'Generazione PDF...' : 'Genera & Stampa PDF'}
      </Button>);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm flex-1">Anteprima PDF — {sopraluogo.cliente_nome}</span>
        <Button
          type="button"
          variant={salvato ? "default" : "outline"}
          size="sm"
          className={`gap-1.5 mr-2 ${salvato ? 'bg-green-600 hover:bg-green-700' : ''}`}
          onClick={handleSalvaDrive}
          disabled={salvando}
          title={percorsoDrive ? `Percorso: ${percorsoDrive}` : ''}
        >
          <Save className="w-4 h-4" />
          {salvando ? 'Salvando...' : salvato ? (percorsoDrive ? `Salvato in ${percorsoDrive}` : 'Salvato su Drive!') : 'Salva su Drive'}
        </Button>
        <Button type="button" onClick={stampa} className="gap-2">
          <Printer className="w-4 h-4" /> Stampa / Salva PDF
        </Button>
      </div>

      {/* Pannello margini */}
      <div className="bg-slate-50 border-b px-4 py-2 flex items-center gap-4 flex-shrink-0 flex-wrap">
        <span className="text-xs font-semibold text-slate-600">Margini (px):</span>
        {[
        { key: 'top', label: '↑ Alto' },
        { key: 'bottom', label: '↓ Basso' },
        { key: 'left', label: '← Sinistra' },
        { key: 'right', label: '→ Destra' }].
        map(({ key, label }) =>
        <label key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
            {label}
            <input
            type="number"
            min="0" max="100"
            value={margini[key]}
            onChange={(e) => updateMargine(key, e.target.value)}
            className="w-14 h-7 border border-slate-200 rounded px-2 text-xs text-center" />
          </label>
        )}
        <button
          onClick={() => {
            setMargini(DEFAULT_MARGINI);
            if (htmlContent) setEditableHtml(applicaMargini(htmlContent, DEFAULT_MARGINI));
          }}
          className="text-xs text-slate-400 hover:text-slate-700 underline ml-auto">
          Reset
        </button>
      </div>

      {/* Split view: editor + preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* HTML Editor */}
        {/* Preview */}
        <div className="w-1/2 bg-gray-100 overflow-auto">
          <iframe
            key={editableHtml}
            srcDoc={editableHtml}
            className="w-full h-full border-0"
            title="Anteprima PDF" />
        </div>
      </div>
    </div>);
}