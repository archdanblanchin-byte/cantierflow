import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { calcolaStanza, calcolaTotali, facciataMqTotale } from '../../shared/calcoliSopraluogo.ts';

const VOCI_LABELS = {
  muffa: { label: 'Muffa', unita: '%' },
  intonaco_deumidificante: { label: 'Intonaco Deumidificante', unita: 'mq' },
  scrostare: { label: 'Scrostare', unita: 'mq' },
  stuccare: { label: 'Stuccare', unita: 'mq' },
  rasare: { label: 'Rasare', unita: 'mq' },
  altro: { label: 'Altro', unita: 'mq' },
};

const TIPI_APERTURA_LABELS = { porta: 'Porta', arco: 'Arco', armadio: 'Armadio', mobile: 'Mobile', parete_particolare: 'Parete partic.', altro: 'Altro' };

const TIPI_SOTTRAI_F = { porta_1_lato: 'Porzione 1 lato', porta_2_lati: 'Porzione 2 lati', parete: 'Parete', finestra: 'Finestra', porta: 'Porta', altro: 'Altro' };

function uint8ToBinaryString(bytes) {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
  }
  return bin;
}

async function fetchImageDataUrl(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
    return `data:image/${isPng ? 'png' : 'jpeg'};base64,${btoa(uint8ToBinaryString(buf))}`;
  } catch { return null; }
}

const fmt1 = (n) => (n || 0).toFixed(2).replace('.', ',');
const fmtT = (n) => (n || 0).toFixed(1).replace('.', ',');

