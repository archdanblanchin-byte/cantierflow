import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SheetSelect from "@/components/ui/sheet-select";
import { Plus, Package, AlertTriangle } from "lucide-react";

import RapportinoHeader from "@/components/rapportino/RapportinoHeader";
import QuickActions from "@/components/rapportino/QuickActions";
import SquadraCompatta from "@/components/rapportino/SquadraCompatta";
import RapportinoNav from "@/components/rapportino/RapportinoNav";
import FotoRapportino from "@/components/wizard/FotoRapportino";
import MezziSection from "@/components/wizard/MezziSection";
import Step3Lavorazioni from "@/components/wizard/Step3Lavorazioni";
import Step5Materiali from "@/components/wizard/Step5Materiali";
import Step6Riepilogo from "@/components/wizard/Step6Riepilogo";
import NewCantiereModal from "@/components/wizard/NewCantiereModal";

const ORDINE = ["squadra", "lavorazioni", "materiali", "riepilogo"];

// Una sola schermata verticale, compilabile progressivamente durante la giornata.
export default function RapportinoUnico({
  titolo,
  data,
  onChange,
  cantieri = [],
  onCantieriRefresh,
  collaboratoriList = [],
  tipiLavorazione = [],
  materialiBase = [],
  isAdmin = false,
  canEditCantiere = false,
  canEditDate = false,
  lastSaved,
  savingDraft,
  onSaveDraft,
  onSubmit,
  submitting,
  canSubmit,
  hint,
  onBack,
  banner,
}) {
  const [pannello, setPannello] = useState(null);
  const [cambiaCantiere, setCambiaCantiere] = useState(false);
  const [showNewCantiere, setShowNewCantiere] = useState(false);
  const [materialiVisibili, setMaterialiVisibili] = useState(false);
  const [active, setActive] = useState(0);
  const sezioni = useRef({});

  const cantiereSel = cantieri.find((c) => c.id === data.cantiere_id);

  // Sezione attiva: serve a Indietro/Avanti e a sapere dove siamo nella schermata
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 200;
      let idx = 0;
      ORDINE.forEach((k, i) => {
        const el = sezioni.current[k];
        if (el && el.getBoundingClientRect().top + window.scrollY <= y) idx = i;
      });
      setActive(idx);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const vai = (i) => {
    const idx = Math.min(Math.max(i, 0), ORDINE.length - 1);
    setActive(idx);
    sezioni.current[ORDINE[idx]]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const counts = {
    foto: (data.foto_annotate || []).length,
    nota: data.note_generali ? 1 : 0,
    mezzi:
      (data.piattaforma?.tipo ? 1 : 0) +
      (data.macchinari || []).length +
      (data.attrezzi || []).length,
  };

  const materialiAperti = materialiVisibili || (data.materiali || []).length > 0;

  return (
    <div className="min-h-screen bg-background">
      <RapportinoHeader
        titolo={titolo}
        cantiereNome={cantiereSel?.nome || data.cantiere_nome}
        cantiereIndirizzo={cantiereSel?.indirizzo}
        isAdmin={isAdmin}
        canEditDate={canEditDate}
        data={data}
        userEmail={data.user_email}
        onChange={onChange}
        onBack={onBack}
        canEditCantiere={canEditCantiere}
        onCambiaCantiere={() => setCambiaCantiere(true)}
        lastSaved={lastSaved}
      />

      <div className="max-w-2xl mx-auto px-4 py-4 pb-52 space-y-5">
        {banner}

        {/* Cantiere */}
        {(!data.cantiere_id || cambiaCantiere) && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cantiere *
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <SheetSelect
                  value={data.cantiere_id || ""}
                  onValueChange={(val) => {
                    const c = cantieri.find((x) => x.id === val);
                    onChange({ cantiere_id: val, cantiere_nome: c?.nome || "" });
                    setCambiaCantiere(false);
                  }}
                  options={cantieri
                    .filter((c) => (c.stato ? c.stato === "aperto" : c.attivo !== false) || c.id === data.cantiere_id)
                    .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "it"))
                    .map((c) => ({ value: c.id, label: c.nome }))}
                  placeholder="Seleziona cantiere..."
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => setShowNewCantiere(true)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {data.cantiere_id && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCambiaCantiere(false)}>
                Annulla
              </Button>
            )}
          </div>
        )}

        {/* Azioni rapide */}
        <QuickActions
          open={pannello}
          onToggle={(k) => setPannello((p) => (p === k ? null : k))}
          counts={counts}
        />

        {pannello === "foto" && (
          <div className="rounded-xl border border-border bg-card p-3">
            <FotoRapportino
              foto={data.foto_annotate || []}
              onChange={(v) => onChange({ foto_annotate: v })}
            />
          </div>
        )}

        {pannello === "nota" && (
          <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Nota della giornata
            </Label>
            <Textarea
              value={data.note_generali || ""}
              onChange={(e) => onChange({ note_generali: e.target.value })}
              placeholder="Note, osservazioni, comunicazioni... puoi aggiornarla più volte durante la giornata"
              className="min-h-[90px]"
            />
          </div>
        )}

        {pannello === "mezzi" && (
          <div className="rounded-xl border border-border bg-card p-3">
            <MezziSection data={data} onChange={onChange} />
          </div>
        )}

        {/* Squadra */}
        <section ref={(el) => { sezioni.current.squadra = el; }} className="scroll-mt-32 space-y-3">
          <SquadraCompatta
            data={data}
            onChange={onChange}
            collaboratoriList={collaboratoriList}
            canEdit={isAdmin}
          />
        </section>

        {/* Lavorazioni */}
        <section ref={(el) => { sezioni.current.lavorazioni = el; }} className="scroll-mt-32 space-y-3">
          <Step3Lavorazioni data={data} onChange={onChange} tipiLavorazione={tipiLavorazione} />
        </section>

        {/* Materiali — visibili solo se servono */}
        <section ref={(el) => { sezioni.current.materiali = el; }} className="scroll-mt-32 space-y-3">
          {materialiAperti ? (
            <Step5Materiali data={data} onChange={onChange} materialiBase={materialiBase} />
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 gap-2 border-dashed"
              onClick={() => setMaterialiVisibili(true)}
            >
              <Package className="w-4 h-4" />
              Aggiungi materiali utilizzati
            </Button>
          )}
        </section>

        {/* Riepilogo */}
        <section ref={(el) => { sezioni.current.riepilogo = el; }} className="scroll-mt-32 space-y-3">
          <Step6Riepilogo data={data} />
        </section>
      </div>

      <RapportinoNav
        onPrev={() => vai(active - 1)}
        onNext={() => vai(active + 1)}
        canPrev={active > 0}
        canNext={active < ORDINE.length - 1}
        onSave={onSaveDraft}
        saving={savingDraft}
        onSubmit={onSubmit}
        submitting={submitting}
        canSubmit={canSubmit}
        hint={hint}
      />

      <NewCantiereModal
        open={showNewCantiere}
        onClose={() => setShowNewCantiere(false)}
        onCreated={(c) => {
          onCantieriRefresh?.();
          onChange({ cantiere_id: c.id, cantiere_nome: c.nome });
          setCambiaCantiere(false);
        }}
      />
    </div>
  );
}