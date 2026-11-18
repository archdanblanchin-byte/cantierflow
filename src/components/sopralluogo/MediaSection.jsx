import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import FotoGrid from "./FotoGrid";
import FileList from "./FileList";
import ScansioneDialog from "./ScansioneDialog";

export default function MediaSection({ draft, set }) {
  const [scan, setScan] = useState(false);
  return (
    <div className="space-y-5">
      <FotoGrid titolo="Immagini generali" items={draft.foto_generali || []} onChange={(v) => set("foto_generali", v)} />
      <FotoGrid titolo="Immagini esterne con quote e annotazioni" annotabile items={draft.foto_quote || []} onChange={(v) => set("foto_quote", v)} />
      <FileList titolo="Allegati documentali" items={draft.allegati || []} onChange={(v) => set("allegati", v)} />
      <Button type="button" variant="outline" className="gap-2" onClick={() => setScan(true)}>
        <ScanLine className="w-4 h-4" /> Scansiona documento (PDF)
      </Button>
      <ScansioneDialog open={scan} onClose={() => setScan(false)} onSalvato={(f) => set("allegati", [...(draft.allegati || []), f])} />
    </div>
  );
}