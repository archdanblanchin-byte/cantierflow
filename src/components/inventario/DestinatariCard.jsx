import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { BellRing, Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SheetSelect from "@/components/ui/sheet-select";

// Chi riceve gli avvisi di scorta bassa: utenti dell'app e collaboratori.
export default function DestinatariCard() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState("collaboratore");
  const [salvando, setSalvando] = useState(false);

  const { data: destinatari = [], refetch } = useQuery({
    queryKey: ["destinatari-scorta"],
    queryFn: async () => {
      const page = await base44.entities.DestinatarioScorta.filter({}, { sort: "nome", limit: 100 });
      return page?.items || [];
    },
  });

  const { data: utenti = [] } = useQuery({
    queryKey: ["utenti-app"],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (err) {
        return [];
      }
    },
  });

  const { data: collaboratori = [] } = useQuery({
    queryKey: ["collaboratori"],
    queryFn: () => base44.entities.Collaboratore.list(),
  });

  const aggiungi = async () => {
    if (!email.trim()) {
      toast.error("Serve un indirizzo email per ricevere gli avvisi");
      return;
    }
    setSalvando(true);
    try {
      await base44.entities.DestinatarioScorta.create({
        nome: nome.trim() || email.trim(),
        email: email.trim().toLowerCase(),
        tipo,
        attivo: true,
      });
      toast.success("Destinatario aggiunto");
      setNome("");
      setEmail("");
      refetch();
    } catch (err) {
      toast.error("Non aggiunto: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  const rimuovi = async (id) => {
    try {
      await base44.entities.DestinatarioScorta.delete(id);
      refetch();
    } catch (err) {
      toast.error("Non rimosso: " + (err?.message || "riprova"));
    }
  };

  const scegliUtente = (val) => {
    const u = utenti.find((x) => x.email === val);
    if (!u) return;
    setNome(u.full_name || "");
    setEmail(u.email || "");
    setTipo("utente");
  };

  const scegliCollaboratore = (val) => {
    const c = collaboratori.find((x) => x.id === val);
    if (!c) return;
    setNome(c.nome || "");
    setEmail(c.user_email || "");
    setTipo("collaboratore");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <BellRing className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        Questi destinatari ricevono l'avviso (in app e via email) quando un materiale scende sotto la soglia.
      </p>

      <div className="space-y-1.5">
        {destinatari.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nessun destinatario configurato</p>
        ) : (
          destinatari.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{d.nome || d.email}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {d.email} · {d.tipo === "utente" ? "utente app" : "collaboratore"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => rimuovi(d.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border border-border p-3 space-y-3">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" /> Aggiungi destinatario
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Utente app</Label>
            <div className="mt-1">
              <SheetSelect
                value=""
                onValueChange={scegliUtente}
                placeholder="Scegli..."
                options={utenti.filter((u) => u.email).map((u) => ({ value: u.email, label: u.full_name || u.email }))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Collaboratore</Label>
            <div className="mt-1">
              <SheetSelect
                value=""
                onValueChange={scegliCollaboratore}
                placeholder="Scegli..."
                options={collaboratori.map((c) => ({ value: c.id, label: c.nome }))}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1" placeholder="Nome" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="nome@email.it" />
          </div>
        </div>
        <Button className="w-full gap-2" onClick={aggiungi} disabled={salvando}>
          {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
          Aggiungi agli avvisi
        </Button>
      </div>
    </div>
  );
}