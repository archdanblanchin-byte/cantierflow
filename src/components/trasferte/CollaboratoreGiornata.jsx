import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import AdminTimbraturaList from "@/components/timbrature/AdminTimbraturaList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MapPin, Navigation, Clock, Save, CheckCircle2, Car, AlertTriangle, Settings, ChevronDown } from "lucide-react";
import {
  STEP_CONFIG, arrotondaQuarti, fmtOre, distanzaKm,
  CAPANNONE, classificaTrasfertaConfig, getCapannone, TRASFERTA_CONFIG,
} from "@/lib/timbratureUtils";

export default function CollaboratoreGiornata({ email, nome, trackingPosizione, timbrature, cantieri, data, trasfertaEsistente, config, onSalvata, editable, onTimbraturaCambiata }) {
  const capannone = getCapannone(config);
  const [editKmAndata, setEditKmAndata] = useState("");
  const [editKmRitorno, setEditKmRitorno] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [mezzoProprio, setMezzoProprio] = useState(false);
  const [note, setNote] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confermata, setConfermata] = useState(trasfertaEsistente?.confermata || false);

  const tOrd = (timbrature || []).slice().sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

  // Calcolo ore per cantiere
  const perCantiere = {};
  const spostamenti = [];
  tOrd.forEach(t => {
    if (t.tipo_evento === "spostamento") {
      spostamenti.push(t);
    } else if (t.cantiere_id) {
      if (!perCantiere[t.cantiere_id]) perCantiere[t.cantiere_id] = { nome: t.cantiere_nome, timbri: [], ingresso: null, uscita: null };
      perCantiere[t.cantiere_id].timbri.push(t);
      if (t.tipo_evento === "ingresso") perCantiere[t.cantiere_id].ingresso = t;
      if (t.tipo_evento === "uscita") perCantiere[t.cantiere_id].uscita = t;
    }
  });

  const gruppi = Object.entries(perCantiere).map(([id, g]) => {
    let ore = 0;
    if (g.ingresso && g.uscita) {
      let tot = new Date(g.uscita.data_ora) - new Date(g.ingresso.data_ora);
      const pIn = g.timbri.filter(t => t.tipo_evento === "pausa_inizio");
      const pOut = g.timbri.filter(t => t.tipo_evento === "pausa_fine");
      const n = Math.min(pIn.length, pOut.length);
      for (let i = 0; i < n; i++) tot -= new Date(pOut[i].data_ora) - new Date(pIn[i].data_ora);
      ore = arrotondaQuarti(tot);
    }
    return { id, ...g, ore, coords: cantieri.find(c => c.id === id) };
  });

  const oreTotali = gruppi.reduce((s, g) => s + g.ore, 0);
  const kmSpostamenti = spostamenti.reduce((s, t) => s + (t.km_spostamento || 0), 0);

  // Calcolo trasferta: primo e ultimo cantiere
  const cantieriConIngresso = tOrd.filter(t => t.tipo_evento === "ingresso");
  const primoIngresso = cantieriConIngresso[0];
  const ultimoIngresso = cantieriConIngresso[cantieriConIngresso.length - 1];

  const primoCantiere = primoIngresso ? cantieri.find(c => c.id === primoIngresso.cantiere_id) : null;
  const ultimoCantiere = ultimoIngresso ? cantieri.find(c => c.id === ultimoIngresso.cantiere_id) : null;

  const kmAndataCalc = primoCantiere?.latitudine
    ? distanzaKm(capannone.lat, capannone.lon, primoCantiere.latitudine, primoCantiere.longitudine)
    : null;
  const kmRitornoCalc = ultimoCantiere?.latitudine
    ? distanzaKm(ultimoCantiere.latitudine, ultimoCantiere.longitudine, capannone.lat, capannone.lon)
    : null;

  const kmMediaCalc = (kmAndataCalc != null && kmRitornoCalc != null)
    ? (kmAndataCalc + kmRitornoCalc) / 2
    : null;
  const tipoCalc = classificaTrasfertaConfig(kmMediaCalc, config);

  // Valori usati per il salvataggio (se l'admin modifica, usa quelli, altrimenti i calcolati)
  const kmAndata = editKmAndata !== "" ? parseFloat(editKmAndata) : kmAndataCalc;
  const kmRitorno = editKmRitorno !== "" ? parseFloat(editKmRitorno) : kmRitornoCalc;
  const tipoFinale = editTipo || (trasfertaEsistente?.tipo_trasferta) || tipoCalc;
  const kmTotali = (kmAndata || 0) + (kmRitorno || 0);

  const salvaTrasferta = async () => {
    setSalvando(true);
    try {
      const payload = {
        data,
        user_email: email,
        user_nome: nome,
        primo_cantiere_id: primoIngresso?.cantiere_id || null,
        primo_cantiere_nome: primoIngresso?.cantiere_nome || null,
        ultimo_cantiere_id: ultimoIngresso?.cantiere_id || null,
        ultimo_cantiere_nome: ultimoIngresso?.cantiere_nome || null,
        km_andata: kmAndata != null ? kmAndata : null,
        km_ritorno: kmRitorno != null ? kmRitorno : null,
        km_totali: kmTotali || null,
        tipo_trasferta: tipoFinale || null,
        mezzo_proprio: mezzoProprio,
        note,
        confermata: true,
      };

      if (trasfertaEsistente?.id) {
        await base44.entities.Trasferta.update(trasfertaEsistente.id, payload);
      } else {
        await base44.entities.Trasferta.create(payload);
      }
      setConfermata(true);
      onSalvata();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      {/* Header collaboratore */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            {nome.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm">{nome}</p>
            {trackingPosizione && (
              <Badge variant="outline" className="text-[9px] gap-1">
                <Car className="w-2.5 h-2.5" /> Tracking GPS
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary">{fmtOre(oreTotali)}</p>
          <p className="text-[10px] text-muted-foreground">{gruppi.length} cantiere/i</p>
        </div>
      </div>

      {/* Cantieri */}
      <div className="space-y-2">
        {gruppi.map((g, i) => (
          <div key={g.id} className="flex items-center gap-2 text-sm">
            <span className="text-[10px] font-bold text-muted-foreground w-5">{i + 1}.</span>
            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="flex-1 font-medium truncate">{g.nome}</span>
            <span className="text-muted-foreground">{fmtOre(g.ore)}</span>
            {g.timbri.some((t) => t.in_cantiere === false) && (
              <Badge variant="destructive" className="text-[9px] gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Fuori</Badge>
            )}
            {g.ingresso && !g.uscita && <Badge variant="secondary" className="text-[9px]">In corso</Badge>}
          </div>
        ))}
      </div>

      {/* Spostamenti */}
      {spostamenti.length > 0 && (
        <div className="rounded-lg bg-orange-50/50 border border-orange-200 p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-orange-900">
            <Navigation className="w-3.5 h-3.5" />
            Spostamenti: {spostamenti.length} • {kmSpostamenti.toFixed(1)} km totali
          </div>
          {spostamenti.map((s, i) => (
            <div key={s.id} className="flex items-center justify-between text-[11px] text-muted-foreground pl-5">
              <span>→ {s.cantiere_destinazione_nome || "In corso"}</span>
              <span>{s.km_spostamento != null ? `${s.km_spostamento} km` : "—"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Trasferta */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Trasferta</span>
          </div>
          {confermata && (
            <Badge className="gap-1 bg-emerald-600">
              <CheckCircle2 className="w-3 h-3" /> Confermata
            </Badge>
          )}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Sede: {capannone.nome}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Km andata (→ primo)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder={kmAndataCalc != null ? kmAndataCalc.toString() : "—"}
              value={editKmAndata}
              onChange={(e) => setEditKmAndata(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Km ritorno (ultimo →)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder={kmRitornoCalc != null ? kmRitornoCalc.toString() : "—"}
              value={editKmRitorno}
              onChange={(e) => setEditKmRitorno(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-muted-foreground flex-shrink-0">Tipo</Label>
          <Select value={tipoFinale || ""} onValueChange={setEditTipo}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder={tipoCalc || "Seleziona..."} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="T0">T0 - Locale</SelectItem>
              <SelectItem value="T1">T1 - Media</SelectItem>
              <SelectItem value="T2">T2 - Lunga</SelectItem>
            </SelectContent>
          </Select>
          {tipoFinale && (
            <Badge className={`border ${TRASFERTA_CONFIG[tipoFinale]?.color || ""}`}>
              {TRASFERTA_CONFIG[tipoFinale]?.label}
            </Badge>
          )}
        </div>

        {kmMediaCalc != null && (
          <p className="text-[10px] text-muted-foreground">
            Media km: {kmMediaCalc.toFixed(1)} → proposta: <strong>{tipoCalc}</strong>
          </p>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id={`mezzo-${email}`}
            checked={mezzoProprio}
            onCheckedChange={setMezzoProprio}
          />
          <Label htmlFor={`mezzo-${email}`} className="text-xs">Mezzo proprio</Label>
        </div>

        <Input
          placeholder="Note..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-8 text-xs"
        />

        <Button onClick={salvaTrasferta} disabled={salvando} size="sm" className="w-full gap-2">
          <Save className="w-3.5 h-3.5" />
          {salvando ? "Salvataggio..." : "Conferma trasferta"}
        </Button>
      </div>

      {editable && (
        <Collapsible className="rounded-lg border">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Gestione timbrature (admin)</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="p-2 pt-0">
            <AdminTimbraturaList timbrature={tOrd} cantieri={cantieri} onCambiata={onTimbraturaCambiata} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}