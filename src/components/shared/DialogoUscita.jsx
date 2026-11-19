import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function DialogoUscita({ open, onRimani, onEsci, onSalva }) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onRimani(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Modifiche non salvate</AlertDialogTitle>
          <AlertDialogDescription>
            Hai delle modifiche non salvate. Salvale prima di uscire, oppure esci senza salvare.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onRimani}>Rimani</AlertDialogCancel>
          <AlertDialogAction onClick={onEsci} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Esci senza salvare
          </AlertDialogAction>
          {onSalva && <AlertDialogAction onClick={onSalva}>Salva ed esci</AlertDialogAction>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}