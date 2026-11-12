/**
 * Parcours : accès Premium. Le Parcours est réservé aux membres Premium (demande du 12/11/2026). Il n'existe
 * encore aucune offre Premium sur le serveur (ni champ sur l'utilisateur, ni paiement) : l'accès est décidé par
 * hasParcoursAccess (lib/features.ts), seul endroit à changer quand l'offre existera. En attendant : l'équipe (comme
 * avant), ou un compte qui porterait `is_premium`. Pas de prix ni de bouton d'achat inventés.
 */
import React from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { hasParcoursAccess } from '@/lib/features';
import { t } from '@/i18n';

const Card: React.FC<{ title: string; text: string; action?: React.ReactNode }> = ({ title, text, action }) => (
  <div className="fd-card mx-auto mt-6 flex max-w-xl flex-col items-center px-6 py-10 text-center sm:py-12">
    <span className="mb-3 inline-flex text-gold-strong" aria-hidden><Lock className="h-6 w-6" /></span>
    <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
    <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-faint">{text}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const PremiumGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const openSignup = useOpenSignup('parcours');
  if (isLoading) return <div className="fd-card mt-6 h-64 animate-pulse" role="status" aria-label={t('Chargement')} />;
  if (!isAuthenticated) {
    return (
      <Card title={t('Connecte-toi pour suivre ton parcours')}
        text={t('Le Parcours enchaîne les chapitres de ton niveau en vidéos, et garde ta progression d’un checkpoint à l’autre.')}
        action={(
          <button type="button" onClick={() => openSignup('login')} className="fd-btn-primary inline-flex min-h-11 items-center gap-2">
            <LogIn className="h-4 w-4" /> {t('Se connecter')}
          </button>
        )} />
    );
  }
  if (!hasParcoursAccess(user)) {
    return (
      <Card title={t('Le Parcours fait partie de Fidni Premium')}
        text={t('Les chapitres de ton niveau en vidéos, dans l’ordre du programme, avec ta progression d’un checkpoint à l’autre. L’offre Premium n’est pas encore ouverte.')} />
    );
  }
  return <>{children}</>;
};

export default PremiumGate;
