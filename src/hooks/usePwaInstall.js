import { useEffect, useState } from "react";

/**
 * Installazione automatica della PWA.
 *
 * Il browser (Android/Chrome, Edge, desktop) emette l'evento `beforeinstallprompt`
 * appena l'app è pronta: lo intercettiamo e lanciamo il prompt di sistema da soli,
 * al primo tocco dell'utente sull'app, senza che debba cercare nessun pulsante.
 *
 * Se il browser non emette l'evento (es. Safari su iPhone) l'installazione non è
 * pilotabile da codice: in quel caso non c'è nulla da fare a livello applicativo.
 */

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

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

// --- Stato condiviso (una sola istanza per tutta l'app) ---
let promptEvent = null;
let installata = isStandalone();
let inCorso = false;
let autoTentato = false;
const listeners = new Set();

const snapshot = () => ({ promptDisponibile: !!promptEvent, installata, inCorso });
const emit = () => listeners.forEach((l) => l());

async function eseguiPrompt() {
  if (!promptEvent || inCorso) return false;
  const ev = promptEvent;
  inCorso = true;
  emit();
  try {
    ev.prompt();
    const scelta = await ev.userChoice;
    if (scelta?.outcome === "accepted") installata = true;
    return scelta?.outcome === "accepted";
  } catch {
    return false;
  } finally {
    promptEvent = null;
    inCorso = false;
    emit();
  }
}

// Lancio automatico al primo gesto dell'utente (i browser richiedono un tocco reale)
const GESTI = ["pointerdown", "keydown"];
function attachAutoPrompt() {
  if (autoTentato || typeof window === "undefined") return;
  const handler = () => {
    if (!promptEvent) return; // non ancora disponibile: continuo ad ascoltare
    autoTentato = true;
    GESTI.forEach((g) => window.removeEventListener(g, handler, true));
    eseguiPrompt();
  };
  GESTI.forEach((g) => window.addEventListener(g, handler, true));
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptEvent = e;
    emit();
    attachAutoPrompt();
  });
  window.addEventListener("appinstalled", () => {
    installata = true;
    promptEvent = null;
    emit();
  });
  const mq = window.matchMedia?.("(display-mode: standalone)");
  mq?.addEventListener?.("change", () => {
    if (isStandalone()) {
      installata = true;
      emit();
    }
  });
  attachAutoPrompt();
}

export default function usePwaInstall() {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    const l = () => setState(snapshot());
    listeners.add(l);
    l();
    return () => listeners.delete(l);
  }, []);

  return {
    ...state,
    installa: eseguiPrompt,
    piattaforma: rilevaPiattaforma(),
  };
}