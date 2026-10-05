import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isToday } from "date-fns";

import RapportinoUnico from "@/components/rapportino/RapportinoUnico";
import { computePartecipantiEmail } from "@/lib/rapportinoPartecipanti";
import { fmtOre } from "@/lib/timbratureUtils";

export default function EditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load() {
      const user = await base44.auth.me();
      setIsAdmin(user?.role === "admin");
      const results = await base44.entities.Rapportino.filter({ id });
      const report = results[0];
      if (!report) { navigate("/"); return; }
      // Controllo sicurezza: solo l'autore (entro la giornata) oppure un admin
      const admin = user?.role === "admin";
      if (!admin && (report.user_email !== user?.email || !isToday(new Date(report.data)))) {
        toast.error("Non puoi modificare questo rapportino");
        navigate(`/report/${id}`);
        return;
      }
      setFormData(report);
      setLoading(false);
    }
    load();
  }, [id]);

  const { data: cantieri = [], refetch: refetchCantieri } = useQuery({
    queryKey: ["cantieri"],
    queryFn: () => base44.entities.Cantiere.list(),
  });
  const { data: collaboratoriList = [] } = useQuery({
    queryKey: ["collaboratori"],
    queryFn: () => base44.entities.Collaboratore.list(),
  });
  const { data: tipiLavorazione = [] } = useQuery({
    queryKey: ["tipiLavorazione"],
    queryFn: () => base44.entities.TipoLavorazione.list(),
  });
  const { data: materialiBase = [] } = useQuery({
    queryKey: ["materialiBase"],
    queryFn: () => base44.entities.MaterialeBase.list(),
  });

  const updateForm = (updates) => setFormData((prev) => ({ ...prev, ...updates }));

  // Mantiene aggiornata la lista email dei partecipanti (autore + collaboratori)
  useEffect(() => {
    if (!formData) return;
    const pe = computePartecipantiEmail(formData, collaboratoriList, formData.user_email);
    setFormData((prev) => {
      if (!prev) return prev;
      if (JSON.stringify(prev.partecipanti_email || []) === JSON.stringify(pe)) return prev;
      return { ...prev, partecipanti_email: pe };
    });
  }, [formData?.collaboratori, formData?.user_email, collaboratoriList]);

  // Salva senza inviare: il rapportino resta aperto e modificabile durante la giornata
  const salvaBozza = async () => {
    if (!formData) return;
    setSavingDraft(true);
    try {
      const stato = formData.stato === "inviato" ? "inviato" : "bozza";
      await base44.entities.Rapportino.update(id, { ...formData, stato });
      queryClient.invalidateQueries({ queryKey: ["rapportini"] });
      setLastSaved(new Date());
      toast.success("Rapportino salvato: puoi riprenderlo più tardi");
    } catch (err) {
      toast.error("Errore nel salvataggio: " + (err?.message || "riprova"));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await base44.entities.Rapportino.update(id, { ...formData, stato: "inviato" });
      queryClient.invalidateQueries({ queryKey: ["rapportini"] });
      toast.success("Rapportino aggiornato!");
      setSubmitting(false);
      navigate(`/report/${id}`);
    } catch (err) {
      toast.error("Errore nell'invio del rapportino: " + (err?.message || "riprova"));
      setSubmitting(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const oreLavoratori = (formData.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0) || (formData.ore_totali_squadra || 0);
  const oreExtra = formData.has_lavorazioni_extra ? (formData.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0) : 0;
  const oreNormali = (formData.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
  const delta = oreLavoratori - oreExtra - oreNormali;
  const bilanciato = Math.abs(delta) < 0.01;
  const hint = !formData.cantiere_id
    ? "Seleziona il cantiere per compilare il rapportino"
    : !bilanciato
      ? delta > 0
        ? `Ore non in pareggio: mancano ${fmtOre(delta)} da assegnare alle lavorazioni`
        : `Ore non in pareggio: hai sforato di ${fmtOre(Math.abs(delta))}`
      : null;

  return (
    <RapportinoUnico
      titolo={formData.stato === "bozza" ? "Compila rapportino" : "Modifica rapportino"}
      data={formData}
      onChange={updateForm}
      cantieri={cantieri}
      onCantieriRefresh={refetchCantieri}
      collaboratoriList={collaboratoriList}
      tipiLavorazione={tipiLavorazione}
      materialiBase={materialiBase}
      isAdmin={isAdmin}
      canEditCantiere={isAdmin}
      canEditDate={isAdmin}
      lastSaved={lastSaved}
      savingDraft={savingDraft}
      onSaveDraft={salvaBozza}
      onSubmit={handleSubmit}
      submitting={submitting}
      canSubmit={bilanciato}
      hint={hint}
      onBack={() => navigate(`/report/${id}`)}
    />
  );
}