import { Landing } from './Landing';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { Page } from '@/components/space/Page';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';

/**
 * Page « / ». Deux visages selon la connexion :
 *  · visiteur non connecté → <Landing/> (présentation du site) ;
 *  · élève ou prof connecté → son accueil, « ce que tu fais maintenant » (components/dashboard/DashboardOverview).
 * Rien n'est affiché tant que la connexion n'est pas connue (pas de Landing qui clignote pour un élève).
 */
export function Home() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  if (authLoading) return null;
  if (!isAuthenticated) return <Landing />;

  return (
    <Page>
      <SEO
        title="Fidni - Tableau de bord"
        description="Plateforme moderne d'apprentissage en mathématiques."
        keywords={['mathématiques', 'bac', 'exercices']}
        ogType="website"
        canonicalUrl="/"
      />
      <div data-tour="home-accueil">
        <DashboardOverview username={user?.username} />
      </div>
    </Page>
  );
}
