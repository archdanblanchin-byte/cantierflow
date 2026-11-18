import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FotoPrivata from "@/components/foto/FotoPrivata";

// Visualizzatore ingrandito con navigazione avanti/indietro. uris = file privati.
export default function ImageViewer({ uris, start = null, onClose }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (start !== null) setI(start);
  }, [start]);
  if (start === null || !uris?.length) return null;
  const n = uris.length;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-2">
        <DialogTitle className="sr-only">Immagine</DialogTitle>
        <div className="relative">
          <FotoPrivata file_uri={uris[i]} fit="contain" className="w-full h-[70vh] rounded-lg bg-black" />
          {n > 1 && (
            <>
              <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setI((i - 1 + n) % n)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setI((i + 1) % n)}>
                <ChevronRight className="w-5 h-5" />
              </Button>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black/60 text-white rounded px-2 py-0.5">
                {i + 1} / {n}
              </span>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}