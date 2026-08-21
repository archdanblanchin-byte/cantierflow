import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Wrapper pull-to-refresh per liste scorrevoli.
 * Usa lo scroll della finestra: mostra un indicatore quando l'utente tira verso il basso
 * partendo dal top della pagina, e al superamento della soglia richiama onRefresh().
 */
export default function PullToRefresh({ onRefresh, children, threshold = 70 }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    const onStart = (e) => {
      if (window.scrollY <= 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      } else {
        pulling.current = false;
      }
    };
    const onMove = (e) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) setPull(Math.min(delta * 0.5, threshold * 1.5));
    };
    const onEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pull >= threshold) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh?.();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pull, refreshing, onRefresh, threshold]);

  const indicatorHeight = refreshing ? threshold : pull;

  return (
    <>
      {indicatorHeight > 0 && (
        <div
          className="flex items-center justify-center overflow-hidden text-muted-foreground"
          style={{ height: indicatorHeight }}
        >
          <Loader2 className={cn("w-5 h-5", refreshing && "animate-spin")} />
        </div>
      )}
      {children}
    </>
  );
}