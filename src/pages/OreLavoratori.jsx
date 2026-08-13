import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Users, Route, CalendarDays, Navigation } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { it } from "date-fns/locale";
import { fmtOre } from "@/lib/timbratureUtils";
import { buildDettaglioGiorno, calcolaSpostamenti } from "@/lib/oreLavoratoriUtils";
import CalendarioMese from "@/components/orelavoratori/CalendarioMese";
import GiornoDetailDialog from "@/components/orelavoratori/GiornoDetailDialog";

export default function OreLavoratori() {
  const navigate = useNavigate();
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [mese, setMese] = useState(startOfMonth(new Date()));
  const [giornoKey, setGiornoKey] = useState(null);

  const { data: collaboratori = [], isLoading: loadingCollab } = useQuery({
    queryKey: ["collaboratori-all"],
    queryFn: () => base44.entities.Collaboratore.list(),
  });

  const { data: rapportini = [] } = useQuery({
    queryKey: ["rapportini-all"],
    queryFn: () => base44.entities.Rapportino.list("-data", 2000),
  });

  const email = selectedCollab?.user_email || null;

  // Range mensile per le timbrature (data_ora)
  const inizioISO = startOfMonth(mese).toISOString();
  const fineISO = endOfMonth(mese).toISOString();
  const inizioStr = format(startOfMonth(mese), "yyyy-MM-dd");
  const fineStr = format(endOfMonth(mese), "yyyy-MM-dd");

  // Tutte le timbrature del mese (match in JS per email O nome)
  const { data: timbrature = [], isLoading: loadingTimb } = useQuery({
    queryKey: ["timbrature-mese", inizioISO, fineISO],
    queryFn: () =>
      base44.entities.Timbratura.filter(
        { data_ora: { $gte: inizioISO, $lt: fineISO } },
        "-data_ora",
        5000
      ),
    enabled: !!selectedCollab,
  });

  // Tutte le trasferte del mese
  const { data: trasferte = [] } = useQuery({
    queryKey: ["trasferte-mese", inizioStr, fineStr],
    queryFn: () =>
      base44.entities.Trasferta.filter(
        { data: { $gte: inizioStr, $lte: fineStr } },
        "-data",
        2000
      ),
    enabled: !!selectedCollab,
  });

  // Match collaboratore <-> timbratura/trasferta (per email O per nome denormalizzato)
  const matchCollab = (record) => {
    if (!selectedCollab) return false;
    if (email && record.user_email === email) return true;
    if (record.user_nome && selectedCollab.nome && record.user_nome === selectedCollab.nome) return true;
    return false;
  };

  // Voci per giorno dai rapportini (ore cantieri + note imprevisti)
  const vociGiornoMap = useMemo(() => {
    if (!selectedCollab) return {};
    const map = {};
    const inizio = startOfMonth(mese);
    const fine = endOfMonth(mese);
    rapportini.forEach((r) => {
      const d = new Date(r.data);
      if (d < inizio || d > fine) return;
      const key = format(d, "yyyy-MM-dd");
      (r.collaboratori || []).forEach((c) => {
        const match = c.collaboratore_id === selectedCollab.id ||
          (c.nome && selectedCollab.nome && c.nome === selectedCollab.nome);
        if (!match) return;
        if (!map[key]) map[key] = [];
        map[key].push({
          cantiere: r.cantiere_nome,
          ore: c.ore_lavorate || 0,
          stato: r.stato,
          rapportino_id: r.id,
          note_imprevisti: c.note_imprevisti || "",
        });
      });
    });
    return map;
  }, [rapportini, selectedCollab, mese]);

  // Timbrature per giorno del collaboratore (match email O nome)
  const timbGiornoMap = useMemo(() => {
    const map = {};
    timbrature.forEach((t) => {
      if (!matchCollab(t)) return;
      const key = format(new Date(t.data_ora), "yyyy-MM-dd");
      (map[key] = map[key] || []).push(t);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timbrature, selectedCollab, email, mese]);

  // Trasferte per giorno del collaboratore (match email O nome)
  const trasferteMap = useMemo(() => {
    const map = {};
    trasferte.forEach((t) => {
      if (!matchCollab(t)) return;
      if (!t.data) return;
      const key = format(new Date(t.data + "T00:00:00"), "yyyy-MM-dd");
      map[key] = {
        fascia: t.tipo_trasferta,
        km: t.km_totali,
        km_andata: t.km_andata,
        km_ritorno: t.km_ritorno,
        primo_cantiere_nome: t.primo_cantiere_nome,
        ultimo_cantiere_nome: t.ultimo_cantiere_nome,
        mezzo_proprio: t.mezzo_proprio,
      };
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trasferte, selectedCollab, email, mese]);

  // Sintesi calendario: { [key]: { ore, oreSpost, trasferta } }
  const giorniSintesi = useMemo(() => {
    const sintesi = {};
    const keys = new Set([...Object.keys(vociGiornoMap), ...Object.keys(timbGiornoMap), ...Object.keys(trasferteMap)]);
    keys.forEach((key) => {
      const voci = vociGiornoMap[key] || [];
      const oreCantieri = voci.reduce((s, v) => s + (v.ore || 0), 0);
      const spost = timbGiornoMap[key] ? calcolaSpostamenti(timbGiornoMap[key]) : [];
      const oreSpost = spost.reduce((s, sp) => s + sp.durata, 0);
      const ore = Math.round((oreCantieri + oreSpost) * 4) / 4;
      sintesi[key] = { ore, oreSpost: Math.round(oreSpost * 4) / 4, trasferta: trasferteMap[key] || null };
    });
    return sintesi;
  }, [vociGiornoMap, timbGiornoMap, trasferteMap]);

  // Totali mese
  const { totaleOreCantieri, totaleOreSpost, totaleKmMese, giorniLavoratiMese } = useMemo(() => {
    let cantieri = 0, spost = 0, km = 0, lavorati = 0;
    Object.values(giorniSintesi).forEach((s) => {
      if (s.ore > 0) lavorati++;
      cantieri += s.ore - (s.oreSpost || 0);
      spost += s.oreSpost || 0;
      if (s.trasferta?.km != null) km += s.trasferta.km;
    });
    return {
      totaleOreCantieri: Math.round(cantieri * 4) / 4,
      totaleOreSpost: Math.round(spost * 4) / 4,
      totaleKmMese: km,
      giorniLavoratiMese: lavorati,
    };
  }, [giorniSintesi]);

  const giornoSelezionato = giornoKey ? new Date(giornoKey + "T00:00:00") : null;
  const dettaglioGiorno = giornoKey
    ? buildDettaglioGiorno(vociGiornoMap[giornoKey] || [], timbGiornoMap[giornoKey] || [])
    : null;
  const trasfertaGiorno = giornoKey ? trasferteMap[giornoKey] : null;

  const prevMese = () => setMese((m) => startOfMonth(addMonths(m, -1)));
  const nextMese = () => setMese((m) => startOfMonth(addMonths(m, 1)));

  if (selectedCollab) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedCollab(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{selectedCollab.nome}</h1>
              <p className="text-xs text-muted-foreground">
                {selectedCollab.ruolo ? `${selectedCollab.ruolo} · ` : ""}
                {email ? "Timbrature + rapportini" : "Abbinato per nome (no email)"}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevMese}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <p className="font-semibold capitalize">{format(mese, "MMMM yyyy", { locale: it })}</p>
            <Button variant="outline" size="icon" onClick={nextMese}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 text-center">
              <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold text-primary">{fmtOre(totaleOreCantieri)}</p>
              <p className="text-[10px] text-muted-foreground">Ore cantieri</p>
            </Card>
            <Card className="p-3 text-center">
              <Navigation className="w-4 h-4 text-orange-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-orange-600">{fmtOre(totaleOreSpost)}</p>
              <p className="text-[10px] text-muted-foreground">Ore spostamenti</p>
            </Card>
            <Card className="p-3 text-center">
              <CalendarDays className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold">{giorniLavoratiMese}</p>
              <p className="text-[10px] text-muted-foreground">Giorni lavorati</p>
            </Card>
            <Card className="p-3 text-center">
              <Route className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold">{totaleKmMese.toFixed(0)} km</p>
              <p className="text-[10px] text-muted-foreground">Km trasferte</p>
            </Card>
          </div>

          <Card className="p-3">
            <CalendarioMese
              mese={mese}
              giorniSintesi={giorniSintesi}
              onGiornoClick={(key) => setGiornoKey(key)}
            />
          </Card>
          <p className="text-[11px] text-muted-foreground text-center">
            Tocca un giorno con dati per vedere cantieri, spostamenti, trasferta e note
          </p>
        </div>

        <GiornoDetailDialog
          open={!!giornoKey}
          onOpenChange={(v) => !v && setGiornoKey(null)}
          data={giornoSelezionato}
          dettaglio={dettaglioGiorno}
          trasferta={trasfertaGiorno}
          collaboratoreNome={selectedCollab.nome}
        />

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-lg">Ore Lavoratori</h1>
            <p className="text-xs text-muted-foreground">Tocca un collaboratore per il calendario ore e trasferte</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{collaboratori.length}</p>
            <p className="text-[10px] text-muted-foreground">Collaboratori</p>
          </Card>
          <Card className="p-3 text-center">
            <CalendarDays className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold capitalize">{format(new Date(), "MMM", { locale: it })}</p>
            <p className="text-[10px] text-muted-foreground">Mese corrente</p>
          </Card>
        </div>

        <div className="space-y-2">
          {loadingCollab ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
          ) : collaboratori.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nessun collaboratore in anagrafe</p>
          ) : (
            collaboratori.map((c) => (
              <Card key={c.id} className="overflow-hidden">
                <button
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-accent/40 transition-colors"
                  onClick={() => {
                    setSelectedCollab(c);
                    setMese(startOfMonth(new Date()));
                    setGiornoKey(null);
                  }}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                    {c.nome?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.ruolo ? `${c.ruolo} · ` : ""}
                      {c.user_email ? "con timbrature" : "abbinato per nome"}
                    </p>
                  </div>
                  {!c.attivo && <Badge variant="outline" className="text-[10px]">inattivo</Badge>}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}