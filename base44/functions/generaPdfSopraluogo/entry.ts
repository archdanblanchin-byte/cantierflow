import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { calcolaStanza, calcolaTotali, facciataMqTotale } from '../../shared/calcoliSopraluogo.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { sopraluogo } = body;

    if (!sopraluogo) {
      return Response.json({ error: 'Dati sopraluogo mancanti' }, { status: 400 });
    }

    // Numeri in formato italiano: massimo due decimali e virgola come separatore
    const numIt = (v) => (Math.round((parseFloat(v) || 0) * 100) / 100).toString().replace('.', ',');

    const tutteLeStanze = sopraluogo.stanze || [];
    const stanzeNormali = tutteLeStanze.filter(s => s.tipo !== 'facciata' && s.tipo !== 'travi_esterne');
    const traviEsterne = tutteLeStanze.filter(s => s.tipo === 'travi_esterne');
    const facciate = tutteLeStanze.filter(s => s.tipo === 'facciata');
    // Per calcolo totali: stanze normali + travi esterne (entrambi contribuiscono a totaliGlobali)
    const stanze = tutteLeStanze.filter(s => s.tipo !== 'facciata');


    const VOCI_LABELS = {
      muffa: { label: 'Muffa', unita: '%' },
      intonaco_deumidificante: { label: 'Intonaco Deumidificante', unita: 'mq' },
      scrostare: { label: 'Scrostare', unita: 'mq' },
      stuccare: { label: 'Stuccare', unita: 'mq' },
      rasare: { label: 'Rasare', unita: 'mq' },
      altro: { label: 'Altro', unita: 'mq' },
    };

    const TIPI_APERTURA_LABELS = {
      porta: 'Porta',
      arco: 'Arco',
      armadio: 'Armadio',
      mobile: 'Mobile',
      parete_particolare: 'Parete partic.',
      altro: 'Altro',
    };

    const totaliGlobali = stanze.length > 0 ? calcolaTotali(stanze) : null;

    // Raggruppa foto in griglie da 3 colonne (6 per foglio = 2 righe × 3)
    function fotoGrid(urls) {
      if (!urls || !urls.length) return '';
      return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px;">
        ${urls.map(url => `<img src="${url}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:5px;display:block;" />`).join('')}
      </div>`;
    }

    const stanzaHtml = (s, i) => {
      // Card speciale solo travi
      if (s.tipo === 'travi_esterne') {
        const nome = s.nome_custom || `🪵 Travi ${i + 1}`;
        const travi = s.travi_esterne || [];
        if (!travi.length) return '';
        const totMq = travi.reduce((acc, t) => {
          const tl = parseFloat(t.lunghezza_m)||0, tla = parseFloat(t.larghezza_m)||0, tsv = parseFloat(t.sviluppo)||1;
          return acc + (t.modalita === 'lxa_sviluppo' ? tl*tla*tsv : t.modalita === 'lxl' ? tl*tla : parseFloat(t.mq)||0);
        }, 0);
        const righe = travi.map(t => {
          const tl = parseFloat(t.lunghezza_m)||0, tla = parseFloat(t.larghezza_m)||0, tsv = parseFloat(t.sviluppo)||1;
          const mq = t.modalita === 'lxa_sviluppo' ? tl*tla*tsv : t.modalita === 'lxl' ? tl*tla : parseFloat(t.mq)||0;
          const formula = t.modalita === 'lxa_sviluppo' ? `${numIt(tl)}×${numIt(tla)}×${numIt(tsv)} sv` : t.modalita === 'lxl' ? `${numIt(tl)}×${numIt(tla)}` : `${numIt(mq)} mq`;
          const desc = t.descrizione ? ` <span style="color:#92400e;">${t.descrizione}</span>` : '';
          return `<div style="display:flex;justify-content:space-between;color:#475569;"><span>🪵${desc} (${formula})</span><span style="font-weight:600;">${mq.toFixed(2).replace('.', ',')} mq</span></div>`;
        }).join('');
        return `<div style="border:1px solid #fde68a;border-radius:7px;padding:10px 12px;margin-bottom:8px;background:#fffbeb;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #fde68a;padding-bottom:5px;margin-bottom:7px;">
            <span style="font-size:13px;font-weight:700;color:#92400e;">${nome}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:11.5px;">${righe}
            <div style="display:flex;justify-content:space-between;font-weight:800;color:#b45309;border-top:1px solid #fde68a;padding-top:3px;margin-top:2px;grid-column:1/-1;"><span>TOTALE TRAVI</span><span>${totMq.toFixed(2).replace('.', ',')} mq</span></div>
          </div>
        </div>`;
      }

      const tipo = s.nome_custom || s.tipo || `Stanza ${i + 1}`;
      const c = calcolaStanza(s);
      const hasMisure = s.lunghezza && s.larghezza && s.altezza;

      const apertureCells = (s.aperture || []).map(ap => {
        const mq = ((parseFloat(ap.lunghezza)||0) * (parseFloat(ap.altezza)||0) * (ap.tipo === 'arco' ? 2 : 1));
        const label = TIPI_APERTURA_LABELS[ap.tipo] || ap.tipo;
        const desc = ap.descrizione ? ` (${ap.descrizione})` : '';
        return `<span style="display:inline-block;padding:1px 7px;background:#f1f5f9;border-radius:4px;font-size:11px;margin:2px 2px 2px 0;">${label}${desc}: ${numIt(ap.lunghezza)}×${numIt(ap.altezza)}m${ap.tipo==='arco'?' ×2':''} = <b>${mq.toFixed(2).replace('.', ',')} mq</b></span>`;
      }).join('');

      const vociRows = (s.voci_extra || []).map(v => {
        const label = v.tipo === 'altro' && v.descrizione ?
          v.descrizione :
          `${VOCI_LABELS[v.tipo]?.label || v.tipo}${v.descrizione ? ` (${v.descrizione})` : ''}`;
        return `<tr><td>${label}</td><td style="text-align:right;font-weight:600;">${numIt(v.valore)} ${v.unita||'mq'}</td></tr>`;
      }).join('');

      return `
        <div style="border:1px solid #dde3ed;border-radius:7px;padding:10px 12px;margin-bottom:8px;page-break-inside:avoid;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e8edf5;padding-bottom:5px;margin-bottom:7px;">
            <span style="font-size:13px;font-weight:700;color:#1e293b;">${tipo}</span>
            ${hasMisure ? `<span style="font-size:11px;color:#64748b;">${numIt(s.lunghezza)} × ${numIt(s.larghezza)} × ${numIt(s.altezza)} m${s.soffitto?' · soffitto':''}${s.travi?' · travi':''}</span>` : ''}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:11.5px;">
            ${c.mq_aperture>0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;"><span>− Aperture</span><span style="font-weight:600;">−${c.mq_aperture.toFixed(2).replace('.', ',')} mq</span></div>` : ''}
            ${c.mq_pareti>0 ? `<div style="display:flex;justify-content:space-between;font-weight:700;color:#0f172a;"><span>Pareti nette</span><span>${c.mq_pareti.toFixed(2).replace('.', ',')} mq</span></div>` : ''}
            ${c.mq_soffitto>0 ? `<div style="display:flex;justify-content:space-between;color:#475569;"><span>Soffitto</span><span style="font-weight:600;">${c.mq_soffitto.toFixed(2).replace('.', ',')} mq</span></div>` : ''}
            ${c.mq_travi>0 ? `<div style="display:flex;justify-content:space-between;color:#92400e;"><span>Travi</span><span style="font-weight:600;">${c.mq_travi.toFixed(2).replace('.', ',')} mq</span></div>` : ''}
            ${c.mq_sigillatura_travi>0 ? `<div style="display:flex;justify-content:space-between;color:#92400e;"><span>Sigillatura travi</span><span style="font-weight:600;">${c.mq_sigillatura_travi.toFixed(2).replace('.', ',')} ml</span></div>` : ''}
            ${c.mq_travi_esterne>0 ? `<div style="display:flex;justify-content:space-between;color:#b45309;"><span>Travi esterne</span><span style="font-weight:600;">+${c.mq_travi_esterne.toFixed(2).replace('.', ',')} mq</span></div>` : ''}
            ${c.mq_pareti_extra>0 ? `<div style="display:flex;justify-content:space-between;color:#1d4ed8;"><span>Pareti extra</span><span style="font-weight:600;">+${c.mq_pareti_extra.toFixed(2).replace('.', ',')} mq</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-weight:800;color:#1e40af;border-top:1px solid #c7d7f0;padding-top:3px;margin-top:2px;grid-column:1/-1;"><span>TOTALE STANZA</span><span>${c.totale_mq.toFixed(2).replace('.', ',')} mq</span></div>
          </div>
          ${apertureCells ? `<div style="margin-top:6px;">${apertureCells}</div>` : ''}
          ${vociRows ? `<table style="width:100%;margin-top:6px;font-size:11px;border-collapse:collapse;">${vociRows}</table>` : ''}
          ${(s.foto||[]).length ? fotoGrid(s.foto) : ''}
        </div>
      `;
    };

    const VOCI_LABELS_FACCIATA = {
      muffa: { label: 'Muffa', unita: '%' },
      intonaco_deumidificante: { label: 'Intonaco Deumidificante', unita: 'mq' },
      scrostare: { label: 'Scrostare', unita: 'mq' },
      stuccare: { label: 'Stuccare', unita: 'mq' },
      rasare: { label: 'Rasare', unita: 'mq' },
      altro: { label: 'Altro', unita: 'mq' },
    };

    const TIPI_SOTTRAI_F = {
      porta_1_lato: 'Porzione 1 lato', porta_2_lati: 'Porzione 2 lati',
      parete: 'Parete', finestra: 'Finestra', porta: 'Porta', altro: 'Altro',
    };


    const facciataHtml = (f, i) => {
      const nome = f.nome_custom || (f.orientamento ? `Facciata ${f.orientamento}` : `Facciata ${i + 1}`);
      const mqTot = facciataMqTotale(f);
      const mqLordo = (f.misure || []).reduce((acc, m) => acc + (parseFloat(m.mq) || 0), 0);
      const mqSottrai = (f.sottrazioni || []).reduce((acc, s) => {
        const molt = s.tipo === 'porta_2_lati' ? 2 : 1;
        return acc + (parseFloat(s.lunghezza) || 0) * (parseFloat(s.altezza) || 0) * molt;
      }, 0);
      const mqAggiungi = (f.porzioni || []).reduce((acc, p) => {
        return acc + (p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m) || 0) * (parseFloat(p.altezza_m) || 0) : parseFloat(p.mq) || 0);
      }, 0);

      const misureRows = (f.misure || []).map((m, mi) => {
        const basi = (m.basi || []).map(b => parseFloat(b) || 0);
        const totBase = basi.reduce((s, b) => s + b, 0);
        return `<div style="color:#475569;font-size:11px;">${m.nome || `Campata ${mi+1}`}: base ${totBase.toFixed(2).replace('.', ',')} m × alt ${numIt(m.altezza)} m = <b>${(parseFloat(m.mq)||0).toFixed(2).replace('.', ',')} mq</b></div>`;
      }).join('');

      const sottraiRows = (f.sottrazioni || []).map(s => {
        const molt = s.tipo === 'porta_2_lati' ? 2 : 1;
        const mq = (parseFloat(s.lunghezza)||0) * (parseFloat(s.altezza)||0) * molt;
        const label = TIPI_SOTTRAI_F[s.tipo] || s.tipo;
        return `<span style="display:inline-block;padding:1px 7px;background:#fee2e2;border-radius:4px;font-size:11px;margin:2px;">${label}: ${numIt(s.lunghezza)}×${numIt(s.altezza)}m${molt===2?' ×2':''} = <b>−${mq.toFixed(2).replace('.', ',')} mq</b></span>`;
      }).join('');

      const aggiungiRows = (f.porzioni || []).map(p => {
        const mq = p.modalita === 'lxa' ? (parseFloat(p.lunghezza_m)||0)*(parseFloat(p.altezza_m)||0) : parseFloat(p.mq)||0;
        const label = p.descrizione || p.tipo;
        return `<span style="display:inline-block;padding:1px 7px;background:#dbeafe;border-radius:4px;font-size:11px;margin:2px;">${label}: <b>+${mq.toFixed(2).replace('.', ',')} mq</b></span>`;
      }).join('');

      const vociRows = (f.voci_extra || []).map(v => {
        const label = v.tipo === 'altro' && v.descrizione ?
          v.descrizione :
          `${VOCI_LABELS_FACCIATA[v.tipo]?.label || v.tipo}${v.descrizione ? ` (${v.descrizione})` : ''}`;
        return `<tr><td>${label}</td><td style="text-align:right;font-weight:600;">${numIt(v.valore)} ${v.unita||'mq'}</td></tr>`;
      }).join('');

      return `<div style="border:1px solid #bbf7d0;border-radius:7px;padding:10px 12px;margin-bottom:8px;background:#f0fdf4;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #bbf7d0;padding-bottom:5px;margin-bottom:7px;">
          <span style="font-size:13px;font-weight:700;color:#14532d;">🏠 ${nome}${f.orientamento ? ` — ${f.orientamento}` : ''}</span>
          ${mqTot > 0 ? `<span style="font-size:11px;color:#16a34a;font-weight:700;">${mqTot.toFixed(2).replace('.', ',')} mq tot.</span>` : ''}
        </div>
        <div style="font-size:11px;margin-bottom:5px;">${misureRows}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:11.5px;">
          ${mqSottrai > 0 ? `<div style="display:flex;justify-content:space-between;color:#dc2626;"><span>− Sottrazioni</span><span style="font-weight:600;">−${mqSottrai.toFixed(2).replace('.', ',')} mq</span></div>` : ''}
          ${mqAggiungi > 0 ? `<div style="display:flex;justify-content:space-between;color:#1d4ed8;"><span>+ Porzioni aggiunte</span><span style="font-weight:600;">+${mqAggiungi.toFixed(2).replace('.', ',')} mq</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;font-weight:800;color:#15803d;border-top:1px solid #bbf7d0;padding-top:3px;margin-top:2px;grid-column:1/-1;"><span>TOTALE DA TINTEGGIARE</span><span>${mqTot.toFixed(2).replace('.', ',')} mq</span></div>
        </div>
        ${sottraiRows ? `<div style="margin-top:5px;">${sottraiRows}</div>` : ''}
        ${aggiungiRows ? `<div style="margin-top:4px;">${aggiungiRows}</div>` : ''}
        ${vociRows ? `<table style="width:100%;margin-top:6px;font-size:11px;border-collapse:collapse;"><thead><tr><th style="text-align:left;color:#94a3b8;font-weight:500;font-size:10px;text-transform:uppercase;padding-bottom:3px;">Lavorazioni extra</th></tr></thead><tbody>${vociRows}</tbody></table>` : ''}
        ${(f.foto||[]).length ? fotoGrid(f.foto) : ''}
      </div>`;
    };

    const totaleFacciate = facciate.reduce((acc, f) => acc + facciataMqTotale(f), 0);

    const totaliFacciateExtra = {};
    facciate.forEach(f => {
      (f.voci_extra || []).forEach(v => {
        const desc = v.tipo === 'altro' ? (v.descrizione || '') : '';
        const key = desc ? `altro::${desc}` : v.tipo;
        if (!totaliFacciateExtra[key]) totaliFacciateExtra[key] = { valore: 0, unita: v.unita || 'mq', descrizione: desc };
        totaliFacciateExtra[key].valore += parseFloat(v.valore) || 0;
      });
    });

    const fotoGenerali = sopraluogo.foto_generali || [];

    // Tecnico che ha effettuato il sopralluogo (autore della scheda)
    let tecnico = '';
    try {
      tecnico = authUser?.full_name || '';
      if (sopraluogo.created_by_id && sopraluogo.created_by_id !== authUser?.id) {
        const autore = await base44.asServiceRole.entities.User.get(sopraluogo.created_by_id);
        if (autore?.full_name) tecnico = autore.full_name;
      }
    } catch { tecnico = ''; }

    // ── Rilevamento misure: una sezione per ogni lavorazione ──
    const MODALITA_LABEL = {
      semplice: 'Misura semplice',
      bxa: 'Base × Altezza',
      stanza: 'Stanza',
      lxa_sviluppo: 'Lungh. × Largh. + Sviluppo',
      mq_sviluppo: 'm² + Sviluppo',
    };

    const SVILUPPO = 1.65;
    const numV = (v) => parseFloat(v) || 0;

    // Misure di una porzione (compatibile con il formato precedente, dove i campi
    // della misura stavano direttamente sulla porzione)
    const misureDiPorzione = (p) => (Array.isArray(p.misure) && p.misure.length > 0 ? p.misure : [p]);

    const voceStanzaMq = (v) => (v.modalita === 'bxa' ? numV(v.base) * numV(v.altezza) : numV(v.quantita));

    const dettaglioStanzaRil = (m) => {
      const l = numV(m.lunghezza), w = numV(m.larghezza), h = numV(m.altezza);
      const pareti = (l + w) * 2 * h;
      const soffitto = m.soffitto !== false ? l * w : 0;
      const sottrazioni = (m.sottrazioni || []).reduce((a, v) => a + voceStanzaMq(v), 0);
      const aggiunte = (m.aggiunte || []).reduce((a, v) => a + voceStanzaMq(v), 0);
      return { pareti, soffitto, sottrazioni, aggiunte, totale: Math.max(0, pareti + soffitto - sottrazioni + aggiunte) };
    };

    const mqMisura = (m, modalita) => {
      switch (modalita) {
        case 'bxa': return numV(m.base) * numV(m.altezza);
        case 'stanza': return dettaglioStanzaRil(m).totale;
        case 'lxa_sviluppo': return numV(m.lunghezza) * numV(m.larghezza) * (numV(m.sviluppo) || SVILUPPO);
        case 'mq_sviluppo': return numV(m.mq) * (numV(m.sviluppo) || SVILUPPO);
        default: return numV(m.quantita);
      }
    };

    const unitaPorzioneRil = (p) => (p.modalita === 'semplice' ? (p.unita || 'm²') : 'm²');

    const nomePorzioneRil = (p, i) => (p.descrizione || p.stanza || '').trim() || `Porzione ${i + 1}`;

    // Dettaglio testuale completo di una singola misura
    const dettaglioMisura = (m, modalita) => {
      if (modalita === 'bxa') return `base ${numIt(m.base)} m × altezza ${numIt(m.altezza)} m`;
      if (modalita === 'lxa_sviluppo') return `lunghezza ${numIt(m.lunghezza)} m × larghezza ${numIt(m.larghezza)} m × sviluppo ${numIt(m.sviluppo || SVILUPPO)}`;
      if (modalita === 'mq_sviluppo') return `${numIt(m.mq)} m² × sviluppo ${numIt(m.sviluppo || SVILUPPO)}`;
      if (modalita === 'semplice') return `quantità ${numIt(m.quantita)}`;
      const d = dettaglioStanzaRil(m);
      const parti = [];
      if (m.lunghezza || m.larghezza || m.altezza) {
        parti.push(`locale ${numIt(m.lunghezza)} × ${numIt(m.larghezza)} m, altezza ${numIt(m.altezza)} m`);
      }
      parti.push(`perimetro pareti ${numIt((numV(m.lunghezza) + numV(m.larghezza)) * 2)} m`);
      parti.push(`pareti ${numIt(d.pareti)} m²`);
      if (d.soffitto > 0) parti.push(`soffitto ${numIt(d.soffitto)} m²`);
      if (d.sottrazioni > 0) parti.push(`− aperture/sottrazioni ${numIt(d.sottrazioni)} m²`);
      if (d.aggiunte > 0) parti.push(`+ porzioni ${numIt(d.aggiunte)} m²`);
      return parti.join(' · ');
    };

    const vociStanzaHtml = (voci, colore, segno) => {
      if (!voci || !voci.length) return '';
      return `<div style="margin:2px 0 0 14px;">${voci.map((v) => {
        const misura = v.modalita === 'bxa' ? `${numIt(v.base)} × ${numIt(v.altezza)} m` : `${numIt(v.quantita)} ${v.unita || ''}`.trim();
        return `<div style="display:flex;justify-content:space-between;gap:10px;font-size:10.5px;color:${colore};"><span>${v.descrizione ? `${v.descrizione} — ` : ''}${misura}</span><span style="font-weight:600;white-space:nowrap;">${segno}${numIt(voceStanzaMq(v))} m²</span></div>`;
      }).join('')}</div>`;
    };

    const misuraHtml = (m, modalita, unita, i, quante) => {
      const valore = mqMisura(m, modalita);
      const num = quante > 1 ? `<span style="display:inline-block;padding:0 6px;background:#e2e8f0;border-radius:4px;font-size:9.5px;color:#475569;margin-right:5px;">Misura ${i + 1}</span>` : '';
      const sottrazioni = modalita === 'stanza' ? vociStanzaHtml(m.sottrazioni, '#dc2626', '−') : '';
      const aggiunte = modalita === 'stanza' ? vociStanzaHtml(m.aggiunte, '#1d4ed8', '+') : '';
      return `<div style="padding:3px 0;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;">
          <span style="color:#475569;">${num}${dettaglioMisura(m, modalita)}</span>
          <span style="font-weight:600;color:#0f172a;white-space:nowrap;">${numIt(valore)} ${unita}</span>
        </div>
        ${sottrazioni}${aggiunte}
      </div>`;
    };

    const porzioneRilievoHtml = (p, i) => {
      const misure = misureDiPorzione(p);
      const unita = unitaPorzioneRil(p);
      const totale = misure.reduce((a, m) => a + mqMisura(m, p.modalita), 0);
      return `<div style="border-left:2px solid #e2e8f0;padding-left:9px;margin-bottom:7px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;gap:12px;font-size:11.5px;">
          <span style="font-weight:600;color:#1e293b;">${nomePorzioneRil(p, i)} <span style="font-weight:400;color:#94a3b8;font-size:10px;">· ${MODALITA_LABEL[p.modalita] || p.modalita}${misure.length > 1 ? ` · ${misure.length} misure` : ''}</span></span>
          <span style="font-weight:700;color:#1e40af;white-space:nowrap;">${numIt(totale)} ${unita}</span>
        </div>
        ${misure.map((m, mi) => misuraHtml(m, p.modalita, unita, mi, misure.length)).join('')}
      </div>`;
    };

    const rilievoHtml = (lav, i) => {
      const porzioni = lav.porzioni || [];
      const totali = {};
      porzioni.forEach((p) => {
        const u = unitaPorzioneRil(p);
        totali[u] = (totali[u] || 0) + misureDiPorzione(p).reduce((a, m) => a + mqMisura(m, p.modalita), 0);
      });
      const totaleTxt = Object.entries(totali).map(([u, v]) => `${numIt(v)} ${u}`).join(' · ');
      const file = lav.file || [];
      return `<div style="border:1px solid #dde3ed;border-radius:7px;padding:10px 12px;margin-bottom:10px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e8edf5;padding-bottom:5px;margin-bottom:7px;">
          <span style="font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.04em;">${lav.nome || `Lavorazione ${i + 1}`}</span>
          ${totaleTxt ? `<span style="font-size:11px;font-weight:700;color:#1e40af;white-space:nowrap;">${totaleTxt}</span>` : ''}
        </div>
        ${porzioni.length ? porzioni.map((p, pi) => porzioneRilievoHtml(p, pi)).join('') : '<div style="font-size:11px;color:#94a3b8;">Nessuna misura rilevata</div>'}
        ${lav.note ? `<div style="margin-top:6px;font-size:11px;color:#334155;background:#f1f5f9;border-radius:5px;padding:6px 8px;white-space:pre-wrap;">${lav.note}</div>` : ''}
        ${(lav.foto || []).length ? `<div style="margin-top:7px;"><div style="font-size:9.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">Fotografie e immagini annotate</div>${fotoGrid(lav.foto)}</div>` : ''}
        ${file.length ? `<div style="margin-top:7px;">${file.map((f) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:10.5px;color:#475569;border-top:1px dashed #e8edf5;padding:3px 0;"><span>📎 ${f.nome || 'Allegato'}</span><span style="color:#94a3b8;font-size:9.5px;word-break:break-all;">${f.url || ''}</span></div>`).join('')}</div>` : ''}
      </div>`;
    };

    const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 24px 28px; font-size: 12px; line-height: 1.45; }
    h1 { font-size: 20px; color: #0f172a; margin-bottom: 2px; }
    h2 { font-size: 13px; font-weight: 700; color: #1e40af; margin: 14px 0 6px; border-bottom: 1.5px solid #dde3ed; padding-bottom: 3px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px; }
    .field { background: #f8fafc; border-radius: 5px; padding: 5px 9px; }
    .lbl { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    .val { font-size: 12px; color: #0f172a; font-weight: 500; }
    .note-box { background: #f1f5f9; border-radius: 6px; padding: 8px 10px; white-space: pre-wrap; font-size: 11.5px; line-height: 1.55; }
    @media print { body { padding: 16px 20px; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e40af;padding-bottom:8px;margin-bottom:12px;">
    <div>
      <h1>Sopraluogo — ${sopraluogo.cliente_nome || 'Cliente'}</h1>
      ${sopraluogo.nome_cantiere ? `<p style="font-size:12px;color:#1e40af;font-weight:600;margin-top:2px;">Cantiere: ${sopraluogo.nome_cantiere}</p>` : ''}
      <p style="color:#64748b;font-size:11px;margin-top:2px;">${[sopraluogo.cliente_indirizzo, sopraluogo.cliente_citta].filter(Boolean).join(' — ') || ''}</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;">
      <div>${sopraluogo.data_sopraluogo || '—'}</div>
      ${tecnico ? `<div>Tecnico: <strong style="color:#334155;">${tecnico}</strong></div>` : ''}
      <div style="text-transform:uppercase;font-weight:600;color:#1e40af;">${sopraluogo.stato || 'bozza'}</div>
    </div>
  </div>

  <h2>👤 Dati Cliente e Cantiere</h2>
  <div class="grid2">
    <div class="field"><div class="lbl">Nome</div><div class="val">${sopraluogo.cliente_nome || '—'}</div></div>
    <div class="field"><div class="lbl">Nome cantiere</div><div class="val">${sopraluogo.nome_cantiere || '—'}</div></div>
    <div class="field"><div class="lbl">Indirizzo</div><div class="val">${sopraluogo.cliente_indirizzo || '—'}</div></div>
    <div class="field"><div class="lbl">Città</div><div class="val">${sopraluogo.cliente_citta || '—'}</div></div>
    <div class="field"><div class="lbl">Telefono</div><div class="val">${sopraluogo.cliente_telefono || '—'}</div></div>
    <div class="field"><div class="lbl">Email</div><div class="val">${sopraluogo.cliente_mail || '—'}</div></div>
    <div class="field"><div class="lbl">Data sopraluogo</div><div class="val">${sopraluogo.data_sopraluogo || '—'}</div></div>
    <div class="field"><div class="lbl">Tecnico</div><div class="val">${tecnico || '—'}</div></div>
  </div>

  ${sopraluogo.ca_attivo ? `
  <h2>📍 Alla c.a. di</h2>
  <div class="grid2">
    <div class="field"><div class="lbl">Nome e cognome</div><div class="val">${[sopraluogo.ca_nome, sopraluogo.ca_cognome].filter(Boolean).join(' ') || '—'}</div></div>
    <div class="field"><div class="lbl">Indirizzo</div><div class="val">${sopraluogo.ca_indirizzo || '—'}</div></div>
    <div class="field"><div class="lbl">Città</div><div class="val">${sopraluogo.ca_citta || '—'}</div></div>
    <div class="field"><div class="lbl">Telefono</div><div class="val">${sopraluogo.ca_telefono || '—'}</div></div>
    <div class="field"><div class="lbl">Email</div><div class="val">${sopraluogo.ca_email || '—'}</div></div>
  </div>` : ''}

  ${sopraluogo.prodotti_particolari ? `<h2>🎨 Prodotti Richiesti</h2><div class="note-box">${sopraluogo.prodotti_particolari}</div>` : ''}
  ${sopraluogo.note_generali ? `<h2>📋 Note Generali</h2><div class="note-box">${sopraluogo.note_generali}</div>` : ''}
  ${sopraluogo.note_dettaglio ? `<h2>🔍 Dettagli</h2><div class="note-box">${sopraluogo.note_dettaglio}</div>` : ''}
  ${sopraluogo.audio_note ? `<h2>🎙️ Analisi Sopraluogo (AI)</h2><div class="note-box">${sopraluogo.audio_note.replace(/📋 TRASCRIZIONE\n[\s\S]*?\n\n/, '')}</div>` : ''}
  ${sopraluogo.audio_lavorazioni ? `<h2>🔨 Lavorazioni da Eseguire (AI)</h2><div class="note-box">${sopraluogo.audio_lavorazioni.replace(/📋 TRASCRIZIONE\n[\s\S]*?\n\n/, '')}</div>` : ''}

  ${(sopraluogo.rilievi || []).length > 0 ? `
  <h2>🔨 Rilevamento misure (${(sopraluogo.rilievi || []).length} lavorazioni)</h2>
  ${(sopraluogo.rilievi || []).map((lav, i) => rilievoHtml(lav, i)).join('')}
  ` : ''}

  ${stanzeNormali.length > 0 ? `
  <h2>🏠 Stanze (${stanzeNormali.length})</h2>
  ${stanzeNormali.map((s, i) => stanzaHtml(s, i)).join('')}
  ` : ''}

  ${traviEsterne.length > 0 ? `
  <h2>🪵 Travi (${traviEsterne.length})</h2>
  ${traviEsterne.map((t, i) => stanzaHtml(t, i)).join('')}
  ` : ''}

  ${facciate.length > 0 ? `
  <h2>🏠 Facciate (${facciate.length})${totaleFacciate > 0 ? ` — ${totaleFacciate.toFixed(1).replace('.', ',')} mq tot.` : ''}</h2>
  ${facciate.map((f, i) => facciataHtml(f, i)).join('')}
  ` : ''}

  ${(sopraluogo.misure_extra||[]).length ? `
  <h2>📐 Misure di riferimento (non sommate)</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:11.5px;">
    ${(sopraluogo.misure_extra||[]).map(me => `<div style="display:flex;justify-content:space-between;color:#475569;border-bottom:1px dashed #fde68a;padding:2px 0;"><span>${me.descrizione||'—'}</span><span style="font-weight:700;color:#b45309;">${numIt(me.valore)} ${me.unita||''}</span></div>`).join('')}
  </div>
  ` : ''}

  ${fotoGenerali.length > 0 ? `
  <h2>📸 Foto Generali</h2>
  ${fotoGrid(fotoGenerali)}
  ` : ''}

  ${(sopraluogo.allegati || []).length > 0 ? `
  <h2>📎 Allegati (${(sopraluogo.allegati || []).length})</h2>
  ${(sopraluogo.allegati || []).map(a => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:11px;color:#475569;border-bottom:1px dashed #e2e8f0;padding:3px 0;"><span>📎 ${a.nome || 'Allegato'}</span><span style="color:#94a3b8;font-size:9.5px;word-break:break-all;">${a.url || ''}</span></div>`).join('')}
  ` : ''}

  ${(sopraluogo.foto_esterno || []).length > 0 ? `
  <h2>📐 Foto & Quote (Esterno)</h2>
  <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:6px;">
    ${(sopraluogo.foto_esterno || []).map(f => `<img src="${f.url_annotata || f.url || f}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:5px;display:block;" />`).join('')}
  </div>
  ` : ''}

  ${(totaliGlobali || totaleFacciate > 0) ? `
  <h2>📊 Riepilogo Totali</h2>

  <!-- Sezione Pareti & Soffitti -->
  ${totaliGlobali ? `
  <div style="border:1.5px solid #1e40af;border-radius:8px;padding:12px 14px;margin-bottom:10px;page-break-inside:avoid;">
    <div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:8px;border-bottom:1px solid #bfdbfe;padding-bottom:4px;">🏠 Pareti & Soffitti</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;font-size:11.5px;">
      ${totaliGlobali.mq_pareti > 0 ? `<div style="display:flex;justify-content:space-between;color:#475569;"><span>Pareti nette</span><span style="font-weight:700;color:#0f172a;">${totaliGlobali.mq_pareti.toFixed(1).replace('.', ',')} mq</span></div>` : ''}
      ${totaliGlobali.mq_soffitto > 0 ? `<div style="display:flex;justify-content:space-between;color:#475569;"><span>Soffitti</span><span style="font-weight:700;color:#0f172a;">${totaliGlobali.mq_soffitto.toFixed(1).replace('.', ',')} mq</span></div>` : ''}
      ${totaliGlobali.mq_pareti_extra > 0 ? `<div style="display:flex;justify-content:space-between;color:#1d4ed8;"><span>+ Pareti extra</span><span style="font-weight:700;color:#1d4ed8;">+${totaliGlobali.mq_pareti_extra.toFixed(1).replace('.', ',')} mq</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;font-weight:800;color:#1e40af;border-top:1px solid #bfdbfe;padding-top:4px;margin-top:3px;grid-column:1/-1;">
        <span>SUBTOTALE PARETI & SOFFITTI</span>
        <span style="font-size:13px;">${(totaliGlobali.mq_pareti + totaliGlobali.mq_soffitto + totaliGlobali.mq_pareti_extra).toFixed(1).replace('.', ',')} mq</span>
      </div>
    </div>
    ${Object.keys(totaliGlobali.extra).length > 0 ? `
    <div style="margin-top:8px;border-top:1px dashed #bfdbfe;padding-top:6px;">
      <span style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Lavorazioni extra stanze</span>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 20px;font-size:11px;margin-top:3px;">
        ${Object.entries(totaliGlobali.extra).map(([tipo, data]) => {
          const info = VOCI_LABELS[tipo] || { label: tipo, unita: data.unita };
          const label = data.descrizione || info.label;
          return `<div style="display:flex;justify-content:space-between;color:#475569;"><span>${label}</span><span style="font-weight:600;">${data.valore.toFixed(1).replace('.', ',')} ${info.unita}</span></div>`;
        }).join('')}
      </div>
    </div>` : ''}
  </div>` : ''}

  <!-- Sezione Travi -->
  ${(() => {
    const haTravi = totaliGlobali && (totaliGlobali.mq_travi > 0 || totaliGlobali.mq_travi_esterne > 0 || totaliGlobali.mq_sigillatura_travi > 0);
    if (!haTravi) return '';
    const totTravi = (totaliGlobali.mq_travi || 0) + (totaliGlobali.mq_travi_esterne || 0);
    return `
    <div style="border:1.5px solid #fde68a;border-radius:8px;padding:12px 14px;margin-bottom:10px;background:#fffbeb;page-break-inside:avoid;">
      <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px;border-bottom:1px solid #fde68a;padding-bottom:4px;">🪵 Travi</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;font-size:11.5px;">
        ${totaliGlobali.mq_travi > 0 ? `<div style="display:flex;justify-content:space-between;color:#92400e;"><span>Travi interne</span><span style="font-weight:700;">${totaliGlobali.mq_travi.toFixed(1).replace('.', ',')} mq</span></div>` : ''}
        ${totaliGlobali.mq_travi_esterne > 0 ? `<div style="display:flex;justify-content:space-between;color:#b45309;"><span>Travi esterne</span><span style="font-weight:700;">${totaliGlobali.mq_travi_esterne.toFixed(1).replace('.', ',')} mq</span></div>` : ''}
        ${totaliGlobali.mq_sigillatura_travi > 0 ? `<div style="display:flex;justify-content:space-between;color:#d97706;"><span>Sigillatura travi</span><span style="font-weight:700;">${totaliGlobali.mq_sigillatura_travi.toFixed(1).replace('.', ',')} ml</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-weight:800;color:#b45309;border-top:1px solid #fde68a;padding-top:4px;margin-top:3px;grid-column:1/-1;">
          <span>SUBTOTALE TRAVI</span>
          <span style="font-size:13px;">${totTravi.toFixed(1).replace('.', ',')} mq</span>
        </div>
      </div>
    </div>`;
  })()}

  <!-- Sezione Facciate -->
  ${totaleFacciate > 0 ? `
  <div style="border:1.5px solid #bbf7d0;border-radius:8px;padding:12px 14px;margin-bottom:10px;background:#f0fdf4;page-break-inside:avoid;">
    <div style="font-size:12px;font-weight:700;color:#14532d;margin-bottom:8px;border-bottom:1px solid #bbf7d0;padding-bottom:4px;">🏠 Facciate</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;font-size:11.5px;">
      <div style="display:flex;justify-content:space-between;font-weight:800;color:#15803d;grid-column:1/-1;">
        <span>TOTALE FACCIATE</span>
        <span style="font-size:13px;">${totaleFacciate.toFixed(1).replace('.', ',')} mq</span>
      </div>
    </div>
    ${Object.keys(totaliFacciateExtra).length > 0 ? `
    <div style="margin-top:8px;border-top:1px dashed #bbf7d0;padding-top:6px;">
      <span style="font-size:10px;color:#86a38c;text-transform:uppercase;">Lavorazioni extra facciate</span>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 20px;font-size:11px;margin-top:3px;">
        ${Object.entries(totaliFacciateExtra).map(([tipo, data]) => {
          const info = VOCI_LABELS_FACCIATA[tipo] || { label: tipo, unita: data.unita };
          const label = data.descrizione || info.label;
          return `<div style="display:flex;justify-content:space-between;color:#475569;"><span>${label}</span><span style="font-weight:600;">${data.valore.toFixed(1).replace('.', ',')} ${info.unita}</span></div>`;
        }).join('')}
      </div>
    </div>` : ''}
  </div>` : ''}

  ${(totaliGlobali && totaliGlobali.totale_mq > 0) || totaleFacciate > 0 ? `
  <div style="padding:10px 14px;background:#1e40af;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:13px;font-weight:600;color:#bfdbfe;">TOTALE GENERALE DA TINTEGGIARE</span>
    <span style="font-size:18px;font-weight:800;color:#fff;">${((totaliGlobali?.totale_mq || 0) + totaleFacciate).toFixed(1).replace('.', ',')} mq</span>
  </div>` : ''}
  ` : ''}
</body>
</html>`;

    return Response.json({ html });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}