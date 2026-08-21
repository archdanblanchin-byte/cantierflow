import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import SheetSelect from "@/components/ui/sheet-select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Car, UserCog } from "lucide-react";

function todayRome() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

export default function UsoFurgoneFormDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [data, setData] = useState(todayRome());
  const [furgoneId, setFurgoneId] = useState("");
  const [collaboratoreId, setCollaboratoreId] = useState("");
  const [tipoOrario, setTipoOrario] = useState("tutta_giornata");
  const [oraInizio, setOraInizio] = useState("");
  const [oraFine, setOraFine] = useState("");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);
  // conducente: modalità "anagrafe" (select) oppure "manuale" (nome libero)
  const [modalitaConducente, setModalitaConducente] = useState("anagrafe");
  const [conducenteManuale, setConducenteManuale] = useState("");

  const { data: furgoni = [] } = useQuery({
    queryKey: ["anagrafe", "Furgone"],
    queryFn: () => base44.entities.Furgone.list(),
  });
  const { data: collaboratori = [] } = useQuery({
    queryKey: ["anagrafe", "Collaboratore"],
    queryFn: () => base44.entities.Collaboratore.list(),
  });
  const { data: currentUser } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => base44.auth.me(),
  });

  // Precompila il conducente con il collaboratore collegato all'utente corrente
  useEffect(() => {
    if (!collaboratori.length || !currentUser) return;
    if (collaboratoreId) return; // già impostato
    const match = collaboratori.find(
      c => c.user_email && c.user_email.toLowerCase() === (currentUser.email || "").toLowerCase()
    );
    if (match) {
      setCollaboratoreId(match.id);
      setModalitaConducente("anagrafe");
    } else if (currentUser.full_name) {
      // Nessun collaboratore collegato: passa in modalità manuale col nome utente
      setConducenteManuale(currentUser.full_name);
      setModalitaConducente("manuale");
    }
  }, [collaboratori, currentUser]);

  const furgone = furgoni.find(f => f.id === furgoneId);
  const collaboratore = collaboratori.find(c => c.id === collaboratoreId);

  const reset = () => {
    setData(todayRome());
    setFurgoneId("");
    setCollaboratoreId("");
    setConducenteManuale("");
    setTipoOrario("tutta_giornata");
    setOraInizio("");
    setOraFine("");
    setNota("");
  };

  const conducenteNome =
    modalitaConducente === "manuale"
      ? conducenteManuale.trim()
      : collaboratore?.nome || "";

  const canSave = !!data && !!furgoneId && !!conducenteNome &&
    (tipoOrario === "tutta_giornata" || (!!oraInizio && !!oraFine));

  const handleSubmit = async () => {
    if (!canSave) return;
    setSalvando(true);
    try {
      await base44.functions.invoke("registra_uso_furgone", {
        data,
        furgone_id: furgoneId,
        furgone_nome: furgone?.nome || "",
        collaboratore_id: modalitaConducente === "anagrafe" ? collaboratoreId : "",
        collaboratore_nome: conducenteNome,
        tipo_orario: tipoOrario,
        ora_inizio: oraInizio,
        ora_fine: oraFine,
        nota,
      });
      toast({ title: "Uso furgone registrato", description: "L'amministrazione è stata notificata." });
      queryClient.invalidateQueries({ queryKey: ["uso-furgoni"] });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" /> Nuovo uso furgone
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Data</Label>
            <Input type="date" value={data} onChange={e => setData(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Furgone</Label>
            <SheetSelect
              value={furgoneId}
              onValueChange={setFurgoneId}
              placeholder="Seleziona furgone"
              options={furgoni.map(f => ({ value: f.id, label: f.targa ? `${f.nome} · ${f.targa}` : f.nome }))}
            />
          </div>
          <div>
            <Label>Conducente</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={modalitaConducente === "anagrafe" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setModalitaConducente("anagrafe")}
              >
                <UserCog className="w-4 h-4" /> Dall'anagrafe
              </Button>
              <Button
                type="button"
                variant={modalitaConducente === "manuale" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setModalitaConducente("manuale")}
              >
                Nome manuale
              </Button>
            </div>
            {modalitaConducente === "anagrafe" ? (
              <SheetSelect
                value={collaboratoreId}
                onValueChange={setCollaboratoreId}
                placeholder="Seleziona collaboratore"
                options={collaboratori.map(c => ({ value: c.id, label: c.nome }))}
              />
            ) : (
              <Input
                value={conducenteManuale}
                onChange={e => setConducenteManuale(e.target.value)}
                placeholder="Scrivi il nome del conducente"
                className="mt-2"
              />
            )}
            {modalitaConducente === "anagrafe" && collaboratore && currentUser &&
             collaboratore.user_email?.toLowerCase() === currentUser.email?.toLowerCase() && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Precompilato con il tuo profilo. Puoi cambiarlo se necessario.
              </p>
            )}
          </div>
          <div>
            <Label>Orario</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={tipoOrario === "tutta_giornata" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setTipoOrario("tutta_giornata")}
              >
                Tutta la giornata
              </Button>
              <Button
                type="button"
                variant={tipoOrario === "fascia" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setTipoOrario("fascia")}
              >
                Fascia oraria
              </Button>
            </div>
          </div>
          {tipoOrario === "fascia" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Dalle</Label>
                <Input type="time" value={oraInizio} onChange={e => setOraInizio(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Alle</Label>
                <Input type="time" value={oraFine} onChange={e => setOraFine(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}
          <div>
            <Label>Note / problemi (spie, accessi, anomalie)</Label>
            <Textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={3}
              className="mt-1"
              placeholder="Descrivi eventuali problemi riscontrati sul furgone..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={!canSave || salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}