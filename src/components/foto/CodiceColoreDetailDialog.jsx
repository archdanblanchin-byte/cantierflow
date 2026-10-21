import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Pencil, Tag, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import FotoPrivata from "@/components/foto/FotoPrivata";
import { coloreValido, testoSuColore } from "@/lib/campioni";

const FOTO = [
  { chiave: "foto_fornitore", label: "Etichetta fornitore" },
  { chiave: "foto_azienda", label: "Etichetta ditta" },
  { chiave: "foto_secchio", label: "Contenitore" },
  { chiave: "foto_colore", label: "Colore" },
];

function Riga({ label, valore }) {
  if (!valore) return null;
  return (
    <div className="flex justify-between gap-4 text-sm border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{valore}</span>
    </div>
  );
}

export default function CodiceColoreDetailDialog({ scheda, open, onClose, onEdit, onDelete, isAdmin }) {
  if (!scheda) return null;
  const hex = coloreValido(scheda.colore_hex) ? scheda.colore_hex : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto top-4 translate-y-0 p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
          <DialogTitle className="pr-6">{scheda.nome || "Codice colore"}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {scheda.tipo}
            {scheda.cantiere_nome ? ` · ${scheda.cantiere_nome}` : ""}
          </p>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {scheda.data ? format(new Date(scheda.data), "d MMMM yyyy", { locale: it }) : "-"}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> {scheda.user_nome || scheda.user_email}
            </span>
          </div>

          {hex && (
            <div
              className="rounded-xl border border-border p-3 flex items-center gap-3"
              style={{ background: hex, color: testoSuColore(hex) }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">Tinta</span>
              <span className="text-sm font-bold">{hex}</span>
              {scheda.colore_nome && <span className="text-sm ml-auto">{scheda.colore_nome}</span>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {FOTO.map(({ chiave, label }) =>
              scheda[chiave] ? (
                <div key={chiave} className="space-y-1">
                  <FotoPrivata file_uri={scheda[chiave]} className="aspect-square rounded-xl border border-border" />
                  <p className="text-[11px] text-muted-foreground text-center">{label}</p>
                </div>
              ) : null
            )}
          </div>

          <div className="rounded-xl border border-border px-3 py-1">
            <Riga label="Marca" valore={scheda.marca} />
            <Riga label="Codice" valore={scheda.codice} />
            <Riga label="Colore" valore={scheda.colore_nome} />
            <Riga label="Fornitore" valore={scheda.fornitore} />
            <Riga
              label="Data etichetta"
              valore={scheda.data_etichetta ? format(new Date(scheda.data_etichetta), "d MMM yyyy", { locale: it }) : ""}
            />
            <Riga label="Cantiere" valore={scheda.cantiere_nome} />
          </div>

          {scheda.note && <p className="text-sm rounded-xl bg-muted/60 p-3">{scheda.note}</p>}

          {(scheda.testo_fornitore || scheda.testo_azienda) && (
            <details className="rounded-xl border border-border p-3">
              <summary className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                <Tag className="w-3.5 h-3.5" /> Testo letto sulle etichette
              </summary>
              {scheda.testo_fornitore && (
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Fornitore</p>
                  <p className="text-xs whitespace-pre-wrap">{scheda.testo_fornitore}</p>
                </div>
              )}
              {scheda.testo_azienda && (
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ditta</p>
                  <p className="text-xs whitespace-pre-wrap">{scheda.testo_azienda}</p>
                </div>
              )}
            </details>
          )}
        </div>

        {(onEdit || isAdmin) && (
          <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex gap-2">
            {onEdit && (
              <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(scheda)}>
                <Pencil className="w-4 h-4" /> Modifica
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" className="gap-2 text-destructive" onClick={() => onDelete(scheda)}>
                <Trash2 className="w-4 h-4" /> Elimina
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}