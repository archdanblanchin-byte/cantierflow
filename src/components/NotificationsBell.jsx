import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Bell, MapPin, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

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

  // Task / comunicazioni assegnati direttamente a me
  const ricevute = (note || []).filter((n) => (n.destinatari_email || []).includes(user?.email));
  const daLeggere = ricevute.filter((n) => !(n.letto_da || []).includes(user?.email));

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

  const count = daLeggere.length + allarmiCantiere.length;

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
            {allarmiCantiere.length > 0 && (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Attenzione · comunicazioni sui tuoi cantieri
                </p>
                {allarmiCantiere.slice(0, 5).map((n) => (
                  <button
                    key={`c-${n.id}`}
                    onClick={() => { setOpen(false); navigate("/programma"); }}
                    className="w-full text-left p-2 rounded-lg hover:bg-accent bg-pink-500/5"
                  >
                    <p className="text-xs font-medium line-clamp-2">{n.testo}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {n.cantiere_nome || "Cantiere"} · da {n.created_by}
                    </p>
                  </button>
                ))}
              </>
            )}

            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1">
              Task e comunicazioni ricevute {daLeggere.length > 0 && <span className="text-rose-500">· {daLeggere.length} nuove</span>}
            </p>
            {ricevute.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">Nessuna notifica</p>
            ) : (
              ricevute.slice(0, 12).map((n) => {
                const read = (n.letto_da || []).includes(user?.email);
                return (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); navigate("/note"); }}
                    className={`w-full text-left p-2 rounded-lg hover:bg-accent ${!read ? "bg-primary/5" : ""}`}
                  >
                    <p className="text-xs font-medium line-clamp-2 flex items-start gap-1.5">
                      {n.tipo === "task" && <ListTodo className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                      <span>{n.testo}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {n.tipo === "task" ? "Nuovo task ricevuto · " : ""}da {n.created_by} · {format(new Date(n.created_date), "d MMM HH:mm", { locale: it })}
                    </p>
                  </button>
                );
              })
            )}
            <button onClick={() => { setOpen(false); navigate("/note"); }} className="w-full text-center text-xs text-primary py-1.5 hover:underline">
              Vedi tutti
            </button>
          </div>
        </>
      )}
    </div>
  );
}