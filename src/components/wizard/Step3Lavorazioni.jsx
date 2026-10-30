import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SheetSelect from "@/components/ui/sheet-select";
import { Button } from "@/components/ui/button";
import {
  Plus, Trash2, Wrench, AlertCircle, CheckCircle2, AlertTriangle, Users, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AudioLavorazioniRecorder from "@/components/wizard/AudioLavorazioniRecorder";
import OreInput from "@/components/wizard/OreInput";
import NumeroInput from "@/components/wizard/NumeroInput";
import NuovaLavorazioneDialog from "@/components/wizard/NuovaLavorazioneDialog";
import { fmtOre } from "@/lib/timbratureUtils";

const fmtH = (n) => fmtOre(n);

// Costruisce l'elenco unificato a partire dai due array salvati sul rapportino.
// Ogni riga porta un flag `extra` e un `ordine` stabile, così la posizione nella
// lista non salta quando si attiva/disattiva il flag Extra.
function buildItems(data) {
  const normali = (data.lavorazioni_normali || []).map((l, i) => ({
    extra: false,
    ordine: l.ordine ?? i,
    tipo_lavorazione_id: l.tipo_lavorazione_id || "",
    tipo_lavorazione_nome: l.tipo_lavorazione_nome || "",
    categoria: l.categoria || "",
    descrizione_custom: l.descrizione_custom || "",
    descrizione: l.descrizione || "",
    ore: l.ore_totali || 0,
    modalita_calcolo: l.modalita_calcolo || "manuale",
    numero_persone: l.numero_persone || 0,
    ore_per_persona: l.ore_per_persona || 0,
  }));
  const extra = (data.lavorazioni_extra || []).map((l, i) => ({
    extra: true,
    ordine: l.ordine ?? (normali.length + i),
    tipo_lavorazione_id: "",
    tipo_lavorazione_nome: "",
    categoria: "",
    descrizione_custom: "",
    descrizione: l.descrizione || "",
    ore: l.ore || 0,
    modalita_calcolo: l.modalita_calcolo || "manuale",
    numero_persone: l.numero_persone || 0,
    ore_per_persona: l.ore_per_persona || 0,
  }));
  return [...normali, ...extra].sort((a, b) => a.ordine - b.ordine);
}

// Riporta l'item unificato nei due formati salvati sul rapportino.
function toNormaliShape(it) {
  return {
    tipo_lavorazione_id: it.tipo_lavorazione_id || "",
    tipo_lavorazione_nome: it.tipo_lavorazione_nome || "",
    categoria: it.categoria || "",
    descrizione_custom: it.descrizione_custom || "",
    descrizione: it.descrizione || "",
    ore_totali: it.ore || 0,
    modalita_calcolo: it.modalita_calcolo || "manuale",
    numero_persone: it.numero_persone || 0,
    ore_per_persona: it.ore_per_persona || 0,
    ordine: it.ordine,
  };
}
function toExtraShape(it) {
  const desc = it.tipo_lavorazione_nome || it.descrizione_custom || it.descrizione || "";
  return {
    descrizione: desc,
    ore: it.ore || 0,
    modalita_calcolo: it.modalita_calcolo || "manuale",
    numero_persone: it.numero_persone || 0,
    ore_per_persona: it.ore_per_persona || 0,
    ordine: it.ordine,
  };
}

export default function Step3Lavorazioni({ data, onChange, tipiLavorazione }) {
  // Elenco unificato in stato locale: un solo flusso di inserimento.
  // Ogni modifica viene riportata sui due array del rapportino (lavorazioni_normali
  // e lavorazioni_extra) per conservare la struttura dati esistente.
  const [items, setItems] = useState(() => buildItems(data));
  const [nuoviTipi, setNuoviTipi] = useState([]);
  const [nuovaLavIndex, setNuovaLavIndex] = useState(null);

  const tutteCategorie = [...new Set((tipiLavorazione || []).map((t) => t.categoria).filter(Boolean))];
  const catalogo = [...(tipiLavorazione || []), ...nuoviTipi].sort((a, b) =>
    (a.categoria || "").localeCompare(b.categoria || "") || (a.nome || "").localeCompare(b.nome || "")
  );

  const commit = (next) => {
    setItems(next);
    const normali = next.filter((i) => !i.extra).map(toNormaliShape);
    const extra = next.filter((i) => i.extra).map(toExtraShape);
    onChange({
      lavorazioni_normali: normali,
      lavorazioni_extra: extra,
      has_lavorazioni_extra: extra.length > 0,
    });
  };

  const nextOrdine = () => items.reduce((m, it) => Math.max(m, it.ordine ?? 0), -1) + 1;

  const addLavorazione = () => {
    const nuovo = {
      extra: false,
      ordine: nextOrdine(),
      tipo_lavorazione_id: "",
      tipo_lavorazione_nome: "",
      categoria: "",
      descrizione_custom: "",
      descrizione: "",
      ore: 0,
      modalita_calcolo: "manuale",
      numero_persone: 0,
      ore_per_persona: 0,
    };
    commit([...items, nuovo]);
  };

  const updateItem = (index, updates) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    if (next[index].modalita_calcolo === "per_persone") {
      next[index].ore = (next[index].numero_persone || 0) * (next[index].ore_per_persona || 0);
    }
    commit(next);
  };

  const toggleExtra = (index) => {
    const next = [...items];
    next[index] = { ...next[index], extra: !next[index].extra };
    commit(next);
  };

  const removeItem = (index) => {
    commit(items.filter((_, i) => i !== index));
  };

  const handleNuovaLavorazioneCreata = (tipo) => {
    setNuoviTipi((prev) => [...prev, tipo]);
    if (nuovaLavIndex !== null) {
      updateItem(nuovaLavIndex, {
        tipo_lavorazione_id: tipo.id,
        tipo_lavorazione_nome: tipo.nome || "",
        categoria: tipo.categoria || "",
      });
    }
    setNuovaLavIndex(null);
  };

  // Resoconto vocale: aggiunge tutte le lavorazioni come preventivate; l'utente
  // attiva poi il flag Extra sulle righe concordate fuori preventivo.
  const handleAudioResult = (parsed) => {
    const availableCats = [...new Set((tipiLavorazione || []).map((t) => t.categoria).filter(Boolean))];
    let base = nextOrdine();
    const nuovi = parsed.map((n) => {
      const modalita_calcolo = n.modalita_calcolo === "per_persone" ? "per_persone" : "manuale";
      const numero_persone = n.numero_persone || 0;
      const ore_per_persona = n.ore_per_persona || 0;
      const ore = modalita_calcolo === "per_persone"
        ? Math.round(numero_persone * ore_per_persona * 100) / 100
        : n.ore_totali || 0;
      const descrizione = n.descrizione || "";
      const catMatch = availableCats.find((c) => c.toLowerCase() === String(n.categoria).toLowerCase());
      const item = {
        extra: false,
        ordine: base++,
        tipo_lavorazione_id: "",
        tipo_lavorazione_nome: n.tipo || "",
        categoria: catMatch || "__custom__",
        descrizione_custom: catMatch ? (n.tipo || "") : `${n.categoria || ""} - ${n.tipo || ""}`,
        descrizione,
        ore,
        modalita_calcolo,
        numero_persone,
        ore_per_persona,
      };
      if (catMatch) {
        const tipoMatch = (tipiLavorazione || []).find(
          (t) => t.categoria === catMatch && t.nome.toLowerCase() === String(n.tipo).toLowerCase()
        );
        if (tipoMatch) {
          item.tipo_lavorazione_id = tipoMatch.id;
          item.tipo_lavorazione_nome = tipoMatch.nome;
          item.categoria = catMatch;
          item.descrizione_custom = "";
        }
      }
      return item;
    });
    commit([...items, ...nuovi]);
  };

  // Quadro ore
  const oreLavoratori = (data.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0) ||
    data.ore_totali_squadra || 0;
  const oreExtra = items.filter((i) => i.extra).reduce((s, l) => s + (l.ore || 0), 0);
  const oreNormali = items.filter((i) => !i.extra).reduce((s, l) => s + (l.ore || 0), 0);
  const delta = oreLavoratori - oreExtra - oreNormali;
  const isValid = Math.abs(delta) < 0.01;
  const isSforato = delta < -0.01;
  const isMancante = delta > 0.01;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Lavorazioni</h2>
          <p className="text-sm text-muted-foreground">
            Registra tutte le lavorazioni della giornata. Se una è extra (concordata fuori preventivo), attiva il pulsante «Extra» in alto a destra.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AudioLavorazioniRecorder mode="normali" tipiLavorazione={tipiLavorazione} onResult={handleAudioResult} />
        <span className="text-xs text-muted-foreground">
          Parla: l'IA aggiunge le voci e compila le ore che dici. Puoi rivederle e modificarle dopo.
        </span>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
          <Wrench className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
          <p className="text-sm">Nessuna lavorazione</p>
          <p className="text-xs mt-0.5">Aggiungi le attività svolte oggi</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((lav, i) => {
          const perPersone = lav.modalita_calcolo === "per_persone";
          const haCatalogo = Boolean(lav.categoria && lav.categoria !== "__custom__");
          return (
            <div
              key={lav.ordine}
              className={cn(
                "rounded-xl border bg-card p-3 space-y-2.5",
                lav.extra ? "border-amber-300 bg-amber-50/40" : "border-border"
              )}
            >
              {/* Intestazione riga — numero, badge, Extra (dx), elimina */}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0",
                    lav.extra ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                  )}
                >
                  {i + 1}
                </span>
                {lav.extra ? (
                  <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Extra
                  </span>
                ) : (
                  haCatalogo && (
                    <span className="text-[11px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      {lav.categoria}
                    </span>
                  )
                )}
                {perPersone && (
                  <span className="text-[11px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5 tabular-nums">
                    {lav.numero_persone || 0} × {fmtH(lav.ore_per_persona)} = {fmtH(lav.ore)}
                  </span>
                )}

                {/* Toggle Extra in alto a destra */}
                <button
                  type="button"
                  onClick={() => toggleExtra(i)}
                  title={lav.extra ? "È una lavorazione extra" : "Segna come extra"}
                  className={cn(
                    "ml-auto flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs font-semibold transition-colors flex-shrink-0",
                    lav.extra
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Extra
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive flex-shrink-0"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Riga 1 — Tipo lavorazione */}
              <div>
                <Label className="text-[11px] text-muted-foreground">Tipo lavorazione</Label>
                <SheetSelect
                  value={lav.tipo_lavorazione_id || undefined}
                  onValueChange={(val) => {
                    if (val === "__nuovo__") {
                      setNuovaLavIndex(i);
                      return;
                    }
                    const tipo = catalogo.find((t) => t.id === val);
                    updateItem(i, {
                      tipo_lavorazione_id: val,
                      tipo_lavorazione_nome: tipo?.nome || "",
                      categoria: tipo?.categoria || lav.categoria || "",
                    });
                  }}
                  options={[
                    ...catalogo.map((t) => ({ value: t.id, label: t.nome })),
                    { value: "__nuovo__", label: "＋ Nuova lavorazione" },
                  ]}
                  placeholder="Seleziona lavorazione..."
                />
              </div>

              {/* Riga 2 — Descrizione e dettaglio */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Descrizione e dettaglio</Label>
                <Textarea
                  value={lav.descrizione || ""}
                  onChange={(e) => updateItem(i, { descrizione: e.target.value })}
                  className="min-h-[40px] resize-y text-sm"
                  placeholder="Dettaglio (cosa / dove) — es. facciata nord, prime due stanze..."
                />
              </div>

              {/* Riga 3 — Modalità ore + Ore */}
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Modalità ore</Label>
                  <div className="flex items-center gap-2 h-9">
                    <span className="text-sm">{perPersone ? "Per persone" : "Manuale"}</span>
                    <button
                      type="button"
                      title="Calcola per persone"
                      onClick={() => updateItem(i, { modalita_calcolo: perPersone ? "manuale" : "per_persone" })}
                      className={cn(
                        "h-9 w-9 rounded-full border flex items-center justify-center transition-colors",
                        perPersone
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-input text-muted-foreground hover:bg-accent"
                      )}
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {perPersone && (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-28">
                      <Label className="text-[11px] text-muted-foreground">N° persone</Label>
                      <NumeroInput
                        compact
                        step={1}
                        value={lav.numero_persone ?? 0}
                        onChange={(v) => updateItem(i, { numero_persone: v })}
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-[11px] text-muted-foreground">Ore/persona</Label>
                      <OreInput
                        compact
                        value={lav.ore_per_persona ?? 0}
                        onChange={(v) => updateItem(i, { ore_per_persona: v })}
                      />
                    </div>
                  </div>
                )}

                <div className="w-28 ml-auto">
                  <Label className="text-[11px] text-muted-foreground">Ore</Label>
                  <OreInput
                    compact
                    value={lav.ore ?? 0}
                    onChange={(v) => updateItem(i, { ore: v, modalita_calcolo: "manuale" })}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <Button variant="outline" onClick={addLavorazione} className="gap-2 w-full border-dashed">
          <Plus className="w-4 h-4" />
          Aggiungi Lavorazione
        </Button>

        <NuovaLavorazioneDialog
          open={nuovaLavIndex !== null}
          onOpenChange={(o) => { if (!o) setNuovaLavIndex(null); }}
          categorie={tutteCategorie}
          onCreated={handleNuovaLavorazioneCreata}
        />
      </div>

      {/* Quadro ore */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 bg-muted/40 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quadro ore</span>
        </div>
        <div className="divide-y divide-border">
          <div className="flex justify-between items-center px-4 py-2 text-sm">
            <span className="text-muted-foreground">Ore lavoratori</span>
            <span className="font-semibold">{fmtH(oreLavoratori)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2 text-sm">
            <span className="text-muted-foreground">− Ore extra</span>
            <span className="font-semibold text-amber-600">−{fmtH(oreExtra)}</span>
          </div>
          <div className="flex justify-between items-center px-4 py-2 text-sm">
            <span className="text-muted-foreground">− Ore preventivate</span>
            <span className="font-semibold text-primary">−{fmtH(oreNormali)}</span>
          </div>
          <div
            className={cn(
              "flex justify-between items-center px-4 py-3 text-sm font-bold border-t-2",
              isValid && "border-green-300 bg-green-50 text-green-800",
              isMancante && "border-amber-300 bg-amber-50 text-amber-800",
              isSforato && "border-red-300 bg-red-50 text-red-700"
            )}
          >
            <div className="flex items-center gap-2">
              {isValid && <CheckCircle2 className="w-4 h-4" />}
              {isMancante && <AlertTriangle className="w-4 h-4" />}
              {isSforato && <AlertCircle className="w-4 h-4" />}
              <span>
                {isValid && "In pareggio"}
                {isMancante && `Mancano ${fmtH(Math.abs(delta))}`}
                {isSforato && `Sforato di ${fmtH(Math.abs(delta))}`}
              </span>
            </div>
            <span>= {delta < 0 ? "−" : ""}{fmtH(Math.abs(delta))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}