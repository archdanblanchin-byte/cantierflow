import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// Sezione "Alla c.a. di": contatto a cui indirizzare il documento.
// Legge e scrive i campi ca_* del form tramite update(campo, valore).
const CAMPI = [
  { key: 'ca_nome', label: 'Nome', placeholder: 'Mario' },
  { key: 'ca_cognome', label: 'Cognome', placeholder: 'Rossi' },
  { key: 'ca_indirizzo', label: 'Indirizzo', placeholder: 'Via, numero civico' },
  { key: 'ca_citta', label: 'Città', placeholder: 'Città' },
  { key: 'ca_telefono', label: 'Telefono', placeholder: '+39 333 123456' },
  { key: 'ca_email', label: 'Email', placeholder: 'contatto@email.it', type: 'email' },
];

export default function SezioneAllaCA({ form, update }) {
  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div className="flex items-center gap-2">
        <Switch checked={!!form.ca_attivo} onCheckedChange={(v) => update('ca_attivo', v)} id="ca-attivo" />
        <Label htmlFor="ca-attivo" className="text-xs">Alla c.a. di (contatto diverso dal cliente)</Label>
      </div>
      {form.ca_attivo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAMPI.map((c) => (
            <div key={c.key} className="space-y-1">
              <Label className="text-xs">{c.label}</Label>
              <Input type={c.type || 'text'} placeholder={c.placeholder} value={form[c.key] || ''}
                onChange={(e) => update(c.key, e.target.value)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}