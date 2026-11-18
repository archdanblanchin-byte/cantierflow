import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { conPiano, occupazione, fmt } from "@/lib/cronoCalc";
import CronoToolbar from "@/components/cronoprogramma/CronoToolbar";
import CronoGantt from "@/components/cronoprogramma/CronoGantt";
import CronoCalendario from "@/components/cronoprogramma/CronoCalendario";
import CronoLista from "@/components/cronoprogramma/CronoLista";
import CantiereFormDialog from "@/components/cronoprogramma/CantiereFormDialog";
import SupervisoriDialog from "@/components/cronoprogramma/SupervisoriDialog";
import LegendaSupervisori from "@/components/cronoprogramma/LegendaSupervisori";

function useMaxDip() {
  const [v, setV] = useState(() => Number(localStorage.getItem("crono_max_dip")) || 12);
  const set = (n) => { setV(n); localStorage.setItem("crono_max_dip", String(n)); };
  return [v, set];
}

export default function Cronoprogramma() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [vista, setVista] = useState("gantt");
  const [mesi, setMesi] = useState(3);
  const [maxDip, setMaxDip] = useMaxDip();
  const [form, setForm] = useState({ open: false, item: null, date: "" });
  const [supOpen, setSupOpen] = useState(false);

  const { data: grezzi = [], isLoading } = useQuery({
    queryKey: ["crono-cantieri"],
    queryFn: () => base44.entities.CronoCantiere.list("data_inizio", 1000),
  });
  const { data: supervisori = [] } = useQuery({
    queryKey: ["supervisori"],
    queryFn: () => base44.entities.Supervisore.list("nome", 200),
  });
  const da = fmt(addDays(startOfMonth(cursor), -7));
  const a = fmt(addDays(endOfMonth(cursor), 7));
  const { data: permessiRes } = useQuery({
    queryKey: ["crono-permessi", da, a],
    queryFn: () => base44.entities.PermessoGiorno.filter({ data: { $gte: da, $lte: a } }, "data", 500),
  });
  const permessi = Array.isArray(permessiRes) ? permessiRes : permessiRes?.items || [];

  // Un supervisore modificato aggiorna colore e nome del cantiere in tutte le viste
  const cantieri = useMemo(() => {
    const arricchiti = grezzi.map((c) => {
      const cap = supervisori.find((s) => s.id === c.capocantiere_id);
      const res = supervisori.find((s) => s.id === c.responsabile_id);
      return {
        ...c,
        capocantiere: cap?.nome || c.capocantiere,
        responsabile: res?.nome || c.responsabile,
        colore: cap?.colore || res?.colore || c.colore,
      };
    });
    return conPiano(arricchiti);
  }, [grezzi, supervisori]);
  const occ = useMemo(() => occupazione(cantieri), [cantieri]);
  const riepilogo = {
    totale: cantieri.length,
    inCorso: cantieri.filter((c) => c.stato === "in_corso").length,
    maltempo: cantieri.reduce((s, c) => s + (Number(c.giorni_maltempo) || 0), 0),
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["crono-cantieri"] });
  const onError = (e) => toast({ title: "Operazione non riuscita", description: e.message, variant: "destructive" });
  const chiudi = () => setForm({ open: false, item: null, date: "" });

  const salva = useMutation({
    mutationFn: (data) => {
      const { piano, id, created_date, updated_date, created_by_id, ...pulito } = data;
      return form.item ? base44.entities.CronoCantiere.update(form.item.id, pulito) : base44.entities.CronoCantiere.create(pulito);
    },
    onSuccess: () => { refresh(); chiudi(); toast({ title: "Cantiere salvato" }); },
    onError,
  });
  const elimina = useMutation({
    mutationFn: (id) => base44.entities.CronoCantiere.delete(id),
    onSuccess: refresh,
    onError,
  });
  const pioggia = useMutation({
    mutationFn: ({ c, delta }) => {
      const p = Math.max(0, (c.giorni_pioggia || 0) + delta);
      const m = Math.max(0, (c.giorni_maltempo || 0) + (p - (c.giorni_pioggia || 0)));
      return base44.entities.CronoCantiere.update(c.id, { giorni_pioggia: p, giorni_maltempo: m });
    },
    onSuccess: refresh,
    onError,
  });

  const modifica = (c) => setForm({ open: true, item: grezzi.find((g) => g.id === c.id) || c, date: "" });
  const nuovo = (date = "") => setForm({ open: true, item: null, date });
  const cancella = (c) => { if (window.confirm(`Eliminare il cantiere "${c.nome}"?`)) elimina.mutate(c.id); };
  const onPioggia = (c, delta) => pioggia.mutate({ c, delta });

  const gantProps = { cantieri, occ, maxDip, cursor, setCursor, mesi, setMesi, onEdit: modifica, onPioggia };

  return (
    <div className="min-h-screen bg-background pb-28 safe-area-top-pt">
      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        <CronoToolbar
          cursor={cursor} setCursor={setCursor} maxDip={maxDip} setMaxDip={setMaxDip}
          vista={vista} setVista={setVista} onNuovo={() => nuovo()} onStampa={() => window.print()} riepilogo={riepilogo}
        />
        <LegendaSupervisori supervisori={supervisori} />
        {isLoading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <>
            {vista === "gantt" && <CronoGantt {...gantProps} />}
            {vista === "calendario" && (
              <CronoCalendario cantieri={cantieri} occ={occ} maxDip={maxDip} cursor={cursor} permessi={permessi} onEdit={modifica} onNuovo={nuovo} />
            )}
            {vista === "lista" && <CronoLista cantieri={cantieri} onEdit={modifica} onDelete={cancella} onPioggia={onPioggia} />}
          </>
        )}
      </div>

      {/* Anteprima di stampa: solo il Gantt visibile, senza controlli */}
      {vista === "gantt" && (
        <div id="crono-print-area" className="hidden">
          <h1 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Cronoprogramma</h1>
          <CronoGantt {...gantProps} readOnly />
        </div>
      )}

      <CantiereFormDialog
        open={form.open} onClose={chiudi} initial={form.item} defaultDate={form.date}
        supervisori={supervisori} onSave={(d) => salva.mutate(d)} saving={salva.isPending} onManage={() => setSupOpen(true)}
      />
      <SupervisoriDialog open={supOpen} onClose={() => setSupOpen(false)} supervisori={supervisori} />
    </div>
  );
}