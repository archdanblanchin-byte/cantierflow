import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ReportCard({ report }) {
  const collCount = (report.collaboratori || []).length;
  const lavCount = (report.lavorazioni_normali || []).length;
  const isBozza = report.stato !== "inviato";
  const to = isBozza ? `/modifica-report/${report.id}` : `/report/${report.id}`;

  return (
    <Link
      to={to}
      className="block rounded-xl border border-border bg-card p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isBozza ? (
              <Badge
                variant="default"
                className="text-[10px] uppercase tracking-wider cursor-pointer bg-orange-500 hover:bg-orange-500 border-orange-500"
              >
                Compila
              </Badge>
            ) : (
              <Badge
                variant="default"
                className="text-[10px] uppercase tracking-wider"
              >
                Inviato
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {report.data ? format(new Date(report.data), "d MMM yyyy", { locale: it }) : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm truncate">{report.cantiere_nome || "—"}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {collCount} collabor.
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {report.ore_totali_squadra || 0}h
            </span>
            <span>{lavCount} lavoraz.</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}