// src/components/AuthController.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthModal } from './AuthModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  initialTab?: 'login' | 'signup';
  setInitialTab: (tab: 'login' | 'signup') => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<'login' | 'signup'>('login');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Effet pour gérer la redirection après l'inscription réussie
  useEffect(() => {
    // Si l'utilisateur est connecté et que la modal est ouverte avec l'onglet signup
    if (user && isOpen && initialTab === 'signup') {
      // Fermer la modal
      setIsOpen(false);
      
      // Si l'utilisateur n'a pas encore complété l'onboarding, le rediriger
      if (user.profile && !user.profile.onboarding_completed) {
        // Utiliser setTimeout pour éviter les problèmes de rendu React
        setTimeout(() => {
          navigate('/complete-profile');
        }, 50);
      }
    }
  }, [user, isOpen, initialTab, navigate]);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    // Reset to default tab when closing
    setInitialTab('login');
  };

  return (
    <AuthModalContext.Provider value={{ isOpen, openModal, closeModal, initialTab, setInitialTab }}>
      {children}
      {/* Render modal conditionally to avoid DOM manipulation issues */}
      {isOpen && <AuthModal isOpen={isOpen} onClose={closeModal} initialTab={initialTab} />}
    </AuthModalContext.Provider>
  );
};