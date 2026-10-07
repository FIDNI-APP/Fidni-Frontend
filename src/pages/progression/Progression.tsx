// « Ma progression » (07/10/2026, remplace la page Statistiques) : depuis ses débuts, ce que l'élève
// maîtrise sur le programme de son niveau, ses points forts et ce qui reste à renforcer (auto-évaluations
// et quiz Skill IQ), son évolution et son temps d'étude. Peu de chiffres à la fois : le détail d'un
// chapitre s'ouvre au clic. Données : GET /api/stats/progression/ (backend apps/users/progression.py).
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import type { ProgressionData } from './types';
import { Summary } from './Summary';
import { ProgramMap } from './ProgramMap';
import { Strengths } from './Strengths';
import { Evolution } from './Evolution';
import { StudyTime } from './StudyTime';
import { ChapterDrawer } from './ChapterDrawer';
import { shortDate } from './format';

export function ProgressionPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<ProgressionData | null>(null);
  const [failed, setFailed] = useState(false);
  // Chapitre ouvert : dans l'adresse (« ?chapitre=12 »), pour pouvoir y revenir ou le partager.
  const [params, setParams] = useSearchParams();
  const open = Number(params.get('chapitre')) || null;
  const openChapter = useCallback((id: number | null) => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (id) next.set('chapitre', String(id)); else next.delete('chapitre');
      return next;
    }, { replace: true });
  }, [setParams]);

  const closeDrawer = useCallback(() => openChapter(null), [openChapter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/stats/progression/').then((r) => setData(r.data)).catch(() => setFailed(true));
  }, [isAuthenticated]);

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!authLoading && !isAuthenticated) return <Navigate to="/" replace />;
  const chapter = data && open ? data.chapters.find((c) => c.id === open) : undefined;
  const fresh = data && data.summary.questions === 0 && data.time.total_seconds === 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <SEO title="Ma progression | Fidni" description="Ce que tu maîtrises, ce qui reste à travailler et ton temps d’étude." noindex />
      <header className="mb-5">
        <h1 className="fd-display text-[28px] leading-tight text-ink md:text-[32px]">Ma progression</h1>
        <p className="mt-1 text-[14px] text-ink-faint">
          {data?.since
            ? `Tout ce que tu as fait depuis le ${shortDate(data.since)}${data.level ? `, sur le programme de ${data.level.name}` : ''}.`
            : 'Ce que tu maîtrises, ce qui reste à travailler, et le temps que tu y mets.'}
        </p>
      </header>

      {failed && (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-faint">
          Ta progression n’a pas pu être chargée. Recharge la page dans un instant.
        </p>
      )}
      {!data && !failed && <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-ink-faint" /></div>}

      {data && (
        <div className="flex flex-col gap-6">
          {fresh && (
            <div className="rounded-2xl border border-brand-line bg-brand-soft px-5 py-4 text-[13.5px] leading-relaxed text-ink-soft">
              <b className="text-ink">Ta progression se construit au fil de ton travail.</b> Après chaque question, dis si tu l’as
              réussie (Réussi / À revoir), et passe les quiz Skill IQ : cette page te montrera ce que tu maîtrises.{' '}
              <Link to="/exercises" className="font-semibold text-brand-hover hover:underline">Commencer un exercice →</Link>
            </div>
          )}
          <Summary data={data} onJump={jump} />
          <ProgramMap chapters={data.chapters} level={data.level} onOpen={openChapter} />
          <Strengths strengths={data.strengths} weaknesses={data.weaknesses} questions={data.summary.questions} onOpen={openChapter} />
          <Evolution data={data} />
          <StudyTime time={data.time} since={data.since} onOpen={openChapter} />
        </div>
      )}

      {chapter && <ChapterDrawer chapter={chapter} onClose={closeDrawer} />}
    </div>
  );
}

export default ProgressionPage;
