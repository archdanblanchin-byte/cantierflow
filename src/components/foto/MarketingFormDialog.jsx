import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Camera, Check, ImagePlus, Loader2, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { caricaCantieri } from "@/lib/campioni";
import { caricaFotoPrivata, contorniDaFoto, urlFoto } from "@/lib/fotoCantiere";
import CantiereSelect from "@/components/campioni/CantiereSelect";
import CameraGuida from "@/components/foto/CameraGuida";

const vuota = () => ({ file: null, preview: "", file_uri: "", data: "" });

// Un riquadro foto con fotocamera come azione predefinita e galleria come
// seconda scelta.
function RiquadroFoto({ label, stato, onScegli, onRimuovi, children }) {
  const presente = Boolean(stato.preview || stato.file_uri);
  return (
    <div>
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted/40">
        {stato.preview ? (
          <img src={stato.preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        )}

        {children}

        {!presente && (
          <>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              aria-label={`Scatta: ${label}`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                onScegli(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span className="absolute bottom-1.5 left-1.5 z-20 w-6 h-6 rounded bg-background/85 flex items-center justify-center pointer-events-none">
              <ImagePlus className="w-3.5 h-3.5" />
            </span>
            <input
              type="file"
              accept="image/*"
              aria-label={`Carica dalla galleria: ${label}`}
              className="absolute bottom-1.5 left-1.5 z-20 w-6 h-6 opacity-0 cursor-pointer"
              onChange={(e) => {
                onScegli(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        )}

        {presente && (
          <button
            type="button"
            onClick={onRimuovi}
            className="absolute top-1.5 right-1.5 z-30 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-1">{label}</p>
    </div>
  );
}

export default function MarketingFormDialog({ open, confronto, cantierePredefinito, onClose, onSaved }) {
  const { user } = useAuth();
  const [cantiere, setCantiere] = useState(null);
  const [titolo, setTitolo] = useState("");
  const [notaPrima, setNotaPrima] = useState("");
  const [notaDopo, setNotaDopo] = useState("");
  const [prima, setPrima] = useState(vuota);
  const [dopo, setDopo] = useState(vuota);
  const [urlPrima, setUrlPrima] = useState("");
  const [contorni, setContorni] = useState("");
  const [inGuida, setInGuida] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-foto"],
    queryFn: caricaCantieri,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setInGuida(false);
    if (confronto) {
      setCantiere({ id: confronto.cantiere_id, nome: confronto.cantiere_nome });
      setTitolo(confronto.titolo || "");
      setNotaPrima(confronto.nota_prima || "");
      setNotaDopo(confronto.nota_dopo || "");
      setPrima({ file: null, preview: "", file_uri: confronto.foto_prima || "", data: confronto.data_prima || "" });
      setDopo({ file: null, preview: "", file_uri: confronto.foto_dopo || "", data: confronto.data_dopo || "" });
    } else {
      setCantiere(cantierePredefinito || null);
      setTitolo("");
      setNotaPrima("");
      setNotaDopo("");
      setPrima(vuota());
      setDopo(vuota());
    }
  }, [open, confronto, cantierePredefinito]);

  // Il "prima" serve come sottofondo della fotocamera: risolvo il link firmato.
  useEffect(() => {
    let attivo = true;
    if (prima.preview) {
      setUrlPrima(prima.preview);
      return;
    }
    if (!prima.file_uri) {
      setUrlPrima("");
      return;
    }
    urlFoto(prima.file_uri)
      .then((u) => attivo && setUrlPrima(u))
      .catch(() => attivo && setUrlPrima(""));
    return () => {
      attivo = false;
    };
  }, [prima.preview, prima.file_uri]);

  // I contorni guida si ricavano dalla foto del prima.
  useEffect(() => {
    let attivo = true;
    if (!urlPrima) {
      setContorni("");
      return;
    }
    contorniDaFoto(urlPrima)
      .then((c) => attivo && setContorni(c))
      .catch(() => attivo && setContorni(""));
    return () => {
      attivo = false;
    };
  }, [urlPrima]);

  const scegliPrima = (file) => {
    if (!file) return;
    setPrima({ file, preview: URL.createObjectURL(file), file_uri: "", data: new Date().toISOString() });
  };

  const scegliDopo = (file) => {
    if (!file) return;
    setDopo({ file, preview: URL.createObjectURL(file), file_uri: "", data: new Date().toISOString() });
  };

  const salva = async () => {
    if (!cantiere?.id) {
      toast.error("Scegli il cantiere");
      return;
    }
    if (!prima.file && !prima.file_uri) {
      toast.error("Serve la foto del prima");
      return;
    }
    setSalvando(true);
    try {
      const dati = {
        cantiere_id: cantiere.id,
        cantiere_nome: cantiere.nome || "",
        titolo: titolo.trim(),
        nota_prima: notaPrima.trim(),
        nota_dopo: notaDopo.trim(),
        foto_prima: prima.file ? await caricaFotoPrivata(prima.file) : prima.file_uri,
        foto_dopo: dopo.file ? await caricaFotoPrivata(dopo.file) : dopo.file_uri || "",
        data_prima: prima.data || null,
        data_dopo: dopo.data || null,
        user_email: user?.email || "",
        user_nome: user?.full_name || user?.email || "",
      };

      if (confronto?.id) {
        await base44.entities.FotoMarketing.update(confronto.id, dati);
        toast.success("Confronto aggiornato");
      } else {
        await base44.entities.FotoMarketing.create(dati);
        toast.success("Confronto salvato");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Salvataggio non riuscito: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Dialog open={open && !inGuida} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg max-h-[94vh] overflow-y-auto top-4 translate-y-0 p-0 gap-0">
          <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
            <DialogTitle className="pr-6">{confronto ? "Modifica confronto" : "Nuovo confronto prima/dopo"}</DialogTitle>
          </DialogHeader>

          <div className="px-5 py-4 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere *</Label>
                <div className="mt-1.5">
                  <CantiereSelect cantieri={cantieri} value={cantiere?.id || ""} onChange={setCantiere} />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Titolo</Label>
                <Input
                  value={titolo}
                  onChange={(e) => setTitolo(e.target.value)}
                  placeholder="Es. Facciata nord"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <RiquadroFoto label="Prima" stato={prima} onScegli={scegliPrima} onRimuovi={() => setPrima(vuota())} />
              <RiquadroFoto
                label="Dopo"
                stato={dopo}
                onScegli={scegliDopo}
                onRimuovi={() => setDopo(vuota())}
              >
                {urlPrima && !dopo.preview && (
                  <button
                    type="button"
                    onClick={() => setInGuida(true)}
                    className="absolute inset-x-1.5 bottom-1.5 z-20 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold py-1.5 flex items-center justify-center gap-1.5"
                  >
                    <ScanLine className="w-3.5 h-3.5" /> Scatta allineato
                  </button>
                )}
              </RiquadroFoto>
            </div>

            {urlPrima && !dopo.preview && (
              <p className="text-[11px] text-muted-foreground -mt-2">
                La foto del prima fa da guida in fotocamera: la vedi in trasparenza o come contorni, per riprendere la
                stessa inquadratura.
              </p>
            )}

            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nota sul prima</Label>
              <Textarea
                value={notaPrima}
                onChange={(e) => setNotaPrima(e.target.value)}
                placeholder="Com'era la situazione di partenza"
                rows={2}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nota sul dopo</Label>
              <Textarea
                value={notaDopo}
                onChange={(e) => setNotaDopo(e.target.value)}
                placeholder="Cosa è stato fatto e com'è il risultato"
                rows={2}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Annulla
            </Button>
            <Button className="flex-1 gap-2" onClick={salva} disabled={salvando}>
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salva confronto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {inGuida && (
        <CameraGuida
          primaUrl={urlPrima}
          contorniUrl={contorni}
          onAnnulla={() => setInGuida(false)}
          onCapture={(file) => {
            scegliDopo(file);
            setInGuida(false);
          }}
        />
      )}
    </>
  );
}