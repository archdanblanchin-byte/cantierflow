import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Eye, Image as ImageIcon, ScanLine, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Fotocamera con la foto del "prima" in sottofondo: si può vedere in
// trasparenza (con opacità regolabile) oppure solo come contorni guida.
export default function CameraGuida({ primaUrl, contorniUrl, onCapture, onAnnulla, titolo = "Scatta il dopo" }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [errore, setErrore] = useState("");
  const [modo, setModo] = useState("trasparenza");
  const [opacita, setOpacita] = useState(45);

  useEffect(() => {
    let attivo = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrore("Fotocamera non disponibile su questo dispositivo.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((s) => {
        if (!attivo) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setErrore("Non riesco ad aprire la fotocamera: carica la foto dalla galleria."));
    return () => {
      attivo = false;
    };
  }, []);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  const scatta = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => blob && onCapture(new File([blob], "dopo.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.92
    );
  };

  const daGalleria = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onCapture(file);
  };

  const usaContorni = modo === "contorni" && Boolean(contorniUrl);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white safe-area-top-pt">
        <div>
          <p className="font-semibold text-sm">{titolo}</p>
          <p className="text-[11px] text-white/60">Allinea l'inquadratura al prima</p>
        </div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onAnnulla}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {primaUrl && !errore && (
          <img
            src={usaContorni ? contorniUrl : primaUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: usaContorni ? 0.95 : opacita / 100 }}
          />
        )}
        {errore && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center text-white/80">
            <Camera className="w-8 h-8" />
            <p className="text-sm">{errore}</p>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-6 space-y-3 safe-area-bottom-pb">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModo("trasparenza")}
            className={cn(
              "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors",
              modo === "trasparenza" ? "border-white bg-white text-black" : "border-white/30 text-white"
            )}
          >
            <Eye className="w-3.5 h-3.5" /> Trasparenza
          </button>
          <button
            onClick={() => setModo("contorni")}
            disabled={!contorniUrl}
            className={cn(
              "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40",
              modo === "contorni" ? "border-white bg-white text-black" : "border-white/30 text-white"
            )}
          >
            <ScanLine className="w-3.5 h-3.5" /> Contorni
          </button>
        </div>

        {modo === "trasparenza" && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-white/70 w-20">Trasparenza</span>
            <input
              type="range"
              min="5"
              max="95"
              value={opacita}
              onChange={(e) => setOpacita(Number(e.target.value))}
              className="flex-1 accent-white"
            />
            <span className="text-[11px] text-white/70 w-8 text-right">{opacita}%</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <label className="cursor-pointer text-white/80 flex flex-col items-center gap-1 w-16">
            <span className="w-11 h-11 rounded-xl border border-white/30 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </span>
            <span className="text-[10px]">Galleria</span>
            <input type="file" accept="image/*" className="hidden" onChange={daGalleria} />
          </label>

          <button
            onClick={scatta}
            disabled={Boolean(errore)}
            className="w-16 h-16 rounded-full bg-white border-4 border-white/40 disabled:opacity-40"
            aria-label="Scatta la foto"
          />

          <div className="w-16" />
        </div>
      </div>
    </div>
  );
}