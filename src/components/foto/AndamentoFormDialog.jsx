import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Check, Edit3, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { caricaCantieri } from "@/lib/campioni";
import { caricaAnnotataDaDataUrl, caricaFotoPrivata } from "@/lib/fotoCantiere";
import CantiereSelect from "@/components/campioni/CantiereSelect";
import FotoEditor from "@/components/foto/FotoEditor";

let contatore = 0;

export default function AndamentoFormDialog({ open, sessione, cantierePredefinito, onClose, onSaved }) {
  const { user } = useAuth();
  const [cantiere, setCantiere] = useState(null);
  const [titolo, setTitolo] = useState("");
  const [notaGenerale, setNotaGenerale] = useState("");
  const [items, setItems] = useState([]);
  const [indiceAnnota, setIndiceAnnota] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-foto"],
    queryFn: caricaCantieri,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setIndiceAnnota(null);
    if (sessione) {
      setCantiere({ id: sessione.cantiere_id, nome: sessione.cantiere_nome });
      setTitolo(sessione.titolo || "");
      setNotaGenerale(sessione.nota_generale || "");
      setItems(
        (sessione.foto || []).map((f) => ({
          chiave: `f-${++contatore}`,
          file: null,
          preview: "",
          file_uri: f.file_uri || "",
          nota: f.nota || "",
          annotazioni: f.annotazioni || [],
          url_annotata: f.url_annotata || "",
          dataUrlAnnotata: "",
        }))
      );
    } else {
      setCantiere(cantierePredefinito || null);
      setTitolo("");
      setNotaGenerale("");
      setItems([]);
    }
  }, [open, sessione, cantierePredefinito]);

  const aggiungiFile = (files) => {
    const nuovi = Array.from(files || []).map((file) => ({
      chiave: `n-${++contatore}`,
      file,
      preview: URL.createObjectURL(file),
      file_uri: "",
      nota: "",
      annotazioni: [],
      url_annotata: "",
      dataUrlAnnotata: "",
    }));
    if (nuovi.length) setItems((prev) => [...prev, ...nuovi]);
  };

  const cambia = (chiave, dati) =>
    setItems((prev) => prev.map((it) => (it.chiave === chiave ? { ...it, ...dati } : it)));

  const rimuovi = (chiave) => setItems((prev) => prev.filter((it) => it.chiave !== chiave));

  const salva = async () => {
    if (!cantiere?.id) {
      toast.error("Scegli il cantiere");
      return;
    }
    if (!items.length) {
      toast.error("Aggiungi almeno una foto");
      return;
    }
    setSalvando(true);
    try {
      const foto = [];
      for (const it of items) {
        const file_uri = it.file ? await caricaFotoPrivata(it.file) : it.file_uri;
        const url_annotata = it.dataUrlAnnotata
          ? await caricaAnnotataDaDataUrl(it.dataUrlAnnotata)
          : it.url_annotata;
        foto.push({
          file_uri,
          url_annotata: url_annotata || "",
          nota: it.nota || "",
          annotazioni: it.annotazioni || [],
        });
      }
      const dati = {
        cantiere_id: cantiere.id,
        cantiere_nome: cantiere.nome || "",
        titolo: titolo.trim(),
        nota_generale: notaGenerale.trim(),
        foto,
        data: new Date().toISOString(),
        user_email: user?.email || "",
        user_nome: user?.full_name || user?.email || "",
      };
      if (sessione?.id) {
        await base44.entities.FotoAndamento.update(sessione.id, dati);
        toast.success("Foto aggiornate");
      } else {
        await base44.entities.FotoAndamento.create(dati);
        toast.success("Foto salvate");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Salvataggio non riuscito: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  const inAnnotazione = indiceAnnota !== null && items[indiceAnnota];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[94vh] overflow-y-auto top-4 translate-y-0 p-0 gap-0">
        {inAnnotazione ? (
          <div className="p-4">
            <FotoEditor
              imageUrl={inAnnotazione.preview}
              annotazioni={inAnnotazione.annotazioni}
              onCancel={() => setIndiceAnnota(null)}
              onSave={({ annotazioni, url_annotata }) => {
                cambia(inAnnotazione.chiave, { annotazioni, dataUrlAnnotata: url_annotata });
                setIndiceAnnota(null);
              }}
            />
          </div>
        ) : (
          <>
            <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
              <DialogTitle className="pr-6">
                {sessione ? "Modifica foto di andamento" : "Foto andamento cantiere"}
              </DialogTitle>
            </DialogHeader>

            <div className="px-5 py-4 space-y-5">
              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cantiere *</Label>
                <div className="mt-1.5">
                  <CantiereSelect cantieri={cantieri} value={cantiere?.id || ""} onChange={setCantiere} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Titolo (facoltativo)</Label>
                <Input
                  value={titolo}
                  onChange={(e) => setTitolo(e.target.value)}
                  placeholder="Es. Avanzamento settimana"
                  className="mt-1.5"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Foto</Label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-4 flex flex-col items-center gap-1.5 transition-colors">
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Scatta</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        aggiungiFile(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <label className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-4 flex flex-col items-center gap-1.5 transition-colors">
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Dalla galleria</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        aggiungiFile(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {items.map((it, i) => (
                  <div key={it.chiave} className="flex gap-3 rounded-xl border border-border p-2.5">
                    <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
                      {it.preview ? (
                        <img src={it.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {it.annotazioni?.length > 0 && (
                        <span className="absolute bottom-1 left-1 rounded bg-primary text-primary-foreground text-[9px] px-1 font-semibold">
                          {it.annotazioni.length} ann.
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Textarea
                        value={it.nota}
                        onChange={(e) => cambia(it.chiave, { nota: e.target.value })}
                        placeholder={`Nota foto ${i + 1}`}
                        rows={2}
                        className="text-sm min-h-[52px]"
                      />
                      <div className="flex items-center gap-1">
                        {it.preview && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-[11px]"
                            onClick={() => setIndiceAnnota(i)}
                          >
                            <Edit3 className="w-3 h-3" />
                            {it.annotazioni?.length ? "Modifica disegni" : "Disegna sulla foto"}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-[11px] text-destructive ml-auto"
                          onClick={() => rimuovi(it.chiave)}
                        >
                          <Trash2 className="w-3 h-3" /> Togli
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Puoi disegnare frecce, riquadri e misure sulla foto prima di salvare. La foto originale resta intatta.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nota generale della sessione
                </Label>
                <Textarea
                  value={notaGenerale}
                  onChange={(e) => setNotaGenerale(e.target.value)}
                  placeholder="Es. Giornata di sole, ponteggio montato sul lato nord"
                  rows={3}
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
                Salva foto
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}