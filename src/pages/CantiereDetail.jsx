import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, MapPin, Pencil, FileText, Shield, Truck, Calculator, Camera,
  Pause, Play, CheckCircle2,
} from "lucide-react";
import FotoCard from "@/components/foto/FotoCard";
import ReportPDFButton, { ReportPDFContent } from "@/components/ReportPDF";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const STATO_BADGE = {
  aperto: { label: "Aperto", className: "bg-primary text-primary-foreground" },
  sospeso: { label: "Sospeso", className: "bg-amber-100 text-amber-700 border border-amber-200" },
  chiuso: { label: "Chiuso", className: "bg-muted text-muted-foreground" },
};

function statoOf(c) {
  if (c?.stato) return c.stato;
  return c?.attivo === false ? "chiuso" : "aperto";
}

function StatCard({ label, value, sub, color = "text-foreground" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function CantiereDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const ruolo = user?.role === "user" ? "collaboratore" : user?.role;
  const canManage = ruolo === "admin" || ruolo === "responsabile_tecnico";
  const qc = useQueryClient();
  const [cantiere, setCantiere] = useState(null);
  const [loading, setLoading] = useState(true);

  const { data: rapportini = [] } = useQuery({
    queryKey: ["rapportini_cantiere", id],
    queryFn: () => base44.entities.Rapportino.filter({ cantiere_id: id }),
    enabled: !!id,
  });

  const { data: fotoCantiere = [] } = useQuery({
    queryKey: ["foto_cantiere", id],
    queryFn: () => base44.entities.Foto.filter({ cantiere_id: id }),
    enabled: !!id,
  });

  const { data: trasferte = [] } = useQuery({
    queryKey: ["trasferte_cantiere", id],
    queryFn: async () => {
      const all = await base44.entities.Trasferta.list();
      return all.filter((t) => t.primo_cantiere_id === id || t.ultimo_cantiere_id === id);
    },
    enabled: !!id,
  });

  const { data: timbrature = [] } = useQuery({
    queryKey: ["timbrature_cantiere", id],
    queryFn: () => base44.entities.Timbratura.filter({ cantiere_id: id }),
    enabled: !!id,
  });

  useEffect(() => {
    base44.entities.Cantiere.filter({ id }).then((res) => {
      setCantiere(res[0] || null);
      setLoading(false);
    });
  }, [id]);

  const cambiaStato = async (nuovo) => {
    try {
      const payload = {
        stato: nuovo,
        attivo: nuovo === "aperto",
        data_chiusura: nuovo === "chiuso" ? (cantiere.data_chiusura || new Date().toISOString().slice(0, 10)) : cantiere.data_chiusura,
      };
      await base44.entities.Cantiere.update(id, payload);
      setCantiere((prev) => ({ ...prev, ...payload }));
      qc.invalidateQueries({ queryKey: ["cantieri"] });
      toast.success(`Stato aggiornato: ${STATO_BADGE[nuovo].label}`);
    } catch (e) {
      toast.error("Errore: " + (e?.message || e));
    }
  };

  const spostamenti = (timbrature || []).filter((t) => t.tipo_evento === "spostamento");

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );

  if (!cantiere) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Cantiere non trovato</p>
      <Button variant="ghost" onClick={() => navigate("/cantieri")} className="mt-4">Torna alla lista</Button>
    </div>
  );

  // Calcoli automatici dai rapportini
  const oreTotali = rapportini.reduce((sum, r) => {
    const oreCollab = (r.collaboratori || []).reduce((s, c) => s + (c.ore_lavorate || 0), 0);
    return sum + (oreCollab || r.ore_totali_squadra || 0);
  }, 0);

  const oreExtra = rapportini.reduce((sum, r) => {
    if (!r.has_lavorazioni_extra) return sum;
    return sum + (r.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0);
  }, 0);

  const oreNormali = rapportini.reduce((sum, r) => {
    return sum + (r.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
  }, 0);

  const orePiattaforma = rapportini.reduce((sum, r) => sum + (r.ore_utilizzo_piattaforma || 0), 0);
  const oreMezzi = rapportini.reduce((sum, r) => sum + (r.ore_noleggio_mezzi || 0), 0);
  const oreAttrezzi = rapportini.reduce((sum, r) => sum + (r.ore_noleggio_plexi || 0), 0);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((cantiere.indirizzo || "") + " " + (cantiere.citta || ""))}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border sticky top-0 z-10 safe-area-top-pt">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cantieri")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">{cantiere.nome}</h1>
              <p className="text-xs text-muted-foreground">{cantiere.citta}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <ReportPDFButton cantiere={cantiere} rapportini={rapportini} foto={fotoCantiere} trasferte={trasferte} spostamenti={spostamenti} />
            )}
            <Link to={`/cantieri/${id}/modifica`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Pencil className="w-3.5 h-3.5" /> Modifica
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Info base */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] uppercase ${STATO_BADGE[statoOf(cantiere)].className}`}>
              {STATO_BADGE[statoOf(cantiere)].label}
            </Badge>
            {cantiere.anno && <Badge variant="outline" className="text-[10px]">{cantiere.anno}</Badge>}
            {cantiere.codice && <span className="text-xs font-mono text-muted-foreground">{cantiere.codice}</span>}
            {cantiere.data_chiusura && <span className="text-xs text-muted-foreground">Chiuso il {format(new Date(cantiere.data_chiusura), "d MMM yyyy", { locale: it })}</span>}
          </div>
          {cantiere.cliente && <p className="text-sm text-muted-foreground">Cliente: <span className="font-medium text-foreground">{cantiere.cliente}</span></p>}
          {(cantiere.indirizzo || cantiere.citta) && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
              <MapPin className="w-4 h-4" />
              {cantiere.indirizzo}{cantiere.indirizzo && cantiere.citta ? ", " : ""}{cantiere.citta}
            </a>
          )}

          {/* Gestione stato (solo admin/responsabile) */}
          {canManage && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              {statoOf(cantiere) !== "aperto" && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => cambiaStato("aperto")}>
                  <Play className="w-3.5 h-3.5" /> Riapri
                </Button>
              )}
              {statoOf(cantiere) !== "sospeso" && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => cambiaStato("sospeso")}>
                  <Pause className="w-3.5 h-3.5" /> Sospendi
                </Button>
              )}
              {statoOf(cantiere) !== "chiuso" && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => cambiaStato("chiuso")}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Chiudi cantiere
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Statistiche ore */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5" /> Ore Lavorate (dai rapportini)
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Totale ore" value={`${oreTotali.toFixed(1)}h`} sub={cantiere.ore_stimate ? `/ ${cantiere.ore_stimate}h stimate` : ""} color="text-primary" />
            <StatCard label="Ore normali" value={`${oreNormali.toFixed(1)}h`} />
            <StatCard label="Ore extra" value={`${oreExtra.toFixed(1)}h`} color="text-amber-600" />
          </div>
        </div>

        {/* Mezzi */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" /> Mezzi e Attrezzature
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Piattaforma" value={`${orePiattaforma.toFixed(1)}h`} />
            <StatCard label="Noleggio mezzi" value={`${oreMezzi.toFixed(1)}h`} />
            <StatCard label="Noleggio attrezzi" value={`${oreAttrezzi.toFixed(1)}h`} />
          </div>
        </div>

        {/* Rapportini collegati */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" /> Rapportini ({rapportini.length})
          </h2>
          {rapportini.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nessun rapportino collegato</p>
          ) : (
            <div className="space-y-2">
              {rapportini.map((r) => (
                <Link key={r.id} to={`/report/${r.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 hover:border-primary/20 transition-colors">
                  <div className="text-sm">
                    <p className="font-medium">{r.data ? format(new Date(r.data), "d MMM yyyy", { locale: it }) : "—"}</p>
                    <p className="text-xs text-muted-foreground">{(r.collaboratori || []).length} collaboratori</p>
                  </div>
                  <Badge variant={r.stato === "inviato" ? "default" : "secondary"} className="text-[10px] uppercase">
                    {r.stato === "inviato" ? "Inviato" : "Bozza"}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Foto cantiere (dall'entità Foto) */}
        {fotoCantiere.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" /> Foto e Colori ({fotoCantiere.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {fotoCantiere.map((f) => (
                <FotoCard key={f.id} foto={f} />
              ))}
            </div>
          </div>
        )}

        {/* Foto strutturali cantiere */}
        {(cantiere.foto_cantiere || []).length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Foto Cantiere (strutturali)</h2>
            <div className="flex flex-wrap gap-2">
              {cantiere.foto_cantiere.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Sicurezza */}
        {((cantiere.foto_estintore || []).length > 0 || (cantiere.foto_pronto_soccorso || []).length > 0) && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Sicurezza
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {(cantiere.foto_estintore || []).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estintore</p>
                  <div className="flex flex-wrap gap-2">
                    {cantiere.foto_estintore.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {(cantiere.foto_pronto_soccorso || []).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pronto Soccorso</p>
                  <div className="flex flex-wrap gap-2">
                    {cantiere.foto_pronto_soccorso.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documenti */}
        {(cantiere.documenti || []).length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Documenti
            </h2>
            <div className="space-y-2">
              {cantiere.documenti.map((doc, i) => (
                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/20 transition-colors">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nome}</p>
                    {doc.tipo && <p className="text-xs text-muted-foreground">{doc.tipo}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contenuto PDF nascosto usato per la stampa */}
      <div className="hidden">
        <ReportPDFContent cantiere={cantiere} rapportini={rapportini} foto={fotoCantiere} trasferte={trasferte} spostamenti={spostamenti} />
      </div>
    </div>
  );
}