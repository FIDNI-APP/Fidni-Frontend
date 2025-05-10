// src/components/LegalRedirector.tsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const LegalRedirector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    
    // Mapping des traductions possibles vers les chemins officiels
    const legalPageMappings: Record<string, string> = {
      // Termes et conditions
      '/terms': '/terms-of-service',
      '/terms-of-service': '/terms-of-service',
      '/conditions': '/terms-of-service',
      '/conditions-dutilisation': '/terms-of-service',
      '/termes': '/terms-of-service',
      '/conditions-utilisation': '/terms-of-service',
      '/cgu': '/terms-of-service',
      '/tos': '/terms-of-service',
      
      // Politique de confidentialité
      '/privacy': '/privacy-policy',
      '/privacy-policy': '/privacy-policy',
      '/confidentialite': '/privacy-policy',
      '/politique-de-confidentialite': '/privacy-policy',
      '/politique-confidentialite': '/privacy-policy',
      '/vie-privee': '/privacy-policy',
    };
    
    // Si l'URL actuelle est une traduction, rediriger vers l'URL officielle
    const officialPath = legalPageMappings[path];
    if (officialPath && path !== officialPath) {
      navigate(officialPath, { replace: true });
    }
  }, [location, navigate]);
  
  return null; // Ce composant n'affiche rien
};

export default LegalRedirector;