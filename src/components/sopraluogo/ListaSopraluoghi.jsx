import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CalendarDays, User, MapPin, Trash2, Phone, Mail, ChevronRight, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { STATI_PERCORSO, ORDINE_PERCORSO, calcolaStatoPercorso, infoStatoPercorso } from '@/lib/statoSopraluogo';

const FILTRI = ['tutti', ...ORDINE_PERCORSO];

export default function ListaSopraluoghi({ sopraluoghi, onNew, onOpen, onDelete, onImpostazioni, onUpdateStato, isLoading }) {
  const [search, setSearch] = useState('');
  const [filtroStato, setFiltroStato] = useState('tutti');

  const conteggi = useMemo(() => {
    const c = { tutti: sopraluoghi.length };
    ORDINE_PERCORSO.forEach((k) => { c[k] = 0; });
    sopraluoghi.forEach((s) => {
      const k = calcolaStatoPercorso(s);
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [sopraluoghi]);

  const filtrati = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sopraluoghi.filter((s) => {
      if (filtroStato !== 'tutti' && calcolaStatoPercorso(s) !== filtroStato) return false;
      if (!q) return true;
      return (s.cliente_nome || '').toLowerCase().includes(q) ||
        (s.cliente_indirizzo || '').toLowerCase().includes(q) ||
        (s.cliente_citta || '').toLowerCase().includes(q) ||
        (s.cliente_telefono || '').toLowerCase().includes(q) ||
        (s.cliente_mail || '').toLowerCase().includes(q);
    });
  }, [sopraluoghi, search, filtroStato]);

  const filtriAttivi = !!search.trim() || filtroStato !== 'tutti';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="px-12 text-lg font-bold">Sopralluoghi</h2>
          <p className="text-muted-foreground px-12 text-sm">{sopraluoghi.length} sopralluoghi registrati</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onNew} size="sm" className="gap-1.5 flex-shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuovo</span>
          </Button>
          <Button onClick={onImpostazioni} size="sm" variant="ghost" className="h-9 w-9 p-0 flex-shrink-0" title="Impostazioni">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Barra di ricerca */}
      {sopraluoghi.length > 0 && (
        <div className="px-12 relative">
          <Search className="absolute left-14 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cerca per cliente, indirizzo, telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Filtri per livello del percorso */}
      {sopraluoghi.length > 0 && (
        <div className="px-12 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {FILTRI.map((k) =>
            <button
              key={k}
              type="button"
              onClick={() => setFiltroStato(k)}
              className={cn(
                'flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors flex-shrink-0',
                filtroStato === k ?
                'bg-primary text-primary-foreground border-primary' :
                'border-border text-muted-foreground hover:bg-muted'
              )}>
              {k === 'tutti' ? 'Tutti' : STATI_PERCORSO[k].label}
              <span className={cn('text-[10px] font-semibold', filtroStato === k ? 'opacity-80' : 'opacity-60')}>{conteggi[k]}</span>
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {isLoading ?
      <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div> :
      sopraluoghi.length === 0 ?
      <div className="text-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nessun sopraluogo ancora</p>
          <p className="text-sm mt-1">Tocca "+" per iniziare</p>
        </div> :
      filtriAttivi && filtrati.length === 0 ?
      <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border rounded-xl">
        <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="font-medium text-sm">
          {filtroStato !== 'tutti' ?
            `Nessun sopralluogo in stato "${STATI_PERCORSO[filtroStato].label}"` :
            `Nessun risultato per "${search}"`}
        </p>
      </div> :
      <div className="space-y-2">
          {filtrati.map((s) => {
          const stato = infoStatoPercorso(s);
          return (
            <div
              key={s.id}
              className="bg-card border border-border/60 rounded-xl p-3 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => onOpen(s)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-semibold text-sm leading-tight">{s.cliente_nome}</span>
                    {s.preventivo_numero &&
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                        Prev. {s.preventivo_numero}
                      </span>
                  }
                    {s.stanze?.length > 0 &&
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                        {s.stanze.length} stanz{s.stanze.length === 1 ? 'a' : 'e'}
                      </span>
                  }
                    {s.foto_esterno?.length > 0 &&
                  <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                        📸 {s.foto_esterno.length} foto
                      </span>
                  }
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Select value={stato.key} onValueChange={(v) => onUpdateStato(s.id, v)}>
                      <SelectTrigger
                        className={cn('h-7 w-[152px] text-[11px] px-2 mr-1 border-transparent font-medium', stato.className)}
                        title="Stato sopralluogo">
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0 mr-1.5', stato.dot)} />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDINE_PERCORSO.map((k) =>
                        <SelectItem key={k} value={k} className="text-xs">{STATI_PERCORSO[k].label}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
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
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {s.data_sopraluogo &&
                <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 flex-shrink-0" />
                      {format(new Date(s.data_sopraluogo), 'd MMM yyyy', { locale: it })}
                    </span>
                }
                  {s.cliente_indirizzo &&
                <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[160px]">{s.cliente_indirizzo}</span>
                    </span>
                }
                  {s.cliente_telefono &&
                <a href={`tel:${s.cliente_telefono}`} className="flex items-center gap-1 hover:text-primary" onClick={(e) => e.stopPropagation()}>
                      <Phone className="w-3 h-3 flex-shrink-0" />{s.cliente_telefono}
                    </a>
                }
                  {s.cliente_mail &&
                <a href={`mailto:${s.cliente_mail}`} className="flex items-center gap-1 hover:text-primary truncate max-w-[160px]" onClick={(e) => e.stopPropagation()}>
                      <Mail className="w-3 h-3 flex-shrink-0" />{s.cliente_mail}
                    </a>
                }
                </div>
              </div>);
        }
        )}
        </div>
      }
    </div>);
}