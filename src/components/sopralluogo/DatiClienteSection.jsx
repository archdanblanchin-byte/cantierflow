import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import Campo from "./Campo";

const ATT = [["nome", "Nome"], ["cognome", "Cognome"], ["indirizzo", "Indirizzo"], ["citta", "Città"], ["telefono", "Telefono"], ["email", "Email"]];

export default function DatiClienteSection({ draft, set }) {
  const att = draft.attenzione || {};

  const posizione = () => {
    if (!navigator.geolocation) return toast.error("Geolocalizzazione non disponibile");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        set("latitudine", String(p.coords.latitude.toFixed(6)));
        set("longitudine", String(p.coords.longitude.toFixed(6)));
      },
      () => toast.error("Posizione non disponibile o permesso negato")
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {["interno", "esterno"].map((t) => (
          <Button key={t} type="button" variant={draft.tipo === t ? "default" : "outline"} className="flex-1 capitalize" onClick={() => set("tipo", t)}>
            Sopralluogo {t}
          </Button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Campo label="Cognome *" value={draft.cognome} onChange={(v) => set("cognome", v)} />
        <Campo label="Nome" value={draft.nome} onChange={(v) => set("nome", v)} />
        <Campo label="Nome cantiere" value={draft.cantiere_nome} onChange={(v) => set("cantiere_nome", v)} className="sm:col-span-2" />
        <Campo label="Indirizzo" value={draft.indirizzo} onChange={(v) => set("indirizzo", v)} />
        <Campo label="Città" value={draft.citta} onChange={(v) => set("citta", v)} />
        <Campo label="Latitudine" numeric value={draft.latitudine} onChange={(v) => set("latitudine", v)} />
        <Campo label="Longitudine" numeric value={draft.longitudine} onChange={(v) => set("longitudine", v)} />
        <Campo label="Telefono" type="tel" value={draft.telefono} onChange={(v) => set("telefono", v)} />
        <Campo label="Email" type="email" value={draft.email} onChange={(v) => set("email", v)} />
        <Campo label="Data sopralluogo" type="date" value={draft.data} onChange={(v) => set("data", v)} />
        <Campo label="Preventivo collegato (riferimento)" value={draft.preventivo_riferimento} onChange={(v) => set("preventivo_riferimento", v)} />
      </div>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={posizione}>
        <MapPin className="w-4 h-4" /> Usa posizione attuale
      </Button>

      <div className="flex items-center gap-2 pt-2 border-t">
        <Switch checked={!!draft.attenzione_attiva} onCheckedChange={(v) => set("attenzione_attiva", v)} id="att" />
        <Label htmlFor="att">Alla cortese attenzione</Label>
      </div>
      {draft.attenzione_attiva && (
        <div className="grid sm:grid-cols-2 gap-3">
          {ATT.map(([k, l]) => (
            <Campo key={k} label={l} value={att[k]} onChange={(v) => set("attenzione", { ...att, [k]: v })} />
          ))}
        </div>
      )}
    </div>
  );
}