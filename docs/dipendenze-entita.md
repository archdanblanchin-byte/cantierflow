# Entità CantierFlow (19)

Ricrea queste entità in Workflow sotto `base44/entities/<Nome>.jsonc`. I campi built-in (`id`, `created_date`, `updated_date`, `created_by_id`) NON vanno dichiarati.

## base44/entities/Cantiere.jsonc

```jsonc
{
  "name": "Cantiere",
  "type": "object",
  "properties": {
    "codice": { "type": "string", "description": "ID/Codice cantiere generato automaticamente" },
    "nome": { "type": "string", "description": "Nome del cantiere" },
    "citta": { "type": "string", "description": "Città del cantiere" },
    "indirizzo": { "type": "string", "description": "Indirizzo completo del cantiere" },
    "cliente": { "type": "string", "description": "Nome del cliente" },
    "attivo": { "type": "boolean", "default": true, "description": "Se il cantiere è attivo" },
    "ore_stimate": { "type": "number", "description": "Ore stimate per il cantiere" },
    "latitudine": { "type": "number", "description": "Latitudine GPS del cantiere per validazione timbrature" },
    "longitudine": { "type": "number", "description": "Longitudine GPS del cantiere per validazione timbrature" },
    "raggio_metri": { "type": "number", "default": 150, "description": "Raggio di accettazione timbrature in metri" },
    "foto_cantiere": { "type": "array", "items": { "type": "string" }, "description": "Foto del cantiere" },
    "foto_estintore": { "type": "array", "items": { "type": "string" }, "description": "Foto estintore" },
    "foto_pronto_soccorso": { "type": "array", "items": { "type": "string" }, "description": "Foto cassetta pronto soccorso" },
    "documenti": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": { "nome": { "type": "string" }, "url": { "type": "string" }, "tipo": { "type": "string" } }
      },
      "description": "Documenti allegati"
    }
  },
  "required": ["nome"]
}
```

## base44/entities/Collaboratore.jsonc

```jsonc
{
  "name": "Collaboratore",
  "type": "object",
  "properties": {
    "nome": { "type": "string", "description": "Nome completo del collaboratore" },
    "ruolo": { "type": "string", "description": "Ruolo del collaboratore" },
    "attivo": { "type": "boolean", "default": true },
    "user_email": { "type": "string", "description": "Email dell'utente dell'app collegato (per associare le timbrature)" },
    "tracking_posizione": { "type": "boolean", "default": false, "description": "Se autorizzato al tracking GPS per le trasferte (visibile solo agli admin)" }
  },
  "required": ["nome"]
}
```

## base44/entities/Furgone.jsonc

```jsonc
{
  "name": "Furgone",
  "type": "object",
  "properties": {
    "nome": { "type": "string" },
    "targa": { "type": "string" },
    "marca_modello": { "type": "string" },
    "assicurazione_scadenza": { "type": "string", "format": "date" },
    "revisione_scadenza": { "type": "string", "format": "date" },
    "ultima_manutenzione": { "type": "string", "format": "date" },
    "km": { "type": "number" },
    "note": { "type": "string" },
    "attivo": { "type": "boolean", "default": true }
  },
  "required": ["nome"]
}
```

## base44/entities/NotaFurgone.jsonc

```jsonc
{
  "name": "NotaFurgone",
  "type": "object",
  "properties": {
    "furgone_id": { "type": "string" },
    "furgone_nome": { "type": "string" },
    "testo": { "type": "string" },
    "tipo": { "type": "string", "enum": ["nota", "problema", "avviso"], "default": "nota" },
    "autore_nome": { "type": "string" },
    "autore_email": { "type": "string" }
  },
  "required": ["furgone_id", "testo"]
}
```

## base44/entities/UsoFurgone.jsonc

```jsonc
{
  "name": "UsoFurgone",
  "type": "object",
  "properties": {
    "data": { "type": "string", "format": "date" },
    "furgone_id": { "type": "string" },
    "furgone_nome": { "type": "string" },
    "collaboratore_id": { "type": "string" },
    "collaboratore_nome": { "type": "string" },
    "tipo_orario": { "type": "string", "enum": ["tutta_giornata", "fascia"], "default": "tutta_giornata" },
    "ora_inizio": { "type": "string" },
    "ora_fine": { "type": "string" },
    "nota": { "type": "string" },
    "user_email": { "type": "string" }
  },
  "required": ["data", "furgone_id", "collaboratore_id"]
}
```

## base44/entities/Timbratura.jsonc

