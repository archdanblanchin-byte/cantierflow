import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  MapPin, Truck, Users, Zap, Wrench, Package, FileText,
} from "lucide-react";

function Section({ icon: Icon, title, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function Step6Riepilogo({ data }) {
  const sommaOreNormali = (data.lavorazioni_normali || []).reduce((s, l) => s + (l.ore_totali || 0), 0);
  const sommaOreExtra = (data.lavorazioni_extra || []).reduce((s, l) => s + (l.ore || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Riepilogo</h2>
          <p className="text-sm text-muted-foreground">Verifica tutti i dati prima dell'invio</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        <div className="p-4">
          <Section icon={MapPin} title="Cantiere">
            <Row label="Nome" value={data.cantiere_nome} />
            <Row label="Data" value={data.data ? format(new Date(data.data), "d MMMM yyyy, HH:mm", { locale: it }) : ""} />
            <Row label="Compilatore" value={data.user_email} />
            {data.note_generali && <Row label="Note" value={data.note_generali} />}
            {(data.foto || []).length > 0 && (
              <div className="flex gap-2 mt-2">
                {data.foto.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                ))}
              </div>
            )}
          </Section>
        </div>

        {(data.ore_utilizzo_piattaforma > 0 || data.ore_noleggio_mezzi > 0 || data.ore_noleggio_plexi > 0) && (
          <div className="p-4">
            <Section icon={Truck} title="Mezzi / Noleggi">
              <Row label="Piattaforma aerea" value={data.ore_utilizzo_piattaforma ? `${data.ore_utilizzo_piattaforma}h` : null} />
              <Row label="Noleggio mezzi" value={data.ore_noleggio_mezzi ? `${data.descrizione_noleggio_mezzi || ""} — ${data.ore_noleggio_mezzi}h` : null} />
              <Row label="Noleggio plexi" value={data.ore_noleggio_plexi ? `${data.descrizione_noleggio_plexi || ""} — ${data.ore_noleggio_plexi}h` : null} />
            </Section>
          </div>
        )}

        <div className="p-4">
          <Section icon={Users} title={`Collaboratori (${(data.collaboratori || []).length})`}>
            {data.ore_spostamento > 0 && (
              <>
                <Row label="Ore spostamento (auto)" value={`${data.ore_spostamento}h`} />
                <Row label="Totale ore cantiere" value={`${(data.ore_totali_squadra || 0) + data.ore_spostamento}h`} />
              </>
            )}
            {(data.collaboratori || []).map((c, i) => (
              <div key={i} className="flex items-center justify-between py-1 text-sm">
                <span>{c.nome}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{c.ore_lavorate}h</Badge>
                  {c.note_imprevisti && <span className="text-xs text-muted-foreground italic">{c.note_imprevisti}</span>}
                </div>
              </div>
            ))}
          </Section>
        </div>

        {data.has_lavorazioni_extra && (data.lavorazioni_extra || []).length > 0 && (
          <div className="p-4">
            <Section icon={Zap} title={`Lavorazioni Extra (${sommaOreExtra}h)`}>
              {(data.lavorazioni_extra || []).map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>{l.descrizione || "—"}</span>
                  <Badge variant="secondary" className="text-xs">{l.ore}h</Badge>
                </div>
              ))}
            </Section>
          </div>
        )}

        <div className="p-4">
          <Section icon={Wrench} title={`Lavorazioni Normali (${sommaOreNormali.toFixed(1)}h)`}>
            {(data.lavorazioni_normali || []).map((l, i) => (
              <div key={i} className="py-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{l.tipo_lavorazione_nome || l.descrizione_custom || "—"}</span>
                  <Badge variant="secondary" className="text-xs">{l.ore_totali}h</Badge>
                </div>
                {l.descrizione && (
                  <p className="text-xs text-muted-foreground mt-0.5">{l.descrizione}</p>
                )}
              </div>
            ))}
          </Section>
        </div>

        {(data.materiali || []).length > 0 && (
          <div className="p-4">
            <Section icon={Package} title={`Materiali (${data.materiali.length})`}>
              {(data.materiali || []).map((m, i) => (
                <div key={i} className="py-1 text-sm">
                  <div className="flex justify-between">
                    <span>{m.nome || m.descrizione_custom || "—"}</span>
                    <span className="font-medium">{m.quantita} {m.unita_misura}</span>
                  </div>
                  {m.descrizione && (
                    <p className="text-xs text-muted-foreground mt-0.5">{m.descrizione}</p>
                  )}
                </div>
              ))}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}