import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import useRegistrazione, { tempoVocale } from '@/lib/useRegistrazione';
import RecordingIndicator from '@/components/wizard/RecordingIndicator';
import RevisioneAudioDialog from '@/components/wizard/RevisioneAudioDialog';
import { preparaModifiche } from '@/components/wizard/modificheVocali';

export default function DettaturaRapportino({ righe, catalogo = [], materiale = false, oreSquadra, onConfirm }) {
  const [proposta, setProposta] = useState(null);
  const ultima = useRef(null);
  ultima.current = { righe, catalogo, oreSquadra };
  const { stato, secondi, avvia, ferma } = useRegistrazione({ filePrivato: true, onErrore: toast.error, onAudio: async (audio) => {
    const current = ultima.current;
    const { data } = await base44.functions.invoke('interpretaAudioRapportino', {
      audio, sezione: materiale ? 'materiali' : 'lavorazioni', oreSquadra: current.oreSquadra,
      righe: current.righe.map((r, i) => ({...r, riga: i + 1})),
      catalogo: current.catalogo.slice(0, 500).map(({nome, categoria, unita_misura}) => ({nome, categoria, unita_misura})),
    });
    setProposta({...preparaModifiche(current.righe, data, {...current, materiale}), snapshot: JSON.stringify([current.righe, current.oreSquadra])});
  } });
  useEffect(() => {
    if (stato === 'registrazione' && secondi >= 300) ferma();
  }, [stato, secondi, ferma]);
  const conferma = () => {
    if (proposta.snapshot !== JSON.stringify([righe, oreSquadra])) toast.error('Il rapportino è cambiato durante la dettatura. Registra di nuovo per applicare le correzioni alle voci aggiornate.');
    else onConfirm(proposta.righe);
    setProposta(null);
  };
  return <>
    <Button type="button" variant="outline" className="h-11 w-full gap-2" onClick={stato === 'registrazione' ? ferma : avvia} disabled={stato === 'elaborazione'}>
      {stato === 'registrazione' ? <><Square className="h-4 w-4" /> Ferma e rivedi <RecordingIndicator seconds={secondi} fmt={tempoVocale} /></> : stato === 'elaborazione' ? <><Loader2 className="h-4 w-4 animate-spin" /> Elaborazione…</> : <><Mic className="h-4 w-4" /> {righe.length ? 'Detta aggiunte o correzioni' : 'Registrazione vocale'}</>}
    </Button>
    <p className="text-xs text-muted-foreground">{materiale ? 'Puoi dettare nuovi materiali, correggere quantità o chiedere di rimuovere una voce.' : 'Puoi aggiungere, correggere o rimuovere voci. Per assegnare il residuo, di’ per esempio: «Le ore che restano vanno alla demolizione».'}</p>
    <RevisioneAudioDialog proposta={proposta} materiale={materiale} onClose={() => setProposta(null)} onConfirm={conferma} />
  </>;
}