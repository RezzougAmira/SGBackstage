import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
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
import { NotFoundPage } from './pages/NotFoundPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/domaines"
        element={
          <ProtectedRoute>
            <DomainesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/domaines/:id"
        element={
          <ProtectedRoute>
            <DomaineDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/processes/:id"
        element={
          <ProtectedRoute>
            <ProcessDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/etapes/:id"
        element={
          <ProtectedRoute>
            <EtapeDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dcs"
        element={
          <ProtectedRoute>
            <DCListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dcs/new"
        element={
          <ProtectedRoute>
            <DCCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dcs/:id"
        element={
          <ProtectedRoute>
            <DCDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />
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
