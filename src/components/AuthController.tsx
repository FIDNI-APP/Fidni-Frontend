import React, { createContext, useContext, useState } from 'react';
import { AuthModal } from './AuthModal';

// Define the context type
type AuthModalContextType = {
  openModal: (returnPath?: string) => void;
  closeModal: () => void;
};

// Create context for auth modal state
const AuthModalContext = createContext<AuthModalContextType | null>(null);

// Hook to use auth modal
export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};

// Provider component
export const AuthModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/');

  const openModal = (returnPath = '/') => {
    setReturnUrl(returnPath);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <AuthModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <AuthModal 
        isOpen={isOpen} 
        onClose={closeModal} 
        returnUrl={returnUrl}
      />
    </AuthModalContext.Provider>
  );
};