import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, AlertTriangle, CheckCircle2, Navigation } from "lucide-react";
import { format } from "date-fns";
import { STEP_CONFIG, getPosizione, distanzaM, distanzaKm } from "@/lib/timbratureUtils";

export default function TimbraturaRapidaPanel({ timbrature, cantiere, cantieri, user, onCantiereChange, onTimbrata }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const timbratureOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));
  const ultimoTimbro = timbratureOrd[timbratureOrd.length - 1];

  const ultimoIngresso = [...timbratureOrd].reverse().find(t => t.tipo_evento === "ingresso");
  const inCicloAperto = ultimoTimbro && ultimoTimbro.tipo_evento !== "uscita" && ultimoTimbro.tipo_evento !== "spostamento";
  const cantiereAttivo = inCicloAperto && ultimoIngresso
    ? (cantieri.find(c => c.id === ultimoIngresso.cantiere_id) || { id: ultimoIngresso.cantiere_id, nome: ultimoIngresso.cantiere_nome })
    : cantiere;

  // Determina i prossimi eventi possibili in base all'ultimo timbro
  const prossimiEventi = [];
  if (!ultimoTimbro) {
    prossimiEventi.push("ingresso");
  } else if (ultimoTimbro.tipo_evento === "ingresso") {
    prossimiEventi.push("pausa_inizio", "spostamento", "uscita");
  } else if (ultimoTimbro.tipo_evento === "pausa_inizio") {
    prossimiEventi.push("pausa_fine");
  } else if (ultimoTimbro.tipo_evento === "pausa_fine") {
    prossimiEventi.push("pausa_inizio", "spostamento", "uscita");
  } else if (ultimoTimbro.tipo_evento === "uscita" || ultimoTimbro.tipo_evento === "spostamento") {
    prossimiEventi.push("ingresso");
  }

  const richiedeCantiere = prossimiEventi.includes("ingresso") && !inCicloAperto;
  const inSpostamento = ultimoTimbro?.tipo_evento === "spostamento";

  const handleTimbra = async (tipoEvento) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (!user) throw new Error("Utente non autenticato");
      const pos = await getPosizione();

      if (tipoEvento === "spostamento") {
        // Spostamento: chiude il cantiere corrente (registra uscita) + apre spostamento
        const c = cantiereAttivo;
        if (!c) throw new Error("Nessun cantiere attivo da chiudere");
        const now = new Date().toISOString();

        // 1. Registra uscita del cantiere corrente
        let distanza = null;
        let inCantiere = true;
        if (c?.latitudine && c?.longitudine) {
          distanza = distanzaM(pos.lat, pos.lon, c.latitudine, c.longitudine);
          inCantiere = distanza <= (c.raggio_metri || 150);
        }
        await base44.entities.Timbratura.create({
          cantiere_id: c.id,
          cantiere_nome: c.nome,
          user_email: user.email,
          user_nome: user.full_name || "",
          tipo_evento: "uscita",
          data_ora: now,
          latitudine: pos.lat,
          longitudine: pos.lon,
          distanza_metri: distanza,
          in_cantiere: inCantiere,
        });

        // 2. Registra evento spostamento (inizio viaggio)
        await base44.entities.Timbratura.create({
          user_email: user.email,
          user_nome: user.full_name || "",
          tipo_evento: "spostamento",
          data_ora: now,
          latitudine: pos.lat,
          longitudine: pos.lon,
        });

        onTimbrata();
        setSuccessMsg(`Spostamento iniziato alle ${format(new Date(), "HH:mm")}`);
        return;
      }

      if (tipoEvento === "ingresso") {
        const c = inSpostamento ? cantiere : cantiereAttivo;
        const cSel = cantiere;
        if (!cSel) throw new Error("Seleziona un cantiere");
        const now = new Date().toISOString();

        let distanza = null;
        let inCantiere = true;
        if (cSel?.latitudine && cSel?.longitudine) {
          distanza = distanzaM(pos.lat, pos.lon, cSel.latitudine, cSel.longitudine);
          inCantiere = distanza <= (cSel.raggio_metri || 150);
        }

        // Se eravamo in spostamento, calcola i km e aggiorna l'evento spostamento
        if (inSpostamento && ultimoTimbro) {
          const km = distanzaKm(ultimoTimbro.latitudine, ultimoTimbro.longitudine, pos.lat, pos.lon);
          await base44.entities.Timbratura.update(ultimoTimbro.id, {
            km_spostamento: km,
            cantiere_destinazione_id: cSel.id,
            cantiere_destinazione_nome: cSel.nome,
          });
        }

        await base44.entities.Timbratura.create({
          cantiere_id: cSel.id,
          cantiere_nome: cSel.nome,
          user_email: user.email,
          user_nome: user.full_name || "",
          tipo_evento: "ingresso",
          data_ora: now,
          latitudine: pos.lat,
          longitudine: pos.lon,
          distanza_metri: distanza,
          in_cantiere: inCantiere,
        });

        onTimbrata();
        setSuccessMsg(`Ingresso registrato alle ${format(new Date(), "HH:mm")}`);
        return;
      }

      // Eventi normali (pausa_inizio, pausa_fine, uscita)
      const c = cantiereAttivo;
      if (!c) throw new Error("Seleziona un cantiere");
      let distanza = null;
      let inCantiere = true;
      if (c?.latitudine && c?.longitudine) {
        distanza = distanzaM(pos.lat, pos.lon, c.latitudine, c.longitudine);
        inCantiere = distanza <= (c.raggio_metri || 150);
      }

      await base44.entities.Timbratura.create({
        cantiere_id: c.id,
        cantiere_nome: c.nome,
        user_email: user.email,
        user_nome: user.full_name || "",
        tipo_evento: tipoEvento,
        data_ora: new Date().toISOString(),
        latitudine: pos.lat,
        longitudine: pos.lon,
        distanza_metri: distanza,
        in_cantiere: inCantiere,
      });

      onTimbrata();
      setSuccessMsg(`${STEP_CONFIG[tipoEvento].label} registrata alle ${format(new Date(), "HH:mm")}`);
      if (tipoEvento === "uscita") onCantiereChange("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {inSpostamento && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 border border-orange-300">
          <Navigation className="w-4 h-4 text-orange-600 flex-shrink-0 animate-pulse" />
          <div className="text-sm">
            <p className="font-medium text-orange-900">In spostamento</p>
            <p className="text-xs text-orange-700">Seleziona il cantiere di destinazione e registra l'ingresso</p>
          </div>
        </div>
      )}

      {richiedeCantiere && (
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere</Label>
          <Select value={cantiere?.id || ""} onValueChange={onCantiereChange}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Seleziona cantiere..." />
            </SelectTrigger>
            <SelectContent>
              {cantieri.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {!richiedeCantiere && cantiereAttivo && !inSpostamento && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium">{cantiereAttivo.nome}</span>
        </div>
      )}

      <div className="space-y-2">
        {prossimiEventi.map(tipo => {
          const cfg = STEP_CONFIG[tipo];
          const Icon = cfg.icon;
          return (
            <Button
              key={tipo}
              onClick={() => handleTimbra(tipo)}
              disabled={loading || (richiedeCantiere && !cantiere)}
              className={`w-full h-14 text-base font-semibold gap-2 ${cfg.color}`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
              {cfg.label}
            </Button>
          );
        })}
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Registra automaticamente orario e posizione GPS
      </p>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-xs text-emerald-700">{successMsg}</p>
        </div>
      )}
    </div>
  );
}