```jsonc
{
  "name": "Timbratura",
  "type": "object",
  "properties": {
    "cantiere_id": { "type": "string" },
    "cantiere_nome": { "type": "string" },
    "rapportino_id": { "type": "string" },
    "user_email": { "type": "string" },
    "user_nome": { "type": "string" },
    "tipo_evento": { "type": "string", "enum": ["ingresso", "pausa_inizio", "pausa_fine", "uscita", "spostamento"] },
    "data_ora": { "type": "string", "format": "date-time" },
    "latitudine": { "type": "number" },
    "longitudine": { "type": "number" },
    "distanza_metri": { "type": "number" },
    "in_cantiere": { "type": "boolean" },
    "km_spostamento": { "type": "number" },
    "cantiere_destinazione_id": { "type": "string" },
    "cantiere_destinazione_nome": { "type": "string" },
    "mezzo_proprio": { "type": "boolean", "default": false },
    "note": { "type": "string" }
  },
  "required": ["tipo_evento", "data_ora"]
}
```

## base44/entities/Rapportino.jsonc

```jsonc
{
  "name": "Rapportino",
  "type": "object",
  "properties": {
    "data": { "type": "string", "format": "date-time" },
    "cantiere_id": { "type": "string" },
    "cantiere_nome": { "type": "string" },
    "user_email": { "type": "string" },
    "foto": { "type": "array", "items": { "type": "string" } },
    "foto_annotate": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "url": { "type": "string" },
          "url_annotata": { "type": "string" },
          "nota": { "type": "string" },
          "annotazioni": { "type": "array", "items": { "type": "object" } }
        }
      }
    },
    "note_generali": { "type": "string" },
    "ore_utilizzo_piattaforma": { "type": "number" },
    "piattaforma": { "type": "object" },
    "macchinari": { "type": "array", "items": { "type": "object" } },
    "attrezzi": { "type": "array", "items": { "type": "object" } },
    "descrizione_noleggio_mezzi": { "type": "string" },
    "ore_noleggio_mezzi": { "type": "number" },
    "descrizione_noleggio_plexi": { "type": "string" },
    "ore_noleggio_plexi": { "type": "number" },
    "ore_totali_squadra": { "type": "number" },
    "collaboratori": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "collaboratore_id": { "type": "string" },
          "nome": { "type": "string" },
          "ore_lavorate": { "type": "number" },
          "note_imprevisti": { "type": "string" }
        }
      }
    },
    "has_lavorazioni_extra": { "type": "boolean", "default": false },
    "lavorazioni_extra": {
      "type": "array",
      "items": { "type": "object", "properties": { "descrizione": { "type": "string" }, "ore": { "type": "number" } } }
    },
    "lavorazioni_normali": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "tipo_lavorazione_id": { "type": "string" },
          "tipo_lavorazione_nome": { "type": "string" },
          "descrizione_custom": { "type": "string" },
          "descrizione": { "type": "string" },
          "ore_totali": { "type": "number" },
          "modalita_calcolo": { "type": "string" },
          "numero_persone": { "type": "number" },
          "ore_per_persona": { "type": "number" }
        }
      }
    },
    "materiali": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "materiale_id": { "type": "string" },
          "nome": { "type": "string" },
          "descrizione_custom": { "type": "string" },
          "descrizione": { "type": "string" },
          "unita_misura": { "type": "string" },
          "quantita": { "type": "number" }
        }
      }
    },
    "stato": { "type": "string", "enum": ["bozza", "inviato"], "default": "bozza" }
  },
  "required": ["data", "cantiere_id", "ore_totali_squadra"]
}
```

## base44/entities/Programmazione.jsonc

```jsonc
{
  "name": "Programmazione",
  "type": "object",
  "properties": {
    "data": { "type": "string", "format": "date" },
    "tipo_giornata": { "type": "string", "enum": ["normale", "pioggia"], "default": "normale" },
    "cantiere_id": { "type": "string" },
    "cantiere_nome": { "type": "string" },
    "collaboratori": {
      "type": "array",
      "items": { "type": "object", "properties": { "collaboratore_id": { "type": "string" }, "nome": { "type": "string" } } }
    },
    "furgoni": {
      "type": "array",
      "items": { "type": "object", "properties": { "furgone_id": { "type": "string" }, "nome": { "type": "string" } } }
    },
    "ora_arrivo_magazzino": { "type": "string" },
    "ora_arrivo_cantiere": { "type": "string" },
    "note": { "type": "string" },
    "stato": { "type": "string", "enum": ["bozza", "pubblicato"], "default": "bozza" },
    "user_email": { "type": "string" }
  },
  "required": ["data", "cantiere_id"]
}
```

## base44/entities/Cronoprogramma.jsonc

```jsonc
{
  "name": "Cronoprogramma",
  "type": "object",
  "properties": {
    "sync_id": { "type": "string" },
    "titolo": { "type": "string" },
    "descrizione": { "type": "string" },
    "data_inizio": { "type": "string", "format": "date" },
    "data_fine": { "type": "string", "format": "date" },
    "stato": { "type": "string", "enum": ["da_iniziare", "in_corso", "completato"], "default": "da_iniziare" },
    "progresso": { "type": "number", "default": 0 },
    "ordine": { "type": "number", "default": 0 },
    "sync_version": { "type": "number", "default": 0 },
    "origine": { "type": "string", "enum": ["locale", "workflow"], "default": "locale" }
  },
  "required": ["sync_id", "titolo"]
}
```

## base44/entities/Trasferta.jsonc

```jsonc
{
  "name": "Trasferta",
  "type": "object",
  "properties": {
    "data": { "type": "string", "format": "date" },
    "user_email": { "type": "string" },
    "user_nome": { "type": "string" },
    "primo_cantiere_id": { "type": "string" },
    "primo_cantiere_nome": { "type": "string" },
    "ultimo_cantiere_id": { "type": "string" },
    "ultimo_cantiere_nome": { "type": "string" },
    "km_andata": { "type": "number" },
    "km_ritorno": { "type": "number" },
    "km_totali": { "type": "number" },
    "fascia_andata": { "type": "string", "enum": ["T0", "T1", "T2", "T3", "T4"] },
    "fascia_ritorno": { "type": "string", "enum": ["T0", "T1", "T2", "T3", "T4"] },
    "tipo_trasferta": { "type": "string", "enum": ["T0", "T1", "T2", "T3", "T4"] },
    "mezzo_proprio": { "type": "boolean", "default": false },
    "note": { "type": "string" },
    "confermata": { "type": "boolean", "default": false }
  },
  "required": ["data", "user_email"]
}
```

## base44/entities/ConfigurazioneTrasferta.jsonc

```jsonc
{
  "name": "ConfigurazioneTrasferta",
  "type": "object",
  "properties": {
    "sede_nome": { "type": "string", "default": "Rivignano Teor" },
    "sede_indirizzo": { "type": "string" },
    "sede_latitudine": { "type": "number" },
    "sede_longitudine": { "type": "number" },
    "soglia_t0": { "type": "number", "default": 10 },
    "soglia_t1": { "type": "number", "default": 27 },
    "soglia_t2": { "type": "number", "default": 40 },
    "soglia_t3": { "type": "number", "default": 70 }
  },
  "required": ["sede_nome"]
}
```

## base44/entities/Foto.jsonc

```jsonc
{
  "name": "Foto",
  "type": "object",
  "properties": {
    "url": { "type": "string" },
    "url_annotata": { "type": "string" },
    "nota": { "type": "string" },
    "cantiere_id": { "type": "string" },
    "cantiere_nome": { "type": "string" },
    "rapportino_id": { "type": "string" },
    "annotazioni": { "type": "array", "items": { "type": "object" } },
    "tipo": { "type": "string", "enum": ["foto", "codice_colore"], "default": "foto" },
    "colore": { "type": "string" }
  },
  "required": ["url", "cantiere_id"]
}
```

## base44/entities/TipoLavorazione.jsonc

```jsonc
{
  "name": "TipoLavorazione",
  "type": "object",
  "properties": {
    "nome": { "type": "string" },
    "categoria": { "type": "string" },
    "descrizione": { "type": "string" }
  },
  "required": ["nome", "categoria"]
}
```

## base44/entities/MaterialeBase.jsonc

```jsonc
{
  "name": "MaterialeBase",
  "type": "object",
  "properties": {
    "nome": { "type": "string" },
    "unita_misura": { "type": "string" }
  },
  "required": ["nome"]
}
```

## base44/entities/TipoDocumento.jsonc

```jsonc
{
  "name": "TipoDocumento",
  "type": "object",
  "properties": {
    "nome": { "type": "string" },
    "note": { "type": "string" },
    "attivo": { "type": "boolean", "default": true }
  },
  "required": ["nome"]
}
```

## base44/entities/AnagrafaAttrezzo.jsonc

```jsonc
{
  "name": "AnagrafaAttrezzo",
  "type": "object",
  "properties": {
    "nome": { "type": "string" },
    "note": { "type": "string" },
    "attivo": { "type": "boolean", "default": true }
  },
  "required": ["nome"]
}
```

## base44/entities/Ristorante.jsonc

```jsonc
{
  "name": "Ristorante",
  "type": "object",
  "properties": {
    "nome": { "type": "string" },
    "indirizzo": { "type": "string" },
    "note": { "type": "string" },
    "attivo": { "type": "boolean", "default": true }
  },
  "required": ["nome"]
}
```

## base44/entities/AnagrafaIdropulitrice.jsonc

```jsonc
{
  "name": "AnagrafaIdropulitrice",
  "type": "object",
  "properties": {
    "nome": { "type": "string" },
    "note": { "type": "string" },
    "attivo": { "type": "boolean", "default": true }
  },
  "required": ["nome"]
}
```

## base44/entities/PermessoSezione.jsonc

```jsonc
{
  "name": "PermessoSezione",
  "type": "object",
  "properties": {
    "ruolo": { "type": "string", "enum": ["admin", "responsabile_tecnico", "capocantiere", "collaboratore"] },
    "sezioni_permesse": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["ruolo"]
}
```

## User (built-in)

L'entità `User` è built-in su ogni app Base44. Per personalizzare il ruolo, edita `base44/entities/User.jsonc` dichiarando solo i campi customizzati (es. `role`). Non si creano record User: gli utenti si invitano con `base44.users.inviteUser(email, role)`.