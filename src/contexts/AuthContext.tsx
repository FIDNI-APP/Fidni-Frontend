import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: User) => void; // Add this line

}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshUser = async () => {

    try {
      const userData = await getCurrentUser();
      setUser(userData);


    } catch (error) {

      setUser(null);

    }
  };


  useEffect(() => {
    checkAuth();


  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };
  const login = async (identifier: string, password: string) => {
    await apiLogin(identifier, password);
    await refreshUser(); // Refresh user data after login
  };

  const logout = async () => {

    await apiLogout();
    setUser(null);

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
    updateUser, // Add this to the context value

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