async function generaPdf(sopraluogo) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, margin = 15, contentW = pageW - margin * 2;
  let y = margin;

  const ensure = (need) => { if (y + need > 285) { doc.addPage(); y = margin; } };
  const stripEmoji = (t) => String(t || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();

  const h2 = (text, color) => {
    ensure(10);
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.setTextColor(...(color || [30, 64, 175]));
    doc.text(stripEmoji(text), margin, y);
    doc.setDrawColor(221, 227, 237); doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 6;
  };

  const noteBox = (label, text) => {
    if (!text) return;
    h2(label);
    doc.setFontSize(9); doc.setTextColor(50, 50, 50); doc.setFont(undefined, 'normal');
    const lines = doc.splitTextToSize(String(text), contentW);
    lines.forEach(l => { ensure(5); doc.text(l, margin, y); y += 4.5; });
    y += 2;
  };

  const kv = (label, val) => {
    if (!val) return;
    ensure(5);
    doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'normal');
    doc.text(label + ':', margin, y);
    doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
    doc.text(String(val), margin + 45, y);
    y += 5;
  };

  const row = (label, val, color) => {
    ensure(5);
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(...(color || [71, 85, 105]));
    doc.text(label, margin + 2, y);
    doc.setFont(undefined, 'bold');
    doc.text(val, pageW - margin, y, { align: 'right' });
    y += 4.5;
  };

  async function addPhotoGrid(urls, cols) {
    if (!urls || !urls.length) return;
    const gap = 2;
    const cellW = (contentW - gap * (cols - 1)) / cols;
    const imgH = cellW * 0.75;
    for (let i = 0; i < urls.length; i++) {
      const col = i % cols;
      if (col === 0) ensure(imgH + 2);
      const x = margin + col * (cellW + gap);
      const du = await fetchImageDataUrl(urls[i]);
      if (du) {
        try { doc.addImage(du, du.includes('image/png') ? 'PNG' : 'JPEG', x, y, cellW, imgH); } catch {}
      } else {
        doc.setDrawColor(200, 200, 200); doc.setFillColor(245, 245, 245);
        doc.rect(x, y, cellW, imgH, 'FD');
      }
      if (col === cols - 1) y += imgH + gap;
    }
    if (urls.length % cols !== 0) y += imgH + gap;
    y += 2;
  }

  // Header
  doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
  doc.text('Sopraluogo — ' + (sopraluogo.cliente_nome || 'Cliente'), margin, y); y += 6;
  doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'normal');
  const loc = [sopraluogo.cliente_indirizzo, sopraluogo.cliente_citta].filter(Boolean).join(' — ');
  if (loc) { doc.text(loc, margin, y); y += 4; }
  doc.text((sopraluogo.data_sopraluogo || '—') + '   •   ' + (sopraluogo.stato || 'bozza').toUpperCase(), margin, y); y += 3;
  doc.setDrawColor(30, 64, 175); doc.setLineWidth(0.5); doc.line(margin, y, pageW - margin, y); doc.setLineWidth(0.2); y += 5;

  h2('Dati Cliente e Cantiere');
  kv('Nome', sopraluogo.cliente_nome);
  kv('Nome cantiere', sopraluogo.nome_cantiere);
  kv('Indirizzo', sopraluogo.cliente_indirizzo);
  kv('Città', sopraluogo.cliente_citta);
  kv('Telefono', sopraluogo.cliente_telefono);
  kv('Email', sopraluogo.cliente_mail);
  kv('Data sopraluogo', sopraluogo.data_sopraluogo);
  kv('Tecnico', sopraluogo._tecnico);
  y += 2;

  if (sopraluogo.ca_attivo) {
    h2('Alla c.a. di');
    kv('Nome e cognome', [sopraluogo.ca_nome, sopraluogo.ca_cognome].filter(Boolean).join(' '));
    kv('Indirizzo', sopraluogo.ca_indirizzo);
    kv('Città', sopraluogo.ca_citta);
    kv('Telefono', sopraluogo.ca_telefono);
    kv('Email', sopraluogo.ca_email);
    y += 2;
  }

  noteBox('Prodotti Richiesti', sopraluogo.prodotti_particolari);
  noteBox('Note Generali', sopraluogo.note_generali);
  noteBox('Dettagli', sopraluogo.note_dettaglio);
  if (sopraluogo.audio_note) noteBox('Analisi Sopraluogo (AI)', sopraluogo.audio_note.replace(/📋 TRASCRIZIONE\n[\s\S]*?\n\n/, ''));
  if (sopraluogo.audio_lavorazioni) noteBox('Lavorazioni da Eseguire (AI)', sopraluogo.audio_lavorazioni.replace(/📋 TRASCRIZIONE\n[\s\S]*?\n\n/, ''));

  const tutte = sopraluogo.stanze || [];
  const stanzeNormali = tutte.filter(s => s.tipo !== 'facciata' && s.tipo !== 'travi_esterne');
  const traviEsterne = tutte.filter(s => s.tipo === 'travi_esterne');
  const facciate = tutte.filter(s => s.tipo === 'facciata');
  const stanzePerTotali = tutte.filter(s => s.tipo !== 'facciata');
  const totaliGlobali = stanzePerTotali.length ? calcolaTotali(stanzePerTotali) : null;
  const totaleFacciate = facciate.reduce((a, f) => a + facciataMqTotale(f), 0);

  // Lavorazioni extra delle facciate (raggruppate per descrizione, come nella stampa)
  const totaliFacciateExtra = {};
  facciate.forEach(f => {
    (f.voci_extra || []).forEach(v => {
      const desc = v.tipo === 'altro' ? (v.descrizione || '') : '';
      const key = desc ? `altro::${desc}` : v.tipo;
      if (!totaliFacciateExtra[key]) totaliFacciateExtra[key] = { valore: 0, unita: v.unita || 'mq', descrizione: desc };
      totaliFacciateExtra[key].valore += parseFloat(v.valore) || 0;
    });
  });

  const renderStanzaItem = async (s, i) => {
    const c = calcolaStanza(s);
    const nome = s.nome_custom || s.tipo || ('Stanza ' + (i + 1));
    ensure(14);
    doc.setFillColor(248, 250, 252); doc.rect(margin, y - 3, contentW, 6, 'F');
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
    doc.text(nome, margin + 2, y + 1);
    doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    const dims = s.lunghezza && s.larghezza && s.altezza ? `${s.lunghezza}×${s.larghezza}×${s.altezza}m` : '';
    if (dims) doc.text(dims + (s.soffitto ? ' · soffitto' : '') + (s.travi ? ' · travi' : ''), pageW - margin, y + 1, { align: 'right' });
    y += 5;
    if (c.mq_aperture > 0) row('− Aperture', '−' + fmt1(c.mq_aperture) + ' mq', [220, 38, 38]);
    if (c.mq_pareti > 0) row('Pareti nette', fmt1(c.mq_pareti) + ' mq', [15, 23, 42]);
    if (c.mq_soffitto > 0) row('Soffitto', fmt1(c.mq_soffitto) + ' mq');
    if (c.mq_travi > 0) row('Travi', fmt1(c.mq_travi) + ' mq', [146, 64, 14]);
    if (c.mq_sigillatura_travi > 0) row('Sigillatura travi', fmt1(c.mq_sigillatura_travi) + ' ml', [146, 64, 14]);
    if (c.mq_travi_esterne > 0) row('Travi esterne', '+' + fmt1(c.mq_travi_esterne) + ' mq', [180, 83, 9]);
    if (c.mq_pareti_extra > 0) row('Pareti extra', '+' + fmt1(c.mq_pareti_extra) + ' mq', [29, 78, 216]);
    ensure(5);
    doc.setDrawColor(199, 215, 240); doc.line(margin, y, pageW - margin, y); y += 1;
    row('TOTALE STANZA', fmt1(c.totale_mq) + ' mq', [30, 64, 175]);
    y += 2;
    (s.aperture || []).forEach(ap => {
      ensure(4);
      const mq = (parseFloat(ap.lunghezza) || 0) * (parseFloat(ap.altezza) || 0) * (ap.tipo === 'arco' ? 2 : 1);
      doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text(`${TIPI_APERTURA_LABELS[ap.tipo] || ap.tipo}${ap.descrizione ? ' (' + ap.descrizione + ')' : ''}: ${ap.lunghezza || 0}×${ap.altezza || 0}m = ${fmt1(mq)} mq`, margin + 4, y);
      y += 3.5;
    });
    (s.voci_extra || []).forEach(v => {
      ensure(4);
      doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text(`${VOCI_LABELS[v.tipo]?.label || v.tipo}: ${parseFloat(v.valore) || 0} ${v.unita || 'mq'}`, margin + 4, y);
      y += 3.5;
    });
    await addPhotoGrid(s.foto, 3);
    y += 3;
  };

  const renderTraviItem = async (s, i) => {
    const c = calcolaStanza(s);
    const nome = s.nome_custom || ('Travi ' + (i + 1));
    ensure(8);
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(146, 64, 14);
    doc.text(nome, margin + 2, y); y += 4;
    (s.travi_esterne || []).forEach(t => {
      ensure(4);
      const tl = parseFloat(t.lunghezza_m) || 0, tla = parseFloat(t.larghezza_m) || 0, tsv = parseFloat(t.sviluppo) || 1;
      const mq = t.modalita === 'lxa_sviluppo' ? tl * tla * tsv : t.modalita === 'lxl' ? tl * tla : parseFloat(t.mq) || 0;
      doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text((t.descrizione || '') + ` (${fmt1(mq)} mq)`, margin + 4, y);
      y += 3.5;
    });
    row('TOTALE TRAVI', fmt1(c.totale_mq) + ' mq', [180, 83, 9]);
    y += 2;
    await addPhotoGrid(s.foto, 3);
  };

  const renderFacciataItem = async (f, i) => {
    const mqTot = facciataMqTotale(f);
    const nome = f.nome_custom || (f.orientamento ? `Facciata ${f.orientamento}` : `Facciata ${i + 1}`);
    ensure(10);
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(20, 83, 45);
    doc.text(nome + (mqTot > 0 ? ` — ${fmt1(mqTot)} mq` : ''), margin + 2, y); y += 4.5;
    (f.misure || []).forEach((m, mi) => {
      ensure(3.5);
      const basi = (m.basi || []).map(b => parseFloat(b) || 0);
      const totB = basi.reduce((a, b) => a + b, 0);
      doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text(`Campata ${mi + 1}: base ${fmt1(totB)} m × alt ${parseFloat(m.altezza) || 0} m = ${fmt1(parseFloat(m.mq) || 0)} mq`, margin + 4, y);
      y += 3.5;
    });
    const mqSottrai = (f.sottrazioni || []).reduce((a, s) => a + (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * (s.tipo === 'porta_2_lati' ? 2 : 1), 0);
    const mqAgg = (f.porzioni || []).reduce((a, p) => a + (p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0), 0);
    if (mqSottrai > 0) row('− Sottrazioni', '−' + fmt1(mqSottrai) + ' mq', [220, 38, 38]);
    if (mqAgg > 0) row('+ Porzioni', '+' + fmt1(mqAgg) + ' mq', [29, 78, 216]);
    (f.sottrazioni || []).forEach(s => {
      ensure(3.5);
      const mq = (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * (s.tipo === 'porta_2_lati' ? 2 : 1);
      doc.setFontSize(7.5); doc.setTextColor(150, 150, 150);
      doc.text(`${TIPI_SOTTRAI_F[s.tipo] || s.tipo}: ${s.lunghezza || 0}×${s.altezza || 0}m = −${fmt1(mq)} mq`, margin + 4, y);
      y += 3;
    });
    (f.voci_extra || []).forEach(v => {
      ensure(3.5);
      doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text(`${VOCI_LABELS[v.tipo]?.label || v.tipo}: ${parseFloat(v.valore) || 0} ${v.unita || 'mq'}`, margin + 4, y);
      y += 3.5;
    });
    row('TOTALE DA TINTEGGIARE', fmt1(mqTot) + ' mq', [21, 128, 61]);
    y += 2;
    await addPhotoGrid(f.foto, 3);
  };

  // ── RILEVAMENTO MISURE (lavorazioni) ──
  const rilievi = sopraluogo.rilievi || [];
  if (rilievi.length) {
    const numV = (v) => parseFloat(v) || 0;
    const misureDi = (p) => (Array.isArray(p.misure) && p.misure.length ? p.misure : [p]);
    const voceMq = (v) => (v.modalita === 'bxa' ? numV(v.base) * numV(v.altezza) : numV(v.quantita));
    const dettStanza = (m) => {
      const l = numV(m.lunghezza), w = numV(m.larghezza), h = numV(m.altezza);
      const pareti = (l + w) * 2 * h;
      const soffitto = m.soffitto !== false ? l * w : 0;
      const sot = (m.sottrazioni || []).reduce((a, v) => a + voceMq(v), 0);
      const agg = (m.aggiunte || []).reduce((a, v) => a + voceMq(v), 0);
      return { pareti, soffitto, sottrazioni: sot, aggiunte: agg, totale: Math.max(0, pareti + soffitto - sot + agg) };
    };
    const mqMis = (m, mod) => {
      if (mod === 'bxa') return numV(m.base) * numV(m.altezza);
      if (mod === 'stanza') return dettStanza(m).totale;
      if (mod === 'lxa_sviluppo') return numV(m.lunghezza) * numV(m.larghezza) * (numV(m.sviluppo) || 1.65);
      if (mod === 'mq_sviluppo') return numV(m.mq) * (numV(m.sviluppo) || 1.65);
      return numV(m.quantita);
    };
    const dettMis = (m, mod) => {
      if (mod === 'bxa') return `base ${fmt1(numV(m.base))} m × alt ${fmt1(numV(m.altezza))} m`;
      if (mod === 'lxa_sviluppo') return `${fmt1(numV(m.lunghezza))} × ${fmt1(numV(m.larghezza))} m × sviluppo ${fmt1(numV(m.sviluppo) || 1.65)}`;
      if (mod === 'mq_sviluppo') return `${fmt1(numV(m.mq))} m² × sviluppo ${fmt1(numV(m.sviluppo) || 1.65)}`;
      if (mod === 'semplice') return `quantità ${fmt1(numV(m.quantita))}`;
      const d = dettStanza(m);
      const parti = [];
      if (m.lunghezza || m.larghezza || m.altezza) parti.push(`${fmt1(numV(m.lunghezza))} × ${fmt1(numV(m.larghezza))} m, h ${fmt1(numV(m.altezza))} m`);
      parti.push(`pareti ${fmt1(d.pareti)} m²`);
      if (d.soffitto > 0) parti.push(`soffitto ${fmt1(d.soffitto)} m²`);
      if (d.sottrazioni > 0) parti.push(`− ${fmt1(d.sottrazioni)} m²`);
      if (d.aggiunte > 0) parti.push(`+ ${fmt1(d.aggiunte)} m²`);
      return parti.join(' · ');
    };

    h2(`🔨 Rilevamento misure (${rilievi.length})`, [30, 64, 175]);
    for (const lav of rilievi) {
      const porzioni = lav.porzioni || [];
      const totali = {};
      porzioni.forEach((p) => {
        const u = p.modalita === 'semplice' ? (p.unita || 'm²') : 'm²';
        totali[u] = (totali[u] || 0) + misureDi(p).reduce((a, m) => a + mqMis(m, p.modalita), 0);
      });
      const totTxt = Object.entries(totali).map(([u, v]) => `${fmt1(v)} ${u}`).join(' · ');
      ensure(12);
      doc.setFillColor(248, 250, 252); doc.rect(margin, y - 3, contentW, 6, 'F');
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 41, 59);
      doc.text(stripEmoji(String(lav.nome || 'Lavorazione').toUpperCase()), margin + 2, y + 1);
      if (totTxt) { doc.setFontSize(9); doc.setTextColor(30, 64, 175); doc.text(totTxt, pageW - margin, y + 1, { align: 'right' }); }
      y += 6;
      for (const p of porzioni) {
        const misure = misureDi(p);
        const u = p.modalita === 'semplice' ? (p.unita || 'm²') : 'm²';
        const nomeP = (p.descrizione || p.stanza || '').trim() || 'Porzione';
        const totP = misure.reduce((a, m) => a + mqMis(m, p.modalita), 0);
        ensure(6);
        doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(51, 65, 85);
        doc.text(nomeP, margin + 4, y);
        doc.setFont(undefined, 'normal');
        doc.text(`${fmt1(totP)} ${u}`, pageW - margin, y, { align: 'right' });
        y += 4;
        misure.forEach((m, mi) => {
          ensure(4);
          doc.setFontSize(8); doc.setTextColor(120, 120, 120);
          const pre = misure.length > 1 ? `Misura ${mi + 1}: ` : '';
          doc.text(pre + dettMis(m, p.modalita) + ` = ${fmt1(mqMis(m, p.modalita))} ${u}`, margin + 8, y);
          y += 3.5;
        });
      }
      if (lav.note) {
        doc.setFontSize(8); doc.setTextColor(60, 70, 85);
        const lines = doc.splitTextToSize(String(lav.note), contentW - 8);
        lines.forEach((l) => { ensure(4); doc.text(l, margin + 4, y); y += 3.5; });
      }
      await addPhotoGrid(lav.foto, 3);
      (lav.file || []).forEach((f) => {
        ensure(4);
        doc.setFontSize(7.5); doc.setTextColor(140, 140, 140);
        doc.text(`Allegato: ${f.nome || ''}`, margin + 4, y); y += 3;
      });
      y += 3;
    }
  }

  // ── STANZE ──
  if (stanzeNormali.length) {
    h2(`🏠 Stanze (${stanzeNormali.length})`, [37, 99, 235]);
    for (let i = 0; i < stanzeNormali.length; i++) await renderStanzaItem(stanzeNormali[i], i);
  }

  // ── TRAVI ──
  if (traviEsterne.length) {
    h2(`🪵 Travi (${traviEsterne.length})`, [146, 64, 14]);
    for (let i = 0; i < traviEsterne.length; i++) await renderTraviItem(traviEsterne[i], i);
  }

  // ── FACCIATE ──
  if (facciate.length) {
    h2(`🏠 Facciate (${facciate.length})${totaleFacciate > 0 ? ` — ${fmt1(totaleFacciate)} mq tot.` : ''}`, [22, 163, 74]);
    for (let i = 0; i < facciate.length; i++) await renderFacciataItem(facciate[i], i);
  }

  if ((sopraluogo.misure_extra || []).length) {
    h2('📐 Misure di riferimento (non sommate)', [180, 83, 9]);
    (sopraluogo.misure_extra || []).forEach(me => {
      ensure(5);
      doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(71, 85, 105);
      doc.text(String(me.descrizione || '—'), margin + 2, y);
      doc.setFont(undefined, 'bold'); doc.setTextColor(180, 83, 9);
      doc.text(`${parseFloat(me.valore) || 0} ${me.unita || ''}`, pageW - margin, y, { align: 'right' });
      y += 4.5;
    });
    y += 2;
  }

  if ((sopraluogo.foto_generali || []).length) {
    h2('Foto Generali');
    await addPhotoGrid(sopraluogo.foto_generali, 3);
    y += 2;
  }

  if ((sopraluogo.foto_esterno || []).length) {
    h2('Foto & Quote (Esterno)');
    const urls = (sopraluogo.foto_esterno || []).map(f => f.url_annotata || f.url || f);
    await addPhotoGrid(urls, 2);
    y += 2;
  }

  const mostraRiepilogo = !!totaliGlobali && (
    totaliGlobali.mq_pareti > 0 || totaliGlobali.mq_soffitto > 0 || totaliGlobali.mq_pareti_extra > 0 ||
    totaliGlobali.mq_travi > 0 || totaliGlobali.mq_travi_esterne > 0 || totaliGlobali.mq_sigillatura_travi > 0
  ) || totaleFacciate > 0;

  if (mostraRiepilogo) {
    h2('📊 Riepilogo Totali');

    // ── Pareti & Soffitti ──
    if (totaliGlobali && (totaliGlobali.mq_pareti > 0 || totaliGlobali.mq_soffitto > 0 || totaliGlobali.mq_pareti_extra > 0)) {
      ensure(14);
      const topP = y - 4;
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 64, 175);
      doc.text('Pareti & Soffitti', margin + 3, y + 1); y += 7;
      if (totaliGlobali.mq_pareti > 0) row('Pareti nette', fmtT(totaliGlobali.mq_pareti) + ' mq', [15, 23, 42]);
      if (totaliGlobali.mq_soffitto > 0) row('Soffitti', fmtT(totaliGlobali.mq_soffitto) + ' mq', [15, 23, 42]);
      if (totaliGlobali.mq_pareti_extra > 0) row('+ Pareti extra', '+' + fmtT(totaliGlobali.mq_pareti_extra) + ' mq', [29, 78, 216]);
      row('SUBTOTALE PARETI & SOFFITTI', fmtT(totaliGlobali.mq_pareti + totaliGlobali.mq_soffitto + totaliGlobali.mq_pareti_extra) + ' mq', [30, 64, 175]);
      const extraKeys = Object.keys(totaliGlobali.extra || {});
      if (extraKeys.length) {
        ensure(6);
        doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(148, 163, 184);
        doc.text('LAVORAZIONI EXTRA STANZE', margin + 3, y); y += 4;
        extraKeys.forEach((k) => {
          const d = totaliGlobali.extra[k];
          const info = VOCI_LABELS[k] || { label: k, unita: d.unita };
          row(d.descrizione || info.label, fmtT(d.valore) + ' ' + (info.unita || ''), [71, 85, 105]);
        });
      }
      doc.setDrawColor(30, 64, 175); doc.roundedRect(margin, topP, contentW, y - topP, 1.5, 1.5);
      y += 5;
    }

    // ── Travi ──
    if (totaliGlobali && (totaliGlobali.mq_travi > 0 || totaliGlobali.mq_travi_esterne > 0 || totaliGlobali.mq_sigillatura_travi > 0)) {
      ensure(14);
      const topT = y - 4;
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(146, 64, 14);
      doc.text('Travi', margin + 3, y + 1); y += 7;
      if (totaliGlobali.mq_travi > 0) row('Travi interne', fmtT(totaliGlobali.mq_travi) + ' mq', [146, 64, 14]);
      if (totaliGlobali.mq_travi_esterne > 0) row('Travi esterne', fmtT(totaliGlobali.mq_travi_esterne) + ' mq', [180, 83, 9]);
      if (totaliGlobali.mq_sigillatura_travi > 0) row('Sigillatura travi', fmtT(totaliGlobali.mq_sigillatura_travi) + ' ml', [217, 119, 6]);
      row('SUBTOTALE TRAVI', fmtT((totaliGlobali.mq_travi || 0) + (totaliGlobali.mq_travi_esterne || 0)) + ' mq', [180, 83, 9]);
      doc.setDrawColor(253, 230, 138); doc.roundedRect(margin, topT, contentW, y - topT, 1.5, 1.5);
      y += 5;
    }

    // ── Facciate ──
    if (totaleFacciate > 0) {
      ensure(12);
      const topF = y - 4;
      doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(20, 83, 45);
      doc.text('Facciate', margin + 3, y + 1); y += 7;
      row('TOTALE FACCIATE', fmtT(totaleFacciate) + ' mq', [21, 128, 61]);
      const extraFacKeys = Object.keys(totaliFacciateExtra);
      if (extraFacKeys.length) {
        ensure(6);
        doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(134, 163, 140);
        doc.text('LAVORAZIONI EXTRA FACCIATE', margin + 3, y); y += 4;
        extraFacKeys.forEach((k) => {
          const d = totaliFacciateExtra[k];
          const info = VOCI_LABELS[k] || { label: k, unita: d.unita };
          row(d.descrizione || info.label, fmtT(d.valore) + ' ' + (info.unita || ''), [71, 85, 105]);
        });
      }
      doc.setDrawColor(187, 247, 208); doc.roundedRect(margin, topF, contentW, y - topF, 1.5, 1.5);
      y += 5;
    }

    // ── Totale generale ──
    const totGen = (totaliGlobali?.totale_mq || 0) + totaleFacciate;
    if (totGen > 0) {
      ensure(12);
      doc.setFillColor(30, 64, 175); doc.rect(margin, y - 3, contentW, 9, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(11); doc.setFont(undefined, 'bold');
      doc.text('TOTALE GENERALE DA TINTEGGIARE', margin + 3, y + 2);
      doc.setFontSize(13);
      doc.text(fmtT(totGen) + ' mq', pageW - margin - 3, y + 2, { align: 'right' });
      y += 10;
    }
  }

  return doc.output('arraybuffer');
}

