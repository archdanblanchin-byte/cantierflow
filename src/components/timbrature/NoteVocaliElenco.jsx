import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function AudioNota({ uri }) {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  async function ascolta() {
    setBusy(true);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({file_uri:uri, expires_in:1800});
      setUrl(signed_url);
    } catch { toast.error('Audio non disponibile. Riprova.'); }
    finally { setBusy(false); }
  }
  return url ? <audio className="w-full" controls src={url} preload="none" onError={() => {setUrl(null); toast.error('Audio non disponibile. Riprova.');}} aria-label="Registrazione della nota" /> : <Button type="button" size="sm" variant="outline" disabled={busy} onClick={ascolta}>{busy ? 'Caricamento audio…' : 'Ascolta audio'}</Button>;
}

export default function NoteVocaliElenco({ giorno, userId, cantiereId, tutte = false, empty = false }) {
  const {data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage} = useInfiniteQuery({
    queryKey:['note-vocali-timbratura', giorno, userId, cantiereId, tutte], enabled:!!giorno && (tutte || !!userId), initialPageParam:undefined,
    queryFn:({pageParam}) => base44.entities.NotaVocaleTimbratura.filter({data:giorno,...(tutte ? {} : {user_id:userId}),...(cantiereId ? {cantiere_id:cantiereId} : {})},{sort:'-created_date',limit:15,...(pageParam ? {cursor:pageParam} : {})}),
    getNextPageParam:page => page.has_more ? page.next_cursor : undefined,
  });
  if (!giorno || (!userId && !tutte)) return null;
  if (isPending) return <p className="text-xs text-muted-foreground">Caricamento note vocali…</p>;
  if (isError && !data) return <p role="alert" className="text-xs text-destructive">Non è stato possibile caricare le note vocali.</p>;
  const note = data.pages.flatMap(page => page.items);
  if (!note.length) return empty ? <p className="text-xs text-muted-foreground">Nessuna nota vocale per questa giornata.</p> : null;
  return <div className="space-y-2">
    <h3 className="text-xs font-semibold text-muted-foreground">Note vocali salvate</h3>
    {note.map(n => <details key={n.id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">{n.cantiere_nome || 'Nota vocale'}{tutte && ` · ${n.user_nome || n.user_email}`} · {new Date(n.created_date).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'})}</summary>
      <div className="mt-2 space-y-2">
        <p className="whitespace-pre-wrap break-words">{n.trascrizione}</p>
        {!!n.attivita?.length && <ul className="list-disc pl-5 text-xs text-muted-foreground">{n.attivita.map((a,i) => <li key={i}>{a.nome}{Number.isFinite(a.ore) && ` · ${a.ore.toLocaleString('it-IT',{maximumFractionDigits:2})} h`} · {a.cantiere_nome || n.cantiere_nome || (a.cantiere_citato ? `Non assegnato (citato: ${a.cantiere_citato})` : 'Non assegnato')}</li>)}</ul>}
        <AudioNota uri={n.audio_uri} />
      </div>
    </details>)}
    {hasNextPage && <Button type="button" size="sm" variant="outline" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>{isFetchingNextPage ? 'Caricamento…' : 'Carica altre note'}</Button>}
  </div>;
}