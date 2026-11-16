import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Flag, Package, Trash2, AlertTriangle } from "lucide-react";
import { caricaTuttiMateriali } from "@/lib/inventario";

function BottoneCancella({ onClick, label = "Cancella notifica" }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="shrink-0 m-1.5 w-7 h-7 rounded-full border border-border bg-card flex items-center justify-center text-rose-600 hover:bg-rose-500/10 active:scale-90 transition-colors"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// Campanella dedicata del Magazzino: raccoglie SOLO gli avvisi relativi ai
// materiali (scorte sotto soglia e segnalazioni di materiale mancante).
// È separata dalla campanella generale dell'app, che resta riservata a task
// e altre comunicazioni personali.
export default function MagazzinoBell({ onOpenMateriale, onOpenSegnalazioni }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [nascoste, setNascoste] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  useEffect(() => {
    if (!user?.email) return;
    try {
      setNascoste(JSON.parse(localStorage.getItem(`scorte-nascoste-${user.email}`) || "[]"));
    } catch {
      setNascoste([]);
    }
  }, [user?.email]);

  const chiaveScorta = (m) => `${m.id}:${Number(m.giacenza || 0)}`;
  const nascondiScorte = (materiali) => {
    const next = [...new Set([...nascoste, ...materiali.map(chiaveScorta)])];
    setNascoste(next);
    localStorage.setItem(`scorte-nascoste-${user.email}`, JSON.stringify(next));
  };

  const { data: materialiScorta = [] } = useQuery({
    queryKey: ["materiali-inventario"],
    queryFn: () => caricaTuttiMateriali({ gestito_magazzino: true }),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: destinatariScorta = [] } = useQuery({
    queryKey: ["destinatari-scorta"],
    queryFn: async () => {
      const page = await base44.entities.DestinatarioScorta.filter({ attivo: true }, { limit: 100 });
      return page?.items || [];
    },
    enabled: !!user,
    refetchInterval: 120000,
  });

  const { data: segnalazioniMateriale = [] } = useQuery({
    queryKey: ["segnalazioni-materiale-aperte"],
    queryFn: async () => {
      const page = await base44.entities.SegnalazioneMateriale.filter(
        { stato: "aperta" },
        { sort: "-created_date", limit: 100 }
      );
      return page?.items || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const sonoDestinatario = (destinatariScorta || []).some((d) => d.email === user?.email);
  const scorteBasse = (sonoDestinatario || user?.role === "admin" ? materialiScorta : [])
    .filter((m) => Number(m.soglia_minima || 0) > 0 && Number(m.giacenza || 0) <= Number(m.soglia_minima || 0))
    .filter((m) => !nascoste.includes(chiaveScorta(m)));

  const count = scorteBasse.length + segnalazioniMateriale.length;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["segnalazioni-materiale-aperte"] });
    queryClient.invalidateQueries({ queryKey: ["materiali-inventario"] });
  };

  const cancellaSegnalazione = async (s) => {
    try {
      await base44.entities.SegnalazioneMateriale.update(s.id, {
        stato: "gestita",
        gestita_da_nome: user?.full_name || user?.email,
      });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const cancellaTutte = async () => {
    if (scorteBasse.length) nascondiScorte(scorteBasse);
    await Promise.all(segnalazioniMateriale.map(cancellaSegnalazione));
    refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent active:scale-90 transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifiche magazzino"
        title="Notifiche magazzino"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover shadow-xl z-50 p-2 space-y-1">
            <div className="sticky -top-2 -mx-2 px-3 py-2 bg-popover border-b border-border flex items-center justify-between gap-2 z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifiche magazzino</span>
              {count > 0 && (
                <button
                  onClick={cancellaTutte}
                  className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Cancella tutte
                </button>
              )}
            </div>

            {count === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">Nessun avviso magazzino</p>
            )}

            {scorteBasse.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 px-2 py-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Scorte sotto soglia · {scorteBasse.length}
                </p>
                {scorteBasse.slice(0, 6).map((m) => (
                  <div key={`s-${m.id}`} className="flex items-center gap-1 rounded-lg hover:bg-accent bg-amber-500/10">
                    <button
                      onClick={() => { setOpen(false); onOpenMateriale?.(m); }}
                      className="flex-1 text-left p-2"
                    >
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{m.nome}: rimasti {Number(m.giacenza || 0)} {m.unita_misura || ""}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Soglia {Number(m.soglia_minima || 0)} {m.unita_misura || ""} · serve un carico
                      </p>
                    </button>
                    <BottoneCancella onClick={() => nascondiScorte([m])} />
                  </div>
                ))}
              </>
            )}

            {segnalazioniMateriale.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 px-2 py-1 flex items-center gap-1">
                  <Flag className="w-3 h-3" /> Materiale segnalato mancante · {segnalazioniMateriale.length}
                </p>
                {segnalazioniMateriale.slice(0, 6).map((s) => (
                  <div key={`m-${s.id}`} className="flex items-center gap-1 rounded-lg hover:bg-accent bg-rose-500/10">
                    <button
                      onClick={() => { setOpen(false); onOpenSegnalazioni?.(); }}
                      className="flex-1 text-left p-2"
                    >
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{s.materiale_nome}{s.posizione_scaffale ? ` · scaffale ${s.posizione_scaffale}` : ""}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {s.testo} · da {s.user_nome || s.user_email}
                      </p>
                    </button>
                    <BottoneCancella onClick={() => cancellaSegnalazione(s)} />
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}