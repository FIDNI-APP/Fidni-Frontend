// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '@/types';
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
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
      await apiLogin(identifier, password);
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiRegister(username, email, password);
      
      // Après l'inscription réussie, connecter l'utilisateur
      await apiLogin(username, password);
      await refreshUser();
      
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
        logout,
        register,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};