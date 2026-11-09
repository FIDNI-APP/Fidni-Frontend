// /membres quand la page Membres est fermée (lib/features.ts, MEMBRES_OUVERT). Les notifications déjà envoyées y mènent
// encore : « /membres?onglet=abonnes » (nouvel abonné, demande d'abonnement) ouvre la fenêtre des abonnés du profil, où se
// règlent les demandes ; tout le reste mène aux discussions.
import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const MembresFerme: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  if (isLoading) return null;
  if (user && params.get('onglet') === 'abonnes') {
    return <Navigate to={`/profile/${encodeURIComponent(user.username)}?abonnes=1`} replace />;
  }
  return <Navigate to="/discussions" replace />;
};

export default MembresFerme;
