import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DomainesPage } from './pages/DomainesPage';
import { DomaineDetailPage } from './pages/DomaineDetailPage';
import { ProcessDetailPage } from './pages/ProcessDetailPage';
import { EtapeDetailPage } from './pages/EtapeDetailPage';
import { DCListPage } from './pages/DCListPage';
import { DCDetailPage } from './pages/DCDetailPage';
import { DCCreatePage } from './pages/DCCreatePage';
import { SearchPage } from './pages/SearchPage';
import { ProfilePage } from './pages/ProfilePage';
import { MonProfilPage } from './pages/MonProfilPage';
import { HistoriquePage } from './pages/HistoriquePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { FullScreenSkeleton } from './components/ui/Skeleton';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/**
 * Réserve une page aux administrateurs.
 *
 * Ce n'est qu'un garde-fou d'interface : la vraie autorisation doit être
 * appliquée côté API, sinon un appel direct contournerait cette page.
 */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return <NotFoundPage />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenSkeleton />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/historique" element={<HistoriquePage />} />
        <Route path="/domaines" element={<DomainesPage />} />
        <Route path="/domaines/:id" element={<DomaineDetailPage />} />
        <Route path="/processes/:id" element={<ProcessDetailPage />} />
        <Route path="/etapes/:id" element={<EtapeDetailPage />} />
        <Route path="/dcs" element={<DCListPage />} />
        <Route path="/demandes-de-changement" element={<DCListPage />} />
        <Route path="/dcs/new" element={<DCCreatePage />} />
        <Route path="/dcs/:id" element={<DCDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/masques" element={<NotFoundPage />} />
        <Route path="/services" element={<NotFoundPage />} />
        <Route path="/procedures" element={<NotFoundPage />} />
        <Route path="/tables" element={<NotFoundPage />} />
        <Route path="/tables/:id" element={<NotFoundPage />} />
        <Route path="/archives" element={<NotFoundPage />} />
        <Route path="/profil" element={<MonProfilPage />} />
        <Route
          path="/administration"
          element={
            <RequireAdmin>
              <ProfilePage />
            </RequireAdmin>
          }
        />
        <Route path="/processus" element={<NotFoundPage />} />
        <Route path="/etapes" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;