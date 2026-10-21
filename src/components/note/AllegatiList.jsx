import { Badge } from "@/components/ui/badge";
import { Paperclip, PenLine } from "lucide-react";
import { apriFilePrivato } from "@/lib/allegati";

/**
 * Riga compatta con il disegno e gli allegati di una nota: tocca per aprire.
 */
export default function AllegatiList({ disegno, allegati = [] }) {
  if (!disegno && !allegati.length) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap pt-1">
      {disegno && (
        <Badge
          variant="secondary"
          className="text-[10px] gap-1 cursor-pointer"
          onClick={() => apriFilePrivato(disegno)}
        >
          <PenLine className="w-3 h-3" /> Disegno
        </Badge>
      )}
      {allegati.map((a, i) => (
        <Badge
          key={a.file_uri || i}
          variant="secondary"
          className="text-[10px] gap-1 cursor-pointer max-w-[160px]"
          onClick={() => a.file_uri && apriFilePrivato(a.file_uri)}
        >
          <Paperclip className="w-3 h-3 shrink-0" />
          <span className="truncate">{a.nome}</span>
        </Badge>
      ))}
    </div>
  );
}