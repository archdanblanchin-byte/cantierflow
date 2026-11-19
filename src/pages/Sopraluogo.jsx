import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ListaSopraluoghi from '@/components/sopraluogo/ListaSopraluoghi';
import FormSopraluogo from '@/components/sopraluogo/FormSopraluogo';
import AnteprimaSopraluogo from '@/components/sopraluogo/AnteprimaSopraluogo';
import ImpostazioniSopraluogo from '@/components/sopraluogo/ImpostazioniSopraluogo';
import DialogoUscita from '@/components/shared/DialogoUscita';
import { useUnsavedChanges } from '@/lib/unsavedChanges';
import { useToast } from '@/components/ui/use-toast';
import { generaPdfRilievo } from '@/lib/pdfRilievo';
import ModaleTaskAutomatico from '@/components/shared/ModaleTaskAutomatico';
import { propostaTaskSopraluogo, propostaTaskSviluppoSopraluogo } from '@/lib/taskAutomatico';

export default function Sopraluogo() {
  const [view, setView] = useState('lista'); // 'lista' | 'anteprima' | 'form' | 'impostazioni'
  const [selected, setSelected] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [exitDialog, setExitDialog] = useState(null);
  const queryClient = useQueryClient();
  const { setDirty: setGlobalDirty } = useUnsavedChanges();
  const { toast } = useToast();
  const [driveLoading, setDriveLoading] = useState(false);
  const [taskAuto, setTaskAuto] = useState(null);

  // Compilato → si propone un task a chi deve preparare il preventivo.
  const cambiaStato = (id, stato) => {
    updateStatoMutation.mutate({ id, stato });
    const doc = sopraluoghi.find((s) => s.id === id);
    if (stato === 'compilato') setTaskAuto(propostaTaskSopraluogo(doc));
    if (stato === 'da_sviluppare') setTaskAuto(propostaTaskSviluppoSopraluogo(doc));
  };

  const markDirty = (v) => {
    setIsDirty(v);
    setGlobalDirty(v);
  };

  const exitForm = (callback) => {
    if (isDirty) {
      setExitDialog({ onConfirm: () => { markDirty(false); setExitDialog(null); callback(); } });
    } else {
      callback();
    }
  };

  const { data: sopraluoghi = [], isLoading } = useQuery({
    queryKey: ['sopraluoghi'],
    queryFn: () => base44.entities.Sopraluogo.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Sopraluogo.create(data),
    onSuccess: (newSopraluogo) => {
      queryClient.invalidateQueries({ queryKey: ['sopraluoghi'] });
      setSelected(newSopraluogo);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Sopraluogo.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['sopraluoghi'] });
      setSelected(updated);
    },
  });

  const updateStatoMutation = useMutation({
    mutationFn: ({ id, stato }) => base44.entities.Sopraluogo.update(id, { stato_manuale: stato }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sopraluoghi'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Sopraluogo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sopraluoghi'] });
      setView('lista');
      setSelected(null);
    },
  });

  const handleSave = (formData) => {
    markDirty(false);
    if (selected?.id) {
      updateMutation.mutate({ id: selected.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const giaSalvato = !!(selected?.drive_folder_id);
  const driveFolderLink = selected?.drive_folder_id ? `https://drive.google.com/drive/folders/${selected.drive_folder_id}` : '';

  const handleCreaCartellina = async (formData) => {
    setDriveLoading(true);
    try {
      let saved;
      if (selected?.id) {
        saved = await updateMutation.mutateAsync({ id: selected.id, data: formData });
      } else {
        saved = await createMutation.mutateAsync(formData);
      }
      markDirty(false);
      let pdfBase64 = null;
      try { pdfBase64 = await generaPdfRilievo(saved); } catch { pdfBase64 = null; }
      const res = await base44.functions.invoke('salvaSopraluogoDrive', { sopraluogoId: saved.id, pdfBase64 });
      const data = res.data || {};
      const folderId = data.folderId;
      setSelected({
        ...saved,
        drive_folder_id: folderId || saved.drive_folder_id,
        drive_pdf_id: data.pdfId || saved.drive_pdf_id,
        drive_pdf_url: data.pdfUrl || saved.drive_pdf_url,
      });
      toast({
        title: data.aggiornamento ? 'Rilievo aggiornato su Drive' : 'Cartellina creata su Drive',
        description: data.aggiornamento
          ? `PDF aggiornato nella cartella "${data.cartella}".`
          : `Cartella "${data.cartella}" creata in RILIEVI/${data.anno}.`,
      });
      if (data.avviso_duplicato) {
        toast({ title: '⚠️ Cartellina duplicata', description: data.messaggio_avviso, variant: 'destructive' });
      }
    } catch (e) {
      toast({
        title: 'Errore salvataggio Drive',
        description: e?.response?.data?.error || e.message || 'Errore sconosciuto',
        variant: 'destructive',
      });
    }
    setDriveLoading(false);
  };

  // Aggiorna selected quando arrivano dati freschi dalla lista
  useEffect(() => {
    if (selected?.id && sopraluoghi.length > 0) {
      const fresh = sopraluoghi.find(s => s.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }, [sopraluoghi]);

  const handleOpenAnteprima = (sopraluogo) => {
    setSelected(sopraluogo);
    setView('anteprima');
  };

  const handleNew = () => {
    setSelected({});
    setView('form');
  };

  return (
    <div className="min-h-screen bg-background">
      {view === 'lista' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <ListaSopraluoghi
            sopraluoghi={sopraluoghi}
            onNew={handleNew}
            onOpen={handleOpenAnteprima}
            onDelete={(id) => deleteMutation.mutate(id)}
            onImpostazioni={() => setView('impostazioni')}
            onUpdateStato={cambiaStato}
            isLoading={isLoading}
          />
        </div>
      )}
      {view === 'impostazioni' && (
        <ImpostazioniSopraluogo onBack={() => setView('lista')} />
      )}
      {view === 'anteprima' && (
        <AnteprimaSopraluogo
          sopraluogo={selected}
          onBack={() => { setView('lista'); setSelected(null); }}
          onEdit={() => setView('form')}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
      {view === 'form' && (
        <FormSopraluogo
          key={selected?.id || 'nuovo'}
          sopraluogo={selected}
          onSave={handleSave}
          onBack={() => exitForm(() => {
            if (selected?.id) { setView('anteprima'); }
            else { setView('lista'); setSelected(null); }
          })}
          onDirtyChange={markDirty}
          isSaving={createMutation.isPending || updateMutation.isPending}
          giaSalvato={giaSalvato}
          driveLoading={driveLoading}
          onCreaCartellina={handleCreaCartellina}
          driveFolderLink={driveFolderLink}
        />
      )}
      {taskAuto && (
        <ModaleTaskAutomatico proposta={taskAuto} onClose={() => setTaskAuto(null)} />
      )}
      <DialogoUscita
        open={!!exitDialog}
        onRimani={() => setExitDialog(null)}
        onEsci={() => { exitDialog?.onConfirm(); }}
      />
    </div>
  );
}