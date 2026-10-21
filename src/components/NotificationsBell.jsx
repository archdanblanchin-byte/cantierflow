import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, MapPin, ListTodo, AlertTriangle, Package, Flag, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
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

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [nascoste, setNascoste] = useState([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  // Avvisi di scorta già cancellati dall'utente (per materiale + giacenza attuale):
  // tornano a comparire solo se la giacenza cambia di nuovo.
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

  const { data: note = [] } = useQuery({
    queryKey: ["note-ricevute"],
    queryFn: () => base44.entities.Nota.list("-created_date", 150),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: programmazioni = [] } = useQuery({
    queryKey: ["programmazioni-notifiche"],
    queryFn: () => base44.entities.Programmazione.filter({ stato: "pubblicato" }),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: collaboratori = [] } = useQuery({
    queryKey: ["collaboratori"],
    queryFn: () => base44.entities.Collaboratore.list(),
    enabled: !!user,
  });

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

  // Materiale segnalato mancante in magazzino: la vede il magazziniere e l'amministratore
  const isGestore = ["admin", "responsabile_tecnico"].includes(user?.role);
  const { data: segnalazioniMateriale = [] } = useQuery({
    queryKey: ["segnalazioni-materiale-aperte"],
    queryFn: async () => {
      const page = await base44.entities.SegnalazioneMateriale.filter(
        { stato: "aperta" },
        { sort: "-created_date", limit: 100 }
      );
      return page?.items || [];
    },
    enabled: !!user && isGestore,
    refetchInterval: 60000,
  });

  // Task / comunicazioni assegnati direttamente a me, non ancora visti
  const ricevute = (note || []).filter(
    (n) => (n.destinatari_email || []).includes(user?.email) && !(n.letto_da || []).includes(user?.email)
  );

  // Scorte di magazzino sotto la soglia: avviso per chi è stato scelto come destinatario
  const sonoDestinatario = (destinatariScorta || []).some((d) => d.email === user?.email);
  const scorteBasse = (sonoDestinatario || user?.role === "admin" ? materialiScorta : [])
    .filter((m) => Number(m.soglia_minima || 0) > 0 && Number(m.giacenza || 0) <= Number(m.soglia_minima || 0))
    .filter((m) => !nascoste.includes(chiaveScorta(m)));

  // Comunicazioni sui cantieri dove sono programmato (oggi e domani)
  const oggi = new Date().toISOString().slice(0, 10);
  const domani = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const mieiNomi = [
    user?.full_name,
    collaboratori.find((c) => c.user_email === user?.email)?.nome,
  ].filter(Boolean).map((n) => n.toLowerCase());
  const mieiCantieri = (programmazioni || []).filter((p) =>
    (p.data === oggi || p.data === domani) &&
    (p.collaboratori || []).some((c) => mieiNomi.includes((c.nome || "").toLowerCase())));
  const limite = Date.now() - 3 * 86400000;
  const allarmiCantiere = (note || []).filter((n) =>
    n.cantiere_id && !n.completato &&
    new Date(n.created_date).getTime() > limite &&
    !(n.letto_da || []).includes(user?.email) &&
    mieiCantieri.some((p) => p.cantiere_id === n.cantiere_id));

  const count = ricevute.length + allarmiCantiere.length + scorteBasse.length + segnalazioniMateriale.length;
  const daCancellare = count;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["note-ricevute"] });
    queryClient.invalidateQueries({ queryKey: ["segnalazioni-materiale-aperte"] });
  };

  const cancellaNota = async (n) => {
    try {
      await base44.entities.Nota.update(n.id, { letto_da: [...(n.letto_da || []), user.email] });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const cancellaSegnalazione = async (s) => {
    try {
      await base44.entities.SegnalazioneMateriale.update(s.id, { stato: "gestita", gestita_da_nome: user?.full_name || user?.email });
      refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const cancellaTutte = async () => {
    if (scorteBasse.length) nascondiScorte(scorteBasse);
    await Promise.all([
      ...ricevute.map(cancellaNota),
      ...allarmiCantiere.map(cancellaNota),
      ...segnalazioniMateriale.map(cancellaSegnalazione),
    ]);
    refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent active:scale-90 transition-colors text-muted-foreground hover:text-foreground relative"
        aria-label="Notifiche"
      >
        <Bell className="w-5 h-5" />
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
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifiche</span>
              {daCancellare > 0 && (
                <button
                  onClick={cancellaTutte}
                  className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Cancella tutte
                </button>
              )}
            </div>

            {scorteBasse.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 px-2 py-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Scorte sotto soglia · {scorteBasse.length}
                </p>
                {scorteBasse.slice(0, 6).map((m) => (
                  <div key={`s-${m.id}`} className="flex items-center gap-1 rounded-lg hover:bg-accent bg-amber-500/10">
                    <button
                      onClick={() => { setOpen(false); navigate("/inventario"); }}
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
                      onClick={() => { setOpen(false); navigate("/inventario"); }}
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

            {allarmiCantiere.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Attenzione · comunicazioni sui tuoi cantieri
                </p>
                {allarmiCantiere.slice(0, 5).map((n) => (
                  <div key={`c-${n.id}`} className="flex items-center gap-1 rounded-lg hover:bg-accent bg-pink-500/5">
                    <button
                      onClick={() => { setOpen(false); navigate("/programma"); }}
                      className="flex-1 text-left p-2"
                    >
                      <p className="text-xs font-medium line-clamp-2">{n.testo}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {n.cantiere_nome || "Cantiere"} · da {n.created_by}
                      </p>
                    </button>
                    <BottoneCancella onClick={() => cancellaNota(n)} />
                  </div>
                ))}
              </>
            )}

            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
              Task e comunicazioni ricevute {ricevute.length > 0 && <span className="text-rose-500">· {ricevute.length} nuove</span>}
            </p>
            {ricevute.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">Nessuna notifica</p>
            ) : (
              ricevute.slice(0, 12).map((n) => (
                <div key={n.id} className="flex items-center gap-1 rounded-lg hover:bg-accent bg-primary/5">
                  <button
                    onClick={() => { setOpen(false); navigate(n.tipo === "task" ? "/task" : "/note"); }}
                    className="flex-1 text-left p-2"
                  >
                    <p className="text-xs font-medium line-clamp-2 flex items-start gap-1.5">
                      {n.tipo === "task" && <ListTodo className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                      <span>{n.testo}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {n.tipo === "task" ? "Nuovo task ricevuto · " : ""}da {n.created_by} · {format(new Date(n.created_date), "d MMM HH:mm", { locale: it })}
                    </p>
                  </button>
                  <BottoneCancella onClick={() => cancellaNota(n)} />
                </div>
              ))
            )}

            <button onClick={() => { setOpen(false); navigate("/task"); }} className="w-full text-center text-xs text-primary py-1.5 hover:underline border-t border-border">
              Vedi tutti i task
            </button>
          </div>
        </>
      )}
    </div>
  );
}