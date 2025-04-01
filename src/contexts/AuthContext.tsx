import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '../lib/api';
import { User } from '../types';
import axios from 'axios';

// Since api is already defined in '../lib/api.ts' file and not exported directly,
// we'll use the axios instance imported inside the login and logout functions

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      throw error;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        await refreshUser();
      } finally {
        setIsLoading(false);
        setInitialLoadComplete(true);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    try {
      const response = await apiLogin(identifier, password);
      
      // The tokens are already being set in localStorage by the apiLogin function
      // No need to manually update axios headers as that's handled in the api.ts file
      // Just check if the login was successful
      
      await refreshUser(); // Refresh user data after login
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage and state
      // The tokens are already being removed in the apiLogout function
      // Just make sure to update the user state
      setUser(null);
    }
  };

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
  };

  // Only render children after initial auth check is complete
  if (!initialLoadComplete) {
    // You could return a loading spinner here if desired
    return null;
  }

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