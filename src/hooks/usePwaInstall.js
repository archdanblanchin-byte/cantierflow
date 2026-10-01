import { useEffect, useState } from "react";

// L'app è già aperta come PWA installata (standalone, senza barra del browser)?
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

// Rileva la piattaforma per mostrare le istruzioni corrette
export function rilevaPiattaforma() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * Gestisce l'installazione della PWA:
 * - intercetta l'evento nativo `beforeinstallprompt` (Android/Chrome, desktop)
 * - rileva se l'app è già installata (standalone o evento `appinstalled`)
 * - espone `installa()` per aprire il prompt di sistema
 */
export default function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installata, setInstallata] = useState(isStandalone);
  const [inCorso, setInCorso] = useState(false);
  const piattaforma = rilevaPiattaforma();

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstallata(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayChange = () => {
      if (isStandalone()) setInstallata(true);
    };
    mq?.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mq?.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const installa = async () => {
    if (!promptEvent) return false;
    setInCorso(true);
    try {
      promptEvent.prompt();
      const scelta = await promptEvent.userChoice;
      setPromptEvent(null);
      if (scelta?.outcome === "accepted") {
        setInstallata(true);
        return true;
      }
      return false;
    } finally {
      setInCorso(false);
    }
  };

  return {
    promptDisponibile: !!promptEvent,
    installata,
    inCorso,
    installa,
    piattaforma,
  };
}