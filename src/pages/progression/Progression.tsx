// « Ma progression » (refaite le 08/10/2026, plus simple) : trois blocs seulement.
//   1. Où j'en suis : chapitres maîtrisés sur le programme, en une phrase et une barre.
//   2. Mon programme : les chapitres, à renforcer d'abord ; le détail du chapitre choisi à côté
//      (téléphone : dessous). Un clic sur un autre chapitre change le détail, sans fenêtre à fermer.
//   3. Mon activité : un seul graphique (cette semaine / depuis le début).
// Affichage immédiat au retour sur la page (dernières données gardées), mise à jour en arrière-plan.
// Données : GET /api/stats/progression/ (backend apps/users/progression.py).
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { useProgression } from './useProgression';
import { Overview } from './Overview';
import { Programme } from './Programme';
import { Activity } from './Activity';

export function ProgressionPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { data, failed } = useProgression(isAuthenticated && user ? String(user.id) : null);
  // « ?chapitre=12 » (Skill IQ, accueil…) : ce chapitre est choisi d'office.
  const [params] = useSearchParams();
  const initial = Number(params.get('chapitre')) || null;

  if (!authLoading && !isAuthenticated) return <Navigate to="/" replace />;
  const fresh = data && data.summary.questions === 0 && data.time.total_seconds === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <SEO title="Ma progression | Fidni" description="Ce que tu maîtrises et ce qui reste à travailler." noindex />
      <header className="mb-5">
        <h1 className="fd-display text-[28px] leading-tight text-ink md:text-[32px]">Ma progression</h1>
        <p className="mt-1 text-[14px] text-ink-faint">
          {data?.level ? `Ce que tu maîtrises sur le programme de ${data.level.name}.` : 'Ce que tu maîtrises, et ce qui reste à travailler.'}
        </p>
      </header>

      {failed && (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-faint">
          Ta progression n’a pas pu être chargée. Recharge la page dans un instant.
        </p>
      )}
      {!data && !failed && <Skeleton />}

      {data && (
        <div className="flex flex-col gap-6">
          {fresh && (
            <div className="rounded-2xl border border-brand-line bg-brand-soft px-5 py-4 text-[13.5px] leading-relaxed text-ink-soft">
              <b className="text-ink">Ta progression se construit au fil de ton travail.</b> Après chaque question, dis si tu l’as
              réussie, ou passe un quiz Skill IQ : cette page te montrera ce que tu maîtrises.{' '}
              <Link to="/exercises" className="font-semibold text-brand-hover hover:underline">Commencer un exercice →</Link>
            </div>
          )}
          <Overview data={data} />
          <Programme key={initial ?? 'all'} chapters={data.chapters} levelName={data.level?.name ?? null} initial={initial} />
          <Activity data={data} />
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Chargement">
      <div className="h-[118px] animate-pulse rounded-2xl border border-line bg-white" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="h-[320px] animate-pulse rounded-2xl border border-line bg-white" />
        <div className="hidden h-[320px] animate-pulse rounded-2xl border border-line bg-white lg:block" />
      </div>
    </div>
  );
}

export default ProgressionPage;