// Verifica che un file/cartella Drive esista ancora (non cestitato)
async function fileExists(accessToken, fileId) {
  if (!fileId) return null;
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,trashed&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.trashed ? null : data.id;
  } catch { return null; }
}

// Cerca una cartella per nome dentro un genitore (supporta shared drives); se non esiste la crea
async function findOrCreateFolder(accessToken, name, parentId, driveId) {
  const sharedDriveParams = driveId
    ? `&corpora=drive&driveId=${encodeURIComponent(driveId)}&includeItemsFromAllDrives=true&supportsAllDrives=true`
    : '&supportsAllDrives=true';
  let query = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}${sharedDriveParams}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) }
  );
  const { files } = await searchRes.json();
  if (files && files.length > 0) return files[0].id;

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined }),
    signal: AbortSignal.timeout(15000)
  });
  const folder = await createRes.json();
  return folder.id;
}

// Elenca tutte le sottocartelle (folder) di un genitore dentro un shared drive
async function listChildFolders(accessToken, parentId, driveId) {
  const query = `mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`;
  const driveParams = driveId
    ? `&corpora=drive&driveId=${encodeURIComponent(driveId)}&includeItemsFromAllDrives=true&supportsAllDrives=true`
    : '&supportsAllDrives=true';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}${driveParams}&fields=files(id,name)&pageSize=1000`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
  const { files } = await res.json();
  return files || [];
}

// Elenca tutti i file (non cartelle) dentro un genitore
async function listFilesInFolder(accessToken, folderId, driveId) {
  const sharedDriveParams = driveId
    ? `&corpora=drive&driveId=${encodeURIComponent(driveId)}&includeItemsFromAllDrives=true&supportsAllDrives=true`
    : '&supportsAllDrives=true';
  const query = `trashed=false and '${folderId}' in parents`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}${sharedDriveParams}&fields=files(id,name)&pageSize=1000`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const { files } = await res.json();
  return files || [];
}

// Trova il drive condiviso "Clienti" (shared drive). Se non esiste, cerca una cartella "Clienti" nel My Drive.
async function findClientiDrive(accessToken) {
  // 1) Cerca tra i shared drives
  let pageToken = null;
  do {
    const url = `https://www.googleapis.com/drive/v3/drives?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}&fields=nextPageToken,drives(id,name)`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) break;
    const data = await res.json();
    const found = (data.drives || []).find(d => d.name.toLowerCase() === 'clienti');
    if (found) return { id: found.id, isSharedDrive: true };
    pageToken = data.nextPageToken;
  } while (pageToken);

  // 2) Fallback: cartella "Clienti" nel My Drive (radice)
  const query = `name='Clienti' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(15000) }
  );
  const { files } = await res.json();
  if (files && files.length > 0) return { id: files[0].id, isSharedDrive: false };

  // 3) Crea la cartella "Clienti" in radice My Drive
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Clienti', mimeType: 'application/vnd.google-apps.folder' }),
    signal: AbortSignal.timeout(15000)
  });
  const folder = await createRes.json();
  return { id: folder.id, isSharedDrive: false };
}

async function getImpostazione(base44, chiave) {
  const recs = await base44.asServiceRole.entities.ImpostazioneApp.filter({ chiave });
  return recs.length > 0 ? recs[0] : null;
}

async function setImpostazione(base44, chiave, valore) {
  const existing = await getImpostazione(base44, chiave);
  if (existing) {
    return base44.asServiceRole.entities.ImpostazioneApp.update(existing.id, { valore });
  }
  return base44.asServiceRole.entities.ImpostazioneApp.create({ chiave, valore });
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const sopraluogoId = payload.sopraluogoId;
    if (!sopraluogoId) return Response.json({ error: 'sopraluogoId required' }, { status: 400 });

    // Il record viene letto con i permessi dell'utente: chi non può vedere il sopralluogo non può salvarlo su Drive
    const sopraluoghi = await base44.entities.Sopraluogo.filter({ id: sopraluogoId });
    if (!sopraluoghi.length) return Response.json({ error: 'Sopraluogo non trovato' }, { status: 404 });
    const sopraluogo = sopraluoghi[0];

    const nome = (sopraluogo.cliente_nome || '').trim();
    const citta = (sopraluogo.cliente_citta || '').trim();
    if (!nome || !citta) {
      return Response.json({ error: 'Nome cliente e città sono obbligatori per creare la cartella su Drive' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // 1) Drive condiviso / cartella "Clienti" (riusa ID salvato)
    const clientiInfoRaw = (await getImpostazione(base44, 'drive_clienti_info'))?.valore;
    let clientiInfo = clientiInfoRaw ? JSON.parse(clientiInfoRaw) : null;
    if (!clientiInfo || !(clientiInfo.id && await fileExists(accessToken, clientiInfo.id))) {
      clientiInfo = await findClientiDrive(accessToken);
      await setImpostazione(base44, 'drive_clienti_info', JSON.stringify(clientiInfo));
    }
    const clientiId = clientiInfo.id;
    const isSharedDrive = clientiInfo.isSharedDrive;

    // 2) Cartella "RILIEVI" dentro Clienti
    let rilieviRootId = (await getImpostazione(base44, 'drive_rilievi_root_folder_id'))?.valore;
    if (!(rilieviRootId && await fileExists(accessToken, rilieviRootId))) {
      rilieviRootId = await findOrCreateFolder(accessToken, 'RILIEVI', clientiId, isSharedDrive ? clientiId : null);
      await setImpostazione(base44, 'drive_rilievi_root_folder_id', rilieviRootId);
    }

    // 3) Sottocartella anno (es. 2026)
    const anno = sopraluogo.data_sopraluogo ? new Date(sopraluogo.data_sopraluogo).getFullYear().toString() : new Date().getFullYear().toString();
    let annoId = (await getImpostazione(base44, `drive_rilievi_${anno}_folder_id`))?.valore;
    if (!(annoId && await fileExists(accessToken, annoId))) {
      annoId = await findOrCreateFolder(accessToken, anno, rilieviRootId, isSharedDrive ? clientiId : null);
      await setImpostazione(base44, `drive_rilievi_${anno}_folder_id`, annoId);
    }

    // 4) Se il sopralluogo è già stato salvato (cartella esistente), AGGIORNA riutilizzando la cartella esistente
    const giaSalvato = sopraluogo.drive_folder_id && await fileExists(accessToken, sopraluogo.drive_folder_id);
    const driveIdFor = isSharedDrive ? clientiId : null;
    let cartellaId, numeroPad, nomeCartella, duplicatoInfo = null;

    if (giaSalvato) {
      // AGGIORNAMENTO: riutilizza la cartella cliente già esistente (stesso numero/percorso)
      cartellaId = sopraluogo.drive_folder_id;
      const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files/${cartellaId}?fields=name&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15000)
      });
      const folderData = folderRes.ok ? await folderRes.json() : {};
      nomeCartella = folderData.name || `${nome}, ${citta}`;
      const mNum = nomeCartella.match(/^(\d+)/);
      numeroPad = mNum ? mNum[1] : '';
    } else {
      // NUOVO SALVATAGGIO: calcola numero progressivo, rileva duplicati, crea cartella
      const figli = await listChildFolders(accessToken, annoId, driveIdFor);
      const reNum = /^(\d+)\s*[-–—]/;
      let maxNum = 0;
      for (const f of figli) {
        const m = f.name.match(reNum);
        if (m) {
          const n = parseInt(m[1]);
          if (n > maxNum) maxNum = n;
        }
        const suffix = `, ${citta}`.toLowerCase();
        if (f.name.toLowerCase().endsWith(suffix)) {
          const parteNome = f.name.slice(0, f.name.length - suffix.length).replace(/^\d+\s*[-–—]\s*/, '').trim().toLowerCase();
          if (parteNome === nome.toLowerCase()) {
            duplicatoInfo = duplicatoInfo || { id: f.id, name: f.name };
          }
        }
      }
      numeroPad = String(maxNum + 1).padStart(3, '0');
      nomeCartella = `${numeroPad} - ${nome}, ${citta}`;
      cartellaId = await findOrCreateFolder(accessToken, nomeCartella, annoId, driveIdFor);
    }

    // 6) Cinque sottocartelle tematiche (riusa ID salvati sull'entità)
    const sottoCartelle = [
      { chiave: 'drive_comunicazioni_folder_id', nome: 'Comunicazioni' },
      { chiave: 'drive_fornitori_folder_id', nome: 'Fornitori' },
      { chiave: 'drive_foto_folder_id', nome: 'Foto' },
      { chiave: 'drive_rilievi_folder_id', nome: 'Rilievi' },
      { chiave: 'drive_Subappalti_folder_id', nome: 'Subappalti' },
    ];
    const idsSotto = {};
    for (const sc of sottoCartelle) {
      let id = sopraluogo[sc.chiave];
      if (!(id && await fileExists(accessToken, id))) {
        id = await findOrCreateFolder(accessToken, sc.nome, cartellaId, driveIdFor);
      }
      idsSotto[sc.chiave] = id;
    }

    // 7) Genera PDF e salva nella sottocartella "Rilievi"
    // Se il client ha già generato il PDF con l'impaginazione di "Genera PDF", usa quello
    // (così il file su Drive è identico a quello stampato).
    let pdfBytes;
    if (payload.pdfBase64) {
      const bin = atob(payload.pdfBase64);
      pdfBytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) pdfBytes[i] = bin.charCodeAt(i);
    } else {
      // Il PDF viene rigenerato qui: recupera il tecnico autore del sopralluogo
      let tecnico = '';
      try {
        const autore = sopraluogo.created_by_id ? await base44.asServiceRole.entities.User.get(sopraluogo.created_by_id) : null;
        tecnico = autore?.full_name || user.full_name || '';
      } catch { tecnico = user.full_name || ''; }
      pdfBytes = await generaPdf({ ...sopraluogo, _tecnico: tecnico });
    }

    const nomeFile = `Sopraluogo - ${nome} - ${citta}.pdf`;
    const rilievoId = idsSotto.drive_rilievi_folder_id;
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let pdfId = sopraluogo.drive_pdf_id;
    let pdfUrl = sopraluogo.drive_pdf_url;

    if (pdfId && await fileExists(accessToken, pdfId)) {
      // Aggiorna il contenuto del PDF esistente
      const metadata = { name: nomeFile, mimeType: 'application/pdf' };
      const fullBody = new Blob([
        delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: application/pdf\r\n\r\n',
        bytes,
        closeDelimiter
      ], { type: `multipart/related; boundary=${boundary}` });
      const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${pdfId}?uploadType=multipart&supportsAllDrives=true`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: fullBody,
        signal: AbortSignal.timeout(60000)
      });
      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return Response.json({ error: 'Aggiornamento PDF fallito', details: errText }, { status: 500 });
      }
      const fileData = await updateRes.json();
      pdfId = fileData.id;
    } else {
      // Crea nuovo PDF
      const metadata = { name: nomeFile, mimeType: 'application/pdf', parents: [rilievoId] };
      const fullBody = new Blob([
        delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) +
        delimiter + 'Content-Type: application/pdf\r\n\r\n',
        bytes,
        closeDelimiter
      ], { type: `multipart/related; boundary=${boundary}` });
      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: fullBody,
        signal: AbortSignal.timeout(60000)
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return Response.json({ error: 'Upload PDF fallito', details: errText }, { status: 500 });
      }
      const fileData = await uploadRes.json();
      pdfId = fileData.id;
    }
    pdfUrl = `https://drive.google.com/file/d/${pdfId}/view`;

    // 8) Salva gli ID sul record del sopralluogo
    await base44.entities.Sopraluogo.update(sopraluogo.id, {
      drive_folder_id: cartellaId,
      drive_rilievi_folder_id: idsSotto.drive_rilievi_folder_id,
      drive_comunicazioni_folder_id: idsSotto.drive_comunicazioni_folder_id,
      drive_fornitori_folder_id: idsSotto.drive_fornitori_folder_id,
      drive_foto_folder_id: idsSotto.drive_foto_folder_id,
      drive_Subappalti_folder_id: idsSotto.drive_Subappalti_folder_id,
      drive_pdf_id: pdfId,
      drive_pdf_url: pdfUrl,
    });

    // 9) Scarica le foto dall'app e salvale nella sottocartella "Foto" del cliente
    const fotoFolderId = idsSotto.drive_foto_folder_id;
    const tuttiUrlFoto = [];
    (sopraluogo.stanze || []).forEach(s => {
      (s.foto || []).forEach(f => { const u = typeof f === 'string' ? f : (f && f.url); if (u) tuttiUrlFoto.push(u); });
    });
    (sopraluogo.foto_generali || []).forEach(f => { const u = typeof f === 'string' ? f : (f && f.url); if (u) tuttiUrlFoto.push(u); });
    (sopraluogo.foto_esterno || []).forEach(f => { const u = f && f.url ? f.url : (typeof f === 'string' ? f : null); if (u) tuttiUrlFoto.push(u); });
    // Foto delle lavorazioni del rilevamento misure
    (sopraluogo.rilievi || []).forEach(lav => {
      (lav.foto || []).forEach(f => { const u = typeof f === 'string' ? f : (f && f.url); if (u) tuttiUrlFoto.push(u); });
    });

    const urlFotoUnici = [...new Set(tuttiUrlFoto)];
    let fotoSalvate = 0;

    if (urlFotoUnici.length > 0) {
      // Svuota la cartella Foto per evitare duplicati (lista Drive con consistenza eventuale)
      const existingFoto = await listFilesInFolder(accessToken, fotoFolderId, driveIdFor);
      for (const f of existingFoto) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?supportsAllDrives=true`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(15000)
          });
        } catch {}
      }

      // Ricarica tutte le foto fresche dall'app
      for (const url of urlFotoUnici) {
        const basename = decodeURIComponent(url.split('/').pop().split('?')[0]) || `Foto-${Date.now()}.jpg`;
        try {
          const imgRes = await fetch(url, { signal: AbortSignal.timeout(20000) });
          if (!imgRes.ok) continue;
          const imgBuf = new Uint8Array(await imgRes.arrayBuffer());
          const isPng = imgBuf[0] === 0x89 && imgBuf[1] === 0x50;
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          const meta = { name: basename, mimeType, parents: [fotoFolderId] };
          const imgBody = new Blob([
            delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(meta) +
            delimiter + `Content-Type: ${mimeType}\r\n\r\n`,
            imgBuf,
            closeDelimiter
          ], { type: `multipart/related; boundary=${boundary}` });
          const upRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
            body: imgBody,
            signal: AbortSignal.timeout(60000)
          });
          if (upRes.ok) fotoSalvate++;
        } catch {}
      }
    }

    const folderLink = `https://drive.google.com/drive/folders/${cartellaId}`;
    const avvisoDuplicato = !!duplicatoInfo;

    return Response.json({
      success: true,
      aggiornamento: !!giaSalvato,
      folderId: cartellaId,
      folderLink,
      pdfUrl,
      pdfId,
      cartella: nomeCartella,
      numero: numeroPad,
      anno,
      percorso: `Clienti/RILIEVI/${anno}/${nomeCartella}`,
      avviso_duplicato: avvisoDuplicato,
      messaggio_avviso: avvisoDuplicato
        ? `Esiste già una cartellina con lo stesso cliente ("${duplicatoInfo.name}"), per favore controllare.`
        : null,
      foto_salvate: fotoSalvate,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}