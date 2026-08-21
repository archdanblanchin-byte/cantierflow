import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Pulsante di sincronizzazione globale: invalida e riflette tutte le query
 * (React Query) così l'utente non deve uscire e rientrare nell'app.
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
      className="fixed z-30 top-[calc(env(safe-area-inset-top)+56px)] right-3 flex items-center justify-center w-10 h-10 rounded-full bg-card/90 backdrop-blur border border-border shadow-md text-muted-foreground hover:text-foreground active:scale-90 transition safe-area-top-pt"
    >
      <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
    </button>
  );
}