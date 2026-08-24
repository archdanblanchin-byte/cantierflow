import { useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import TabLayout, { TAB_PATHS } from './components/TabLayout';
import AnimatedRoutes from './components/AnimatedRoutes';
import BottomNav from './components/BottomNav';
import Splash from './components/Splash';
import CreateReport from './pages/CreateReport';
import ReportDetail from './pages/ReportDetail';
import CantiereForm from './pages/CantiereForm';
import CantiereDetail from './pages/CantiereDetail';
import Placeholder from './pages/Placeholder';
import FotoPage from './pages/Foto';
import EditReport from './pages/EditReport';
import DashboardTrasferte from './pages/DashboardTrasferte';
import Permessi from './pages/Permessi';
import CalendarioPermessi from './pages/CalendarioPermessi';
import Utenti from './pages/Utenti';
import OreLavoratori from './pages/OreLavoratori';
import Account from './pages/Account';
import Cronoprogramma from './pages/Cronoprogramma';
import Programma from './pages/Programma';
import Programmazione from './pages/Programmazione';
import Impostazioni from './pages/Impostazioni';
import UsoFurgoni from './pages/UsoFurgoni';
import Corsi from './pages/Corsi';
import Note from './pages/Note';
import StoricoTimbrature from './pages/StoricoTimbrature';
import WorkflowApp from './pages/WorkflowApp';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const p = location.pathname;
  // BottomNav persistente su tutte le schermate (le 4 finestre principali sempre disponibili).
  const showBottomNav = true;

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <>
    <AnimatedRoutes>
      <Route path="/" element={<TabLayout />} />
      <Route path="/trasferte" element={<DashboardTrasferte />} />

      {/* Rapportini */}
      <Route path="/rapportini" element={<TabLayout />} />
      <Route path="/nuovo" element={<CreateReport />} />
      <Route path="/report/:id" element={<ReportDetail />} />
      <Route path="/modifica-report/:id" element={<EditReport />} />

      {/* Cantieri */}
      <Route path="/cantieri" element={<TabLayout />} />
      <Route path="/cantieri/nuovo" element={<CantiereForm />} />
      <Route path="/cantieri/:id" element={<CantiereDetail />} />
      <Route path="/cantieri/:id/modifica" element={<CantiereForm />} />

      {/* Placeholder sezioni */}
      <Route path="/foto" element={<FotoPage />} />
      <Route path="/anagrafe" element={<TabLayout />} />
      <Route path="/programma" element={<Programma />} />
      <Route path="/programmazione" element={<Programmazione />} />
      <Route path="/cronoprogramma" element={<Cronoprogramma />} />
      <Route path="/furgoni" element={<Placeholder title="Furgoni" />} />
      <Route path="/documenti" element={<Placeholder title="Documenti" />} />
      <Route path="/idropulitrice" element={<Placeholder title="Idropulitrice" />} />
      <Route path="/ristorante" element={<Placeholder title="Ristorante" />} />
      <Route path="/permessi" element={<Permessi />} />
      <Route path="/permessi-ferie" element={<CalendarioPermessi />} />
      <Route path="/impostazioni" element={<Impostazioni />} />
      <Route path="/uso-furgoni" element={<UsoFurgoni />} />
      <Route path="/utenti" element={<Utenti />} />
      <Route path="/ore-lavoratori" element={<OreLavoratori />} />
      <Route path="/timbratura" element={<TabLayout />} />
      <Route path="/storico-timbrature" element={<StoricoTimbrature />} />
      <Route path="/account" element={<Account />} />
      <Route path="/corsi" element={<Corsi />} />
      <Route path="/note" element={<Note />} />
      <Route path="/workflow" element={<WorkflowApp />} />

      <Route path="*" element={<PageNotFound />} />
    </AnimatedRoutes>
    {showBottomNav && <BottomNav />}
    </>
  );
};

function App() {
  // Sincronizza il dark mode di sistema con la classe `dark` sull'<html>
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (e) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };
    apply(mq);
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Splash />
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App