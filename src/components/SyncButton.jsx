import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Pulsante di sincronizzazione globale: invalida e riflette tutte le query
 * (React Query) così l'utente non deve uscire e rientrare nell'app.
 * Versione inline (da inserire nell'header).
 */
export default function SyncButton() {
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries({ type: "active" });
      toast.success("Dati sincronizzati");
    } catch {
      toast.error("Sincronizzazione non riuscita");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      aria-label="Sincronizza"
      disabled={syncing}
      className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent active:scale-90 transition-colors text-muted-foreground hover:text-foreground"
    >
      <RefreshCw className={`w-5 h-5 ${syncing ? "animate-spin" : ""}`} />
    </button>
  );
}