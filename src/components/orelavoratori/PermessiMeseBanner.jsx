import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

/**
 * Avviso discreto per i mesi di cui non sono ancora stati salvati permessi e
 * ferie: chiede conferma prima di scaricarli dal calendario Google.
 */
export default function PermessiMeseBanner({ meseLabel, onScarica, loading }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/40 px-3 py-2 flex items-center gap-3">
      <p className="flex-1 text-[11px] text-muted-foreground leading-snug">
        Permessi e ferie di <span className="font-medium capitalize">{meseLabel}</span> non ancora
        caricati dal calendario Google.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[11px] shrink-0"
        onClick={onScarica}
        disabled={loading}
      >
        <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Scarico..." : "Scarica"}
      </Button>
    </div>
  );
}