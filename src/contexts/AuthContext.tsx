import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout, refreshToken as apiRefreshToken } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateUser: (userData: User) => void;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tokenCheckInterval, setTokenCheckInterval] = useState<number | null>(null);

  // Récupérer les données utilisateur
  const refreshUser = async (): Promise<User | null> => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setAuthError(null);
      return userData;
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des données utilisateur :", error);
      setUser(null);
      return null;
    }
  };

  // Vérifier l'authentification au chargement et configurer un intervalle de vérification
  useEffect(() => {
    const setupAuth = async () => {
      try {
        setIsLoading(true);
        await checkAuth();
      } finally {
        setIsLoading(false);
      }

      // Configurer une vérification périodique du token toutes les 5 minutes
      if (tokenCheckInterval === null) {
        const intervalId = window.setInterval(() => {
          const token = localStorage.getItem('token');
          if (token) {
            checkTokenValidity();
          }
        }, 5 * 60 * 1000); // Vérifier toutes les 5 minutes
        
        setTokenCheckInterval(intervalId);
      }
    };

    setupAuth();

    // Nettoyage de l'intervalle lorsque le composant est démonté
    return () => {
      if (tokenCheckInterval !== null) {
        window.clearInterval(tokenCheckInterval);
      }
    };
  }, []);

  // Vérifier si l'utilisateur est authentifié
  const checkAuth = async () => {
    try {
      // Vérifier si l'utilisateur a un token JWT valide
      const token = localStorage.getItem('token');
      if (token) {
        await refreshUser();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification de l'authentification :", error);
      setUser(null);
    }
  };

  // Vérifier la validité du token et le rafraîchir si nécessaire
  const checkTokenValidity = async () => {
    try {
      // Tenter de rafraîchir le token - notre intercepteur s'occupera automatiquement 
      // de gérer les erreurs 401 lors des requêtes API
      const result = await apiRefreshToken();
      if (!result.success) {
        // Token refresh failed, log the user out
        await handleLogout();
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du token :", error);
      await handleLogout();
    }
  };

  // Connecter l'utilisateur
  const login = async (identifier: string, password: string) => {
    try {
      setAuthError(null);
      const response = await apiLogin(identifier, password);
      
      if (response.success) {
        await refreshUser();
        return { success: true };
      } else {
        const errorMessage = response.message || "Erreur d'authentification";
        setAuthError(errorMessage);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
      const errorMessage = "Une erreur s'est produite lors de la connexion";
      setAuthError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Déconnecter l'utilisateur
  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
    setAuthError(null);
  };

  const logout = async () => {
    try {
      await handleLogout();
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
      // Même en cas d'erreur, on nettoie la session locale
      setUser(null);
    }
  };

  // Mettre à jour les données utilisateur
  const updateUser = (userData: User) => {
    setUser(userData);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
    updateUser,
    authError,
  };
  
  return (
    <AuthContext.Provider value={value}>
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