// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '@/types';
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from '@/lib/api';
import { loginWithGoogle as apiLoginWithGoogle, type GoogleLoginResult, type SignupConsents } from '@/lib/api/authApi';
import { SESSION_EXPIRED_EVENT } from '@/lib/api/apiClient';



interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  /** Connexion avec Google (jeton d'identité) ; `consents` pour créer un compte. Renvoie aussi `created`. */
  loginWithGoogle: (credential: string, consents?: SignupConsents) => Promise<GoogleLoginResult>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string, consents: SignupConsents) => Promise<any>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();
      if (userData) {
        setUser({
          ...userData,
          isAuthenticated: true
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setUser(null);
    }
  };
  
  // Session impossible à renouveler (jeton de rafraîchissement expiré) : on repasse en visiteur.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Charger l'utilisateur lors du montage initial
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        await refreshUser();
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
  }, []);
  
  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiLogin(identifier, password);
      // La connexion renvoie déjà le profil : pas besoin d'une seconde requête.
      if (data?.user) setUser({ ...data.user, isAuthenticated: true });
      else await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };
  
  const loginWithGoogle = async (credential: string, consents?: SignupConsents) => {
    // Pas de isLoading ici : un refus « consent_required » est attendu et ne doit pas faire clignoter l'app.
    const data = await apiLoginWithGoogle(credential, consents);
    if (data?.user) setUser({ ...data.user, isAuthenticated: true });
    else await refreshUser();
    return data;
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };
  
  const register = async (username: string, email: string, password: string, consents: SignupConsents) => {
    setIsLoading(true);
    try {
      // No auto-login: the account is created inactive and must confirm its
      // email first. The caller shows a "check your inbox" screen.
      const response = await apiRegister(username, email, password, consents);
      return response;
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        logout,
        register,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};