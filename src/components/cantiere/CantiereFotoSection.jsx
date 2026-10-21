import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Camera, Hammer, Megaphone, Palette } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import FotoPrivata from "@/components/foto/FotoPrivata";
import FotoCard from "@/components/foto/FotoCard";
import AndamentoDetailDialog from "@/components/foto/AndamentoDetailDialog";
import CodiceColoreDetailDialog from "@/components/foto/CodiceColoreDetailDialog";
import MarketingDetailDialog from "@/components/foto/MarketingDetailDialog";
import { coloreValido, testoSuColore } from "@/lib/campioni";

function Gruppo({ Icona, titolo, count, children }) {
  if (!count) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
        <Icona className="w-3.5 h-3.5" /> {titolo} ({count})
      </h3>
      {children}
    </div>
  );
}

// Tutte le foto del cantiere in un posto solo: andamento, codici colore,
// marketing prima/dopo e le foto caricate in precedenza.
export default function CantiereFotoSection({ cantiereId, fotoLegacy = [] }) {
  const [sessione, setSessione] = useState(null);
  const [scheda, setScheda] = useState(null);
  const [confronto, setConfronto] = useState(null);

  const { data: sessioni = [] } = useQuery({
    queryKey: ["foto_andamento_cantiere", cantiereId],
    queryFn: async () => {
      const page = await base44.entities.FotoAndamento.filter(
        { cantiere_id: cantiereId },
        { sort: "-data", limit: 100 }
      );
      return page?.items || [];
    },
    enabled: !!cantiereId,
  });

  const { data: colori = [] } = useQuery({
    queryKey: ["codici_colore_cantiere", cantiereId],
    queryFn: async () => {
      const page = await base44.entities.CodiceColore.filter(
        { cantiere_id: cantiereId },
        { sort: "-data", limit: 100 }
      );
      return page?.items || [];
    },
    enabled: !!cantiereId,
  });

  const { data: marketing = [] } = useQuery({
    queryKey: ["marketing_cantiere", cantiereId],
    queryFn: async () => {
      const page = await base44.entities.FotoMarketing.filter(
        { cantiere_id: cantiereId },
        { sort: "-created_date", limit: 100 }
      );
      return page?.items || [];
    },
    enabled: !!cantiereId,
  });

  const totale = sessioni.length + colori.length + marketing.length + fotoLegacy.length;
  if (totale === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Camera className="w-3.5 h-3.5" /> Foto del cantiere ({totale})
      </h2>

      <Gruppo Icona={Hammer} titolo="Andamento cantiere" count={sessioni.length}>
        <div className="space-y-2">
          {sessioni.map((s) => (
            <button
              key={s.id}
              onClick={() => setSessione(s)}
              className="w-full text-left rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3 hover:border-primary/40 transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.titolo || "Sessione foto"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {s.data ? format(new Date(s.data), "d MMM yyyy", { locale: it }) : ""} · {(s.foto || []).length} foto
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {(s.foto || []).slice(0, 3).map((f, i) => (
                  <FotoPrivata
                    key={i}
                    file_uri={f.url_annotata || f.file_uri}
                    className="w-12 h-12 rounded-lg border border-border"
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </Gruppo>

      <Gruppo Icona={Palette} titolo="Codici colore" count={colori.length}>
        <div className="grid grid-cols-2 gap-2">
          {colori.map((s) => {
            const hex = coloreValido(s.colore_hex) ? s.colore_hex : "";
            return (
              <button
                key={s.id}
                onClick={() => setScheda(s)}
                className="rounded-xl border border-border bg-card p-2.5 flex items-center gap-2 text-left hover:border-primary/40 transition-all"
              >
                <span
                  className="w-9 h-9 rounded-lg border border-border shrink-0 flex items-center justify-center text-[8px] font-semibold"
                  style={hex ? { background: hex, color: testoSuColore(hex) } : undefined}
                >
                  {hex ? "" : "n.d."}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{s.nome}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{[s.tipo, s.colore_nome].filter(Boolean).join(" · ")}</p>
                </div>
              </button>
            );
          })}
        </div>
      </Gruppo>

      <Gruppo Icona={Megaphone} titolo="Marketing prima/dopo" count={marketing.length}>
        <div className="space-y-2">
          {marketing.map((c) => (
            <button
              key={c.id}
              onClick={() => setConfronto(c)}
              className="w-full text-left rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3 hover:border-primary/40 transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.titolo || "Confronto prima/dopo"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {c.data_prima ? format(new Date(c.data_prima), "d MMM yyyy", { locale: it }) : ""}
                  {c.data_dopo ? ` → ${format(new Date(c.data_dopo), "d MMM yyyy", { locale: it })}` : " → dopo da scattare"}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <FotoPrivata file_uri={c.foto_prima} className="w-12 h-12 rounded-lg border border-border" />
                <FotoPrivata file_uri={c.foto_dopo} className="w-12 h-12 rounded-lg border border-border" />
              </div>
            </button>
          ))}
        </div>
      </Gruppo>

      <Gruppo Icona={Camera} titolo="Foto caricate in precedenza" count={fotoLegacy.length}>
        <div className="grid grid-cols-2 gap-3">
          {fotoLegacy.map((f) => (
            <FotoCard key={f.id} foto={f} />
          ))}
        </div>
      </Gruppo>

      <AndamentoDetailDialog open={Boolean(sessione)} sessione={sessione} onClose={() => setSessione(null)} />
      <CodiceColoreDetailDialog open={Boolean(scheda)} scheda={scheda} onClose={() => setScheda(null)} />
      <MarketingDetailDialog open={Boolean(confronto)} confronto={confronto} onClose={() => setConfronto(null)} />
    </div>
  );
}