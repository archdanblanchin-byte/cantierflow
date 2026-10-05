import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Save, CalendarDays, User } from "lucide-react";
import { format } from "date-fns";

// Intestazione del rapportino: per tutti mostra solo cantiere e indirizzo.
// Le informazioni amministrative (data, compilatore) restano visibili solo all'admin.
export default function RapportinoHeader({
  titolo,
  cantiereNome,
  cantiereIndirizzo,
  isAdmin,
  canEditDate,
  data,
  userEmail,
  onChange,
  onBack,
  canEditCantiere,
  onCambiaCantiere,
  lastSaved,
}) {
  return (
    <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border safe-area-top-pt">
      <div className="max-w-2xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{titolo}</p>
            <p className="text-base font-bold truncate flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{cantiereNome || "Seleziona il cantiere"}</span>
            </p>
            {cantiereIndirizzo && (
              <p className="text-xs text-muted-foreground truncate">{cantiereIndirizzo}</p>
            )}
          </div>
          {canEditCantiere && cantiereNome && (
            <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0" onClick={onCambiaCantiere}>
              Cambia
            </Button>
          )}
          {lastSaved && (
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
              <Save className="w-3 h-3" />
              <span>{format(lastSaved, "HH:mm")}</span>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 shrink-0">
              <CalendarDays className="w-3 h-3" /> Data
            </span>
            <Input
              type="datetime-local"
              value={data?.data ? format(new Date(data.data), "yyyy-MM-dd'T'HH:mm") : ""}
              disabled={!canEditDate}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ data: v ? new Date(v).toISOString() : data.data });
              }}
              className={`h-7 w-44 text-xs ${canEditDate ? "bg-background border-primary/40" : "bg-muted"}`}
            />
            <span className="flex items-center gap-1 truncate">
              <User className="w-3 h-3 shrink-0" /> {userEmail || "—"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}