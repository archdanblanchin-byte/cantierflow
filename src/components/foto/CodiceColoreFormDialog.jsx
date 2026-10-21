import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { TIPI_CAMPIONE, caricaCantieri, caricaFotoPrivata, coloreValido, estraiEtichetta } from "@/lib/campioni";
import { coloreDaFoto } from "@/lib/coloreFoto";
import FotoStrip from "@/components/campioni/FotoStrip";
import CantiereSelect from "@/components/campioni/CantiereSelect";

const CHIAVI_FOTO = ["fornitore", "azienda", "secchio", "colore"];

const formVuoto = () => ({
  nome: "",
  tipo: "Pittura",
  marca: "",
  codice: "",
  fornitore: "",
  colore_nome: "",
  colore_hex: "",
  data_etichetta: "",
  cantiere_id: "",
  cantiere_nome: "",
  note: "",
  testo_fornitore: "",
  testo_azienda: "",
});

const fotoVuote = () => ({
  fornitore: { file: null, preview: "", file_uri: "" },
  azienda: { file: null, preview: "", file_uri: "" },
  secchio: { file: null, preview: "", file_uri: "" },
  colore: { file: null, preview: "", file_uri: "" },
});

// Scheda del codice colore: le stesse quattro foto del campione (etichetta
// fornitore, etichetta ditta, contenitore, colore) che compilano il formulario.
export default function CodiceColoreFormDialog({ open, scheda, cantierePredefinito, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(formVuoto);
  const [foto, setFoto] = useState(fotoVuote);
  const [lavoro, setLavoro] = useState({});
  const [salvando, setSalvando] = useState(false);

  const formRef = useRef(form);
  formRef.current = form;

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-foto"],
    queryFn: caricaCantieri,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (scheda) {
      setForm({
        nome: scheda.nome || "",
        tipo: scheda.tipo || "Pittura",
        marca: scheda.marca || "",
        codice: scheda.codice || "",
        fornitore: scheda.fornitore || "",
        colore_nome: scheda.colore_nome || "",
        colore_hex: scheda.colore_hex || "",
        data_etichetta: scheda.data_etichetta ? String(scheda.data_etichetta).slice(0, 10) : "",
        cantiere_id: scheda.cantiere_id || "",
        cantiere_nome: scheda.cantiere_nome || "",
        note: scheda.note || "",
        testo_fornitore: scheda.testo_fornitore || "",
        testo_azienda: scheda.testo_azienda || "",
      });
      setFoto({
        fornitore: { file: null, preview: "", file_uri: scheda.foto_fornitore || "" },
        azienda: { file: null, preview: "", file_uri: scheda.foto_azienda || "" },
        secchio: { file: null, preview: "", file_uri: scheda.foto_secchio || "" },
        colore: { file: null, preview: "", file_uri: scheda.foto_colore || "" },
      });
    } else {
      setForm({
        ...formVuoto(),
        cantiere_id: cantierePredefinito?.id || "",
        cantiere_nome: cantierePredefinito?.nome || "",
      });
      setFoto(fotoVuote());
    }
    setLavoro({});
  }, [open, scheda, cantierePredefinito]);

  const setCampo = (chiave, valore) => setForm((f) => ({ ...f, [chiave]: valore }));

  // Quello che l'AI legge dall'etichetta riempie solo i campi ancora vuoti.
  const applicaEstratto = (dati, tipoEtichetta) => {
    const corrente = formRef.current;
    const next = { ...corrente };
    let riempiti = 0;

    const metti = (chiave, valore) => {
      const v = valore === undefined || valore === null ? "" : String(valore).trim();
      if (!v || String(corrente[chiave] || "").trim()) return;
      next[chiave] = v;
      riempiti += 1;
    };

    // Quello che l'etichetta dice ma non entra in un campo (o che non si legge
    // bene) finisce nelle note: nessuna informazione va persa.
    const aggiungiNota = (valore) => {
      const testo = String(valore || "").trim();
      if (!testo) return;
      const nota = String(next.note || "").trim();
      if (nota.includes(testo)) return;
      next.note = nota ? `${nota}\n${testo}` : testo;
      riempiti += 1;
    };

    if (tipoEtichetta === "fornitore") {
      metti("nome", dati.nome);
      metti("marca", dati.marca);
      metti("fornitore", dati.fornitore);
      metti("codice", dati.codice);
      metti("colore_nome", dati.colore_nome);
      metti("data_etichetta", dati.data);
      if (dati.tipo && TIPI_CAMPIONE.includes(dati.tipo) && !String(corrente.tipo || "").trim()) {
        next.tipo = dati.tipo;
        riempiti += 1;
      }
      next.testo_fornitore = corrente.testo_fornitore || String(dati.testo_letto || "").trim();
      aggiungiNota(dati.note);
    } else {
      metti("marca", dati.marca);
      metti("nome", dati.nome);
      metti("codice", dati.codice);
      metti("data_etichetta", dati.data);
      aggiungiNota(dati.note);
      next.testo_azienda = corrente.testo_azienda || String(dati.testo_letto || "").trim();

      const cercato = String(dati.cantiere_nome || "").trim().toLowerCase();
      const trovato = cercato ? cantieri.find((c) => String(c.nome || "").trim().toLowerCase() === cercato) : null;
      if (trovato && !corrente.cantiere_id) {
        next.cantiere_id = trovato.id;
        next.cantiere_nome = trovato.nome;
        riempiti += 1;
      }
    }

    setForm(next);
    return riempiti;
  };

  const scegliFoto = async (chiave, file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setFoto((f) => ({ ...f, [chiave]: { file, preview, file_uri: "" } }));

    if (chiave === "colore") {
      const hex = await coloreDaFoto(preview);
      if (hex) setForm((f) => ({ ...f, colore_hex: hex }));
      return;
    }
    if (chiave === "secchio") return;

    setLavoro((l) => ({ ...l, [chiave]: true }));
    try {
      const file_uri = await caricaFotoPrivata(file);
      setFoto((f) => ({ ...f, [chiave]: { file: null, preview, file_uri } }));
      const dati = await estraiEtichetta({ file_uri, tipo_etichetta: chiave });
      const riempiti = applicaEstratto(dati, chiave);
      toast.success(
        riempiti > 0 ? `${riempiti} campi compilati dall'etichetta` : "Nessun campo nuovo: controlla la foto"
      );
    } catch (err) {
      toast.error("Non riesco a leggere l'etichetta: " + (err?.message || "riprova"));
    } finally {
      setLavoro((l) => ({ ...l, [chiave]: false }));
    }
  };

  const rimuoviFoto = (chiave) => setFoto((f) => ({ ...f, [chiave]: { file: null, preview: "", file_uri: "" } }));

  const campiona = async (xPct, yPct) => {
    const hex = await coloreDaFoto(foto.colore.preview, xPct, yPct);
    if (hex) setForm((f) => ({ ...f, colore_hex: hex }));
  };

  const salva = async () => {
    if (!String(form.nome || "").trim()) {
      toast.error("Serve almeno il nome del prodotto");
      return;
    }
    setSalvando(true);
    try {
      const dati = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        marca: form.marca.trim(),
        codice: form.codice.trim(),
        fornitore: form.fornitore.trim(),
        colore_nome: form.colore_nome.trim(),
        colore_hex: form.colore_hex,
        data_etichetta: form.data_etichetta || null,
        cantiere_id: form.cantiere_id || "",
        cantiere_nome: form.cantiere_nome || "",
        note: form.note.trim(),
        testo_fornitore: form.testo_fornitore,
        testo_azienda: form.testo_azienda,
        data: new Date().toISOString(),
        user_email: user?.email || "",
        user_nome: user?.full_name || user?.email || "",
      };

      for (const chiave of CHIAVI_FOTO) {
        const f = foto[chiave];
        dati[`foto_${chiave}`] = f.file ? await caricaFotoPrivata(f.file) : f.file_uri;
      }

      if (scheda?.id) {
        await base44.entities.CodiceColore.update(scheda.id, dati);
        toast.success("Codice colore aggiornato");
      } else {
        await base44.entities.CodiceColore.create(dati);
        toast.success("Codice colore salvato");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Salvataggio non riuscito: " + (err?.message || "riprova"));
    } finally {
      setSalvando(false);
    }
  };

  const hex = coloreValido(form.colore_hex) ? form.colore_hex : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[94vh] overflow-y-auto top-4 translate-y-0 p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
          <DialogTitle className="pr-6">{scheda ? "Modifica codice colore" : "Nuovo codice colore"}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          <FotoStrip foto={foto} lavoro={lavoro} onScegli={scegliFoto} onRimuovi={rimuoviFoto} onCampiona={campiona} />

          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo di prodotto</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TIPI_CAMPIONE.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCampo("tipo", t)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors ${
                    form.tipo === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Nome prodotto</Label>
              <Input value={form.nome} onChange={(e) => setCampo("nome", e.target.value)} placeholder="Es. Quarzolite Tonachino" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Marca</Label>
                <Input value={form.marca} onChange={(e) => setCampo("marca", e.target.value)} />
              </div>
              <div>
                <Label>Codice</Label>
                <Input value={form.codice} onChange={(e) => setCampo("codice", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Colore (nome)</Label>
                <Input value={form.colore_nome} onChange={(e) => setCampo("colore_nome", e.target.value)} placeholder="Es. Grigio chiaro" />
              </div>
              <div>
                <Label>Fornitore</Label>
                <Input value={form.fornitore} onChange={(e) => setCampo("fornitore", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hex || "#cccccc"}
                onChange={(e) => setCampo("colore_hex", e.target.value)}
                className="w-9 h-9 rounded-lg border border-border bg-transparent cursor-pointer p-0.5 shrink-0"
              />
              <span className="text-[11px] text-muted-foreground">
                {hex
                  ? `Tinta rilevata ${hex} · correggila qui o tocca il riquadro colore`
                  : "Nessuna tinta rilevata: scatta la foto colore o scegli a mano"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data etichetta</Label>
                <Input type="date" value={form.data_etichetta} onChange={(e) => setCampo("data_etichetta", e.target.value)} />
              </div>
              <div>
                <Label>Cantiere</Label>
                <CantiereSelect
                  cantieri={cantieri}
                  value={form.cantiere_id}
                  onChange={(c) => {
                    setCampo("cantiere_id", c?.id || "");
                    setCampo("cantiere_nome", c?.nome || "");
                  }}
                />
              </div>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setCampo("note", e.target.value)}
                rows={3}
                placeholder="Qui finisce anche quello che sull'etichetta non è chiaro o non entra negli altri campi"
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Annulla
          </Button>
          <Button className="flex-1 gap-2" onClick={salva} disabled={salvando}>
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {scheda ? "Salva modifiche" : "Salva codice colore"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}