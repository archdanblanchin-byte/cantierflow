import React, { useState } from 'react';
import AllegatiSopraluogo from './AllegatiSopraluogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, CalendarDays, MapPin, Phone, Mail, Image, CloudUpload, Loader2, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import PdfSopraluogo from './PdfSopraluogo';
import FotoLightbox from './FotoLightbox';
import FotoConQuotePreview from './FotoConQuotePreview';
import DettaglioStanzeCompleto from './DettaglioStanzeCompleto';
import DettaglioRilievi from './DettaglioRilievi';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { infoStatoPercorso } from '@/lib/statoSopraluogo';
import { generaPdfRilievo } from '@/lib/pdfRilievo';

export default function AnteprimaSopraluogo({ sopraluogo, onBack, onEdit, onDelete }) {
  const [lightbox, setLightbox] = useState(null); // { urls: [], indice: 0 }
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveResult, setDriveResult] = useState(null);
  const { toast } = useToast();

  if (!sopraluogo) return null;

  const s = sopraluogo;
  const stato = infoStatoPercorso(s);
  const giaSalvato = !!(s.drive_folder_id || driveResult);

  const apriLightbox = (urls, indice) => setLightbox({ urls, indice });
  const chiudiLightbox = () => setLightbox(null);
  const prevFoto = () => setLightbox((lb) => ({ ...lb, indice: (lb.indice - 1 + lb.urls.length) % lb.urls.length }));
  const nextFoto = () => setLightbox((lb) => ({ ...lb, indice: (lb.indice + 1) % lb.urls.length }));

  const handleSalvaDrive = async () => {
    if (!s.cliente_nome || !s.cliente_citta) {
      toast({
        title: 'Dati mancanti',
        description: 'Nome cliente e città sono necessari per creare la cartella su Drive.',
        variant: 'destructive'
      });
      return;
    }
    setDriveLoading(true);
    try {
      let pdfBase64 = null;
      try { pdfBase64 = await generaPdfRilievo(s); } catch { pdfBase64 = null; }
      const res = await base44.functions.invoke('salvaSopraluogoDrive', { sopraluogoId: s.id, pdfBase64 });
      const data = res.data;
      setDriveResult({ folderLink: data.folderLink, cartella: data.cartella, anno: data.anno, avviso_duplicato: data.avviso_duplicato, messaggio_avviso: data.messaggio_avviso });
      toast({
        title: data.aggiornamento ? 'Aggiornato su Drive' : 'Salvato su Drive',
        description: data.aggiornamento ?
        `PDF aggiornato nella cartella "${data.cartella}" (Clienti/RILIEVI/${data.anno}/Rilievi).` :
        `Cartella "${data.cartella}" creata in Clienti/RILIEVI/${data.anno}. PDF salvato nella sottocartella Rilievi.`
      });
      if (data.avviso_duplicato) {
        toast({
          title: '⚠️ Cartellina duplicata',
          description: data.messaggio_avviso,
          variant: 'destructive'
        });
      }
    } catch (e) {
      toast({
        title: 'Errore salvataggio Drive',
        description: e?.response?.data?.error || e.message || 'Errore sconosciuto',
        variant: 'destructive'
      });
    }
    setDriveLoading(false);
  };

  return (
    <div className="bg-background min-h-screen flex flex-col mt-10">
      {/* Navbar */}
      <div className="bg-background px-4 fixed top-10 left-0 right-0 z-20 border-b border-border flex items-center gap-3 shadow-sm py-2">
        <Button type="button" size="sm" variant="ghost" onClick={onBack} className="h-8 w-8 p-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{s.cliente_nome}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <PdfSopraluogo sopraluogo={s} compact />
          {giaSalvato &&
          <a href={driveResult?.folderLink || `https://drive.google.com/drive/folders/${s.drive_folder_id}`} target="_blank" rel="noreferrer">
            </a>
          }
          <Button type="button" size="sm" className="gap-1.5 h-8" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" /> Modifica
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" size="sm" variant="destructive" className="h-8 gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminare "{s.cliente_nome}"?</AlertDialogTitle>
                <AlertDialogDescription>Questa azione non può essere annullata.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Elimina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Contenuto */}
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full px-4 py-6 mt-16 space-y-6">
        {/* Header cliente */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{s.cliente_nome}</h2>
            <Badge className={`text-[10px] px-2 ${stato.className}`}>
              {stato.label}
            </Badge>
          </div>
          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {s.data_sopraluogo &&
            <span className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                {format(new Date(s.data_sopraluogo), 'd MMMM yyyy', { locale: it })}
              </span>
            }
            {s.cliente_indirizzo &&
            <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {s.cliente_indirizzo}{s.cliente_citta ? `, ${s.cliente_citta}` : ''}
              </span>
            }
            {s.cliente_telefono &&
            <a href={`tel:${s.cliente_telefono}`} className="flex items-center gap-2 hover:text-primary">
                <Phone className="w-4 h-4 flex-shrink-0" />{s.cliente_telefono}
              </a>
            }
            {s.cliente_mail &&
            <a href={`mailto:${s.cliente_mail}`} className="flex items-center gap-2 hover:text-primary">
                <Mail className="w-4 h-4 flex-shrink-0" />{s.cliente_mail}
              </a>
            }
          </div>
        </div>

        {/* Note */}
        {(s.prodotti_particolari || s.note_generali || s.note_dettaglio) &&
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold">Note</h3>
            {s.prodotti_particolari &&
          <div>
                <p className="text-xs text-muted-foreground mb-0.5">Prodotti particolari</p>
                <p className="text-sm">{s.prodotti_particolari}</p>
              </div>
          }
            {s.note_generali &&
          <div>
                <p className="text-xs text-muted-foreground mb-0.5">Note generali</p>
                <p className="text-sm">{s.note_generali}</p>
              </div>
          }
            {s.note_dettaglio &&
          <div>
                <p className="text-xs text-muted-foreground mb-0.5">Dettagli</p>
                <p className="text-sm">{s.note_dettaglio}</p>
              </div>
          }
          </div>
        }

        {/* Nota vocale AI */}
        {s.audio_note &&
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-green-800">🎙️ Analisi Sopraluogo (AI)</h3>
            <p className="text-sm whitespace-pre-wrap text-green-900 leading-relaxed">
              {s.audio_note.replace(/📋 TRASCRIZIONE\n[\s\S]*?\n\n/, '')}
            </p>
          </div>
        }

        {/* Lavorazioni AI */}
        {s.audio_lavorazioni &&
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-blue-800">🔨 Lavorazioni da eseguire (AI)</h3>
            <p className="text-sm whitespace-pre-wrap text-blue-900 leading-relaxed">
              {s.audio_lavorazioni.replace(/📋 TRASCRIZIONE\n[\s\S]*?\n\n/, '')}
            </p>
          </div>
        }

        {/* Rilevamento misure per lavorazione */}
        {s.rilievi?.length > 0 &&
        <DettaglioRilievi rilievi={s.rilievi} onFotoClick={(urls, i) => apriLightbox(urls, i)} />
        }

        {/* Misure di riferimento */}
        {s.misure_extra?.length > 0 && (() => {
          const interne = s.misure_extra.filter(m => (m.ambito || 'interno') === 'interno');
          const esterne = s.misure_extra.filter(m => m.ambito === 'esterno');
          const renderItems = (items) => (
            <div className="grid grid-cols-2 gap-2">
              {items.map((me, i) =>
                <div key={i} className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  <span className="text-sm text-muted-foreground truncate">{me.descrizione || '—'}</span>
                  <span className="text-sm font-bold text-amber-700 flex-shrink-0 ml-2">
                    {me.valore || 0} {me.unita || ''}
                  </span>
                </div>
              )}
            </div>
          );
          return (
            <div className="bg-card border border-amber-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                📐 Misure di riferimento (non sommate) ({s.misure_extra.length})
              </h3>
              {interne.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-1.5">🏠 Interne</p>
                  {renderItems(interne)}
                </div>
              )}
              {esterne.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-green-700 mb-1.5">🌳 Esterne</p>
                  {renderItems(esterne)}
                </div>
              )}
            </div>
          );
        })()}

        {/* Metrature & Rilievo */}
        {s.stanze?.length > 0 &&
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold">📐 Metrature & Rilievo ({s.stanze.length})</h3>
            <DettaglioStanzeCompleto stanze={s.stanze} />
          </div>
        }

        {/* Foto generali */}
        {s.foto_generali?.length > 0 &&
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Image className="w-4 h-4" /> Foto generali ({s.foto_generali.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {s.foto_generali.map((url, i) =>
            <img key={i} src={url} alt="" onClick={() => apriLightbox(s.foto_generali, i)}
            className="w-full aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-transform" />
            )}
            </div>
          </div>
        }

        {/* Foto esterno */}
        {s.foto_esterno?.length > 0 &&
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              📐 Foto & Quote ({s.foto_esterno.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {s.foto_esterno.map((f, i) =>
            <FotoConQuotePreview
              key={i}
              fotoObj={f}
              onClick={() => apriLightbox(s.foto_esterno.map((x) => x.url_annotata || x.url || x), i)} />
            )}
            </div>
          </div>
        }

        {/* Allegati */}
        {s.allegati?.length > 0 &&
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              📎 Documenti allegati ({s.allegati.length})
            </h3>
            <AllegatiSopraluogo allegati={s.allegati} onChange={() => {}} />
          </div>
        }

        {/* Pulsante PDF grande in fondo */}
        <PdfSopraluogo sopraluogo={s} />
      </div>

      {/* Lightbox */}
      {lightbox &&
      <FotoLightbox
        foto={lightbox.urls[lightbox.indice]}
        indice={`${lightbox.indice + 1} / ${lightbox.urls.length}`}
        onClose={chiudiLightbox}
        onPrev={lightbox.urls.length > 1 ? prevFoto : null}
        onNext={lightbox.urls.length > 1 ? nextFoto : null} />
      }
    </div>);
}