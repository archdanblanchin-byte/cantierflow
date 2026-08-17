import React from 'react';
import { Mail, AlertTriangle, RefreshCw } from 'lucide-react';

const UserNotRegisteredError = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-orange-100">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Accesso non ancora attivo</h1>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            Non risulti ancora registrato in questa applicazione. Se hai ricevuto un invito,
            devi <strong>accettarlo tramite l'email</strong> prima di poter accedere.
          </p>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm text-slate-700 space-y-3 text-left mb-4">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p><strong>Controlla la tua email</strong> (anche nello spam) e cerca il messaggio di invito a <span className="font-medium">CantierFlow</span>.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 flex items-center justify-center text-amber-600 font-bold text-xs mt-0.5 shrink-0">2</span>
              <p><strong>Clicca il pulsante "Accept Invitation"</strong> all'interno dell'email.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 flex items-center justify-center text-amber-600 font-bold text-xs mt-0.5 shrink-0">3</span>
              <p>Completa la registrazione o il login con la <strong>stessa email</strong> a cui è stato inviato l'invito.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 flex items-center justify-center text-amber-600 font-bold text-xs mt-0.5 shrink-0">4</span>
              <p>Torna qui e ricarica la pagina: potrai accedere all'app.</p>
            </div>
          </div>

          <button
            onClick={handleReload}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Ho accettato l'invito, ricarica
          </button>

          <p className="mt-4 text-xs text-slate-400">
            Se non hai ricevuto alcuna email di invito, contatta l'amministratore dell'app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;