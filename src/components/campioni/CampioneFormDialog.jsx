import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { TIPI_CAMPIONE, UNITA_CAMPIONE, caricaFotoPrivata, caricaCantieri, estraiEtichetta } from "@/lib/campioni";
import { coloreDaFoto } from "@/lib/coloreFoto";
import EtichettaField from "@/components/campioni/EtichettaField";
import FotoColoreField from "@/components/campioni/FotoColoreField";
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
  quantita: "",
  unita_misura: "L",
  data_etichetta: "",
  cantiere_etichetta: "",
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

export default function CampioneFormDialog({ open, campione, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(formVuoto);
  const [foto, setFoto] = useState(fotoVuote);
  const [trascrivendo, setTrascrivendo] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const { data: cantieri = [] } = useQuery({
    queryKey: ["cantieri-campioni"],
    queryFn: caricaCantieri,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (campione) {
      setForm({
        nome: campione.nome || "",
        tipo: campione.tipo || "Pittura",
        marca: campione.marca || "",
        codice: campione.codice || "",
        fornitore: campione.fornitore || "",
        colore_nome: campione.colore_nome || "",
        colore_hex: campione.colore_hex || "",
        quantita: campione.quantita ? String(campione.quantita) : "",
        unita_misura: campione.unita_misura || "L",
        data_etichetta: campione.data_etichetta ? String(campione.data_etichetta).slice(0, 10) : "",
        cantiere_etichetta: campione.cantiere_etichetta || "",
        cantiere_id: campione.cantiere_id || "",
        cantiere_nome: campione.cantiere_nome || "",
        note: campione.note || "",
        testo_fornitore: campione.testo_fornitore || "",
        testo_azienda: campione.testo_azienda || "",
      });
      setFoto({
        fornitore: { file: null, preview: "", file_uri: campione.foto_fornitore || "" },
        azienda: { file: null, preview: "", file_uri: campione.foto_azienda || "" },
        secchio: { file: null, preview: "", file_uri: campione.foto_secchio || "" },
        colore: { file: null, preview: "", file_uri: campione.foto_colore || "" },
      });
    } else {
      setForm(formVuoto());
      setFoto(fotoVuote());
    }
  }, [open, campione]);

  const setCampo = (chiave, valore) => setForm((f) => ({ ...f, [chiave]: valore }));

  const scegliFoto = async (chiave, file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setFoto((f) => ({ ...f, [chiave]: { file, preview, file_uri: f[chiave].file_uri } }));
    if (chiave === "colore") {
      const hex = await coloreDaFoto(preview);
      setForm((f) => ({ ...f, colore_hex: hex }));
    }
  };

  const rimuoviFoto = (chiave) =>
    setFoto((f) => ({ ...f, [chiave]: { file: null, preview: "", file_uri: "" } }));

  const campiona = async (xPct, yPct) => {
    const hex = await coloreDaFoto(foto.colore.preview, xPct, yPct);
    setForm((f) => ({ ...f, colore_hex: hex }));
  };

  // I dati letti dall'AI riempiono solo i campi ancora vuoti: quello che
  // l'utente ha già scritto o corretto non viene mai sovrascritto.
  const applicaEstratto = (dati, tipoEtichetta) => {
    const next = { ...form };
    let riempiti = 0;
    const metti = (chiave, valore) => {
      const v = valore === undefined || valore === null ? "" : String(valore).trim();
      if (!v || String(form[chiave] || "").trim()) return;
      next[chiave] = v;
      riempiti += 1;
    };

    if (tipoEtichetta === "fornitore") {
      metti("nome", dati.nome);
      metti("marca", dati.marca);
      metti("fornitore", dati.fornitore);
      metti("codice", dati.codice);
      metti("colore_nome", dati.colore_nome);
      metti("data_etichetta", dati.data);
      metti("unita_misura", dati.unita_misura);
      if (dati.quantita && !String(form.quantita || "").trim()) {
        next.quantita = String(dati.quantita);
        riempiti += 1;
      }
      if (dati.tipo && TIPI_CAMPIONE.includes(dati.tipo) && !String(form.tipo || "").trim()) {
        next.tipo = dati.tipo;
        riempiti += 1;
      }
      next.testo_fornitore = form.testo_fornitore || String(dati.testo_letto || "").trim();
    } else {
      metti("cantiere_etichetta", dati.cantiere_nome);
      metti("marca", dati.marca);
      metti("nome", dati.nome);
      metti("codice", dati.codice);
      metti("data_etichetta", dati.data);
      metti("note", dati.note);
      next.testo_azienda = form.testo_azienda || String(dati.testo_letto || "").trim();

      const cercato = String(dati.cantiere_nome || "").trim().toLowerCase();
      const trovato = cercato
        ? cantieri.find((c) => String(c.nome || "").trim().toLowerCase() === cercato)
        : null;
      if (trovato && !form.cantiere_id) {
        next.cantiere_id = trovato.id;
        next.cantiere_nome = trovato.nome;
        riempiti += 1;
      }
    }

    setForm(next);
    return riempiti;
  };

  const trascrivi = async (chiave) => {
    const f = foto[chiave];
    if (!f.file && !f.file_uri) return;
    setTrascrivendo(chiave);
    try {
      const file_uri = f.file ? await caricaFotoPrivata(f.file) : f.file_uri;
      if (f.file) setFoto((p) => ({ ...p, [chiave]: { ...p[chiave], file: null, file_uri } }));
      const dati = await estraiEtichetta({ file_uri, tipo_etichetta: chiave });
      const riempiti = applicaEstratto(dati, chiave);
      toast.success(
        riempiti > 0 ? `${riempiti} campi compilati dall'etichetta` : "Nessun campo nuovo da compilare"
      );
    } catch (err) {
      toast.error("Trascrizione non riuscita: " + (err?.message || "riprova"));
    } finally {
      setTrascrivendo(null);
    }
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
        quantita: Number(form.quantita) || 0,
        unita_misura: form.unita_misura,
        data_etichetta: form.data_etichetta || null,
        cantiere_etichetta: form.cantiere_etichetta.trim(),
        cantiere_id: form.cantiere_id || "",
        cantiere_nome: form.cantiere_nome || "",
        note: form.note.trim(),
        testo_fornitore: form.testo_fornitore,
        testo_azienda: form.testo_azienda,
      };

      for (const chiave of CHIAVI_FOTO) {
        const f = foto[chiave];
        dati[`foto_${chiave}`] = f.file ? await caricaFotoPrivata(f.file) : f.file_uri;
      }

      if (campione?.id) {
        await base44.entities.Campione.update(campione.id, dati);
        toast.success("Campione aggiornato");
      } else {
        await base44.entities.Campione.create({
          ...dati,
          stato: "disponibile",
          user_email: user?.email || "",
          user_nome: user?.full_name || user?.email || "",
        });
        toast.success("Campione salvato");
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[94vh] overflow-y-auto top-4 translate-y-0 p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border px-5 py-4">
          <DialogTitle className="pr-6">{campione ? "Modifica campione" : "Nuovo campione"}</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo di materiale</Label>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Quantità</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={form.quantita}
                  onChange={(e) => setCampo("quantita", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Unità</Label>
                <select
                  value={form.unita_misura}
                  onChange={(e) => setCampo("unita_misura", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {UNITA_CAMPIONE.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data etichetta</Label>
                <Input type="date" value={form.data_etichetta} onChange={(e) => setCampo("data_etichetta", e.target.value)} />
              </div>
              <div>
                <Label>Cantiere sull'etichetta</Label>
                <Input value={form.cantiere_etichetta} onChange={(e) => setCampo("cantiere_etichetta", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Cantiere di provenienza</Label>
              <CantiereSelect
                cantieri={cantieri}
                value={form.cantiere_id}
                onChange={(c) => {
                  setCampo("cantiere_id", c?.id || "");
                  setCampo("cantiere_nome", c?.nome || "");
                }}
                placeholder="Da dove arriva l'avanzo"
              />
            </div>
            <div>
              <Label>Note</Label>
              <Textarea value={form.note} onChange={(e) => setCampo("note", e.target.value)} rows={2} />
            </div>
          </div>

          <div className="space-y-4 border-t border-border pt-4">
            <EtichettaField
              label="Etichetta fornitore"
              preview={foto.fornitore.preview}
              fileUri={foto.fornitore.file_uri}
              onScegli={(f) => scegliFoto("fornitore", f)}
              onRimuovi={() => rimuoviFoto("fornitore")}
              onTrascrivi={() => trascrivi("fornitore")}
              trascrivendo={trascrivendo === "fornitore"}
              hint="Foto dell'etichetta del produttore: l'AI trascrive prodotto, codice, data e litri."
            />
            <EtichettaField
              label="Etichetta ditta"
              preview={foto.azienda.preview}
              fileUri={foto.azienda.file_uri}
              onScegli={(f) => scegliFoto("azienda", f)}
              onRimuovi={() => rimuoviFoto("azienda")}
              onTrascrivi={() => trascrivi("azienda")}
              trascrivendo={trascrivendo === "azienda"}
              hint="Foto dell'etichetta della nostra ditta: l'AI legge cantiere, marca, prodotto e codice."
            />
            <EtichettaField
              label="Contenitore"
              preview={foto.secchio.preview}
              fileUri={foto.secchio.file_uri}
              onScegli={(f) => scegliFoto("secchio", f)}
              onRimuovi={() => rimuoviFoto("secchio")}
              hint="Foto del secchio o bidone, per riconoscerlo in capannone."
            />
            <FotoColoreField
              colore={form.colore_hex}
              preview={foto.colore.preview}
              fileUri={foto.colore.file_uri}
              onScegli={(f) => scegliFoto("colore", f)}
              onColore={(hex) => setCampo("colore_hex", hex)}
              onCampiona={campiona}
              onRimuovi={() => rimuoviFoto("colore")}
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Annulla
          </Button>
          <Button className="flex-1 gap-2" onClick={salva} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            {campione ? "Salva modifiche" : "Salva campione"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}