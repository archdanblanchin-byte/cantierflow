import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Home from './pages/Home';
import CreateReport from './pages/CreateReport';
import ReportDetail from './pages/ReportDetail';
import Cantieri from './pages/Cantieri';
import CantiereForm from './pages/CantiereForm';
import CantiereDetail from './pages/CantiereDetail';
import Placeholder from './pages/Placeholder';
import FotoPage from './pages/Foto';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Rapportini */}
      <Route path="/rapportini" element={<Home showRapportini />} />
      <Route path="/nuovo" element={<CreateReport />} />
      <Route path="/report/:id" element={<ReportDetail />} />

      {/* Cantieri */}
      <Route path="/cantieri" element={<Cantieri />} />
      <Route path="/cantieri/nuovo" element={<CantiereForm />} />
      <Route path="/cantieri/:id" element={<CantiereDetail />} />
      <Route path="/cantieri/:id/modifica" element={<CantiereForm />} />

      {/* Placeholder sezioni */}
      <Route path="/foto" element={<FotoPage />} />
      <Route path="/programma" element={<Placeholder title="Programma" />} />
      <Route path="/cronoprogramma" element={<Placeholder title="Cronoprogramma" />} />
      <Route path="/furgoni" element={<Placeholder title="Furgoni" />} />
      <Route path="/documenti" element={<Placeholder title="Documenti" />} />
      <Route path="/idropulitrice" element={<Placeholder title="Idropulitrice" />} />
      <Route path="/ristorante" element={<Placeholder title="Ristorante" />} />
      <Route path="/permessi" element={<Placeholder title="Permessi" />} />
      <Route path="/corsi" element={<Placeholder title="Corsi" />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App