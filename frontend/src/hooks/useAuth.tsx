import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types';
import { authApi } from '../api/auth';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  // Permet à la page de profil de rafraîchir l'utilisateur partout dans l'app
  // (avatar de la topbar, sidebar) après une modification.
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Un 401 sur n'importe quelle requête purge la session et lève cet évènement.
    const handleExpired = () => setUser(null);
    window.addEventListener('auth:expired', handleExpired);

    // Vérifier le token existant auprès de l'API : un token expiré ou signé avec
    // une autre clésecrète doit déconnecter, pas laisser l'app à moitié valide.
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return () => window.removeEventListener('auth:expired', handleExpired);
    }

    api.setToken(token);
    authApi
      .me()
      .then((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
      })
      .catch(() => {
        api.clearToken();
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    api.setToken(response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    setUser(response.user);
  };

  const logout = () => {
    api.clearToken();
